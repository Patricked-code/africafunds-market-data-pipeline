import assert from "node:assert/strict";
import test from "node:test";
import {generateKeyPairSync,verify} from "node:crypto";
import {createGitHubAppIdentity} from "../src/coordination/githubIdentity.js";
const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const time=Date.parse("2026-11-24T06:20:00Z");
const repo={id:1315731572,full_name:"Patricked-code/africafunds-market-data-pipeline"};
const fakeToken="fixture-installation-token-not-real";
function fixture(){
  let badApp=false,badInstall=false,overprivileged=false,extraRepo=false,expired=false,failed=false;
  const calls:{url:string;method:string;body:unknown}[]=[];
  const fetcher:typeof fetch=async(input,init)=>{
    const url=String(input),method=init?.method??"GET",header=new Headers(init?.headers).get("authorization")??"";
    const body=typeof init?.body==="string"?JSON.parse(init.body):null;calls.push({url,method,body});
    assert.equal(init?.redirect,"error");
    assert.ok(url.startsWith("https://api.github.com/"));
    if(url.includes("/installation/repositories")){
      assert.equal(header,"Bearer "+fakeToken);
      return Response.json({total_count:extraRepo?2:1,repositories:extraRepo?[repo,repo]:[repo]});
    }
    const parts=header.slice(7).split(".");
    assert.equal(parts.length,3);
    assert.equal(verify("RSA-SHA256",Buffer.from(parts[0]+"."+parts[1]),publicKey,Buffer.from(parts[2]!,"base64url")),true);
    const claims=JSON.parse(Buffer.from(parts[1]!,"base64url").toString());
    assert.equal(claims.iss,"1234");assert.equal(claims.exp-claims.iat,540);
    if(url.endsWith("/app"))return Response.json({id:badApp?99:1234,slug:"sadiaaf-executor"});
    if(url.endsWith("/installation"))return Response.json({id:badInstall?99:5678,app_id:1234,account:{id:270385782,login:"Patricked-code"},suspended_at:null});
    if(url.endsWith("/access_tokens")){
      if(failed)throw Error("do not expose upstream body "+fakeToken);
      return Response.json({token:fakeToken,expires_at:new Date(time+(expired?1000:3600000)).toISOString(),
        permissions:{...body.permissions,metadata:"read",...(overprivileged?{administration:"write"}:{})},repositories:[repo]});
    }
    throw Error("unexpected request");
  };
  const broker=createGitHubAppIdentity({appId:1234,appSlug:"sadiaaf-executor",installationId:5678,privateKey,now:()=>time,fetcher});
  return {broker,calls,badApp:()=>{badApp=true;},badInstall:()=>{badInstall=true;},overprivileged:()=>{overprivileged=true;},
    extraRepo:()=>{extraRepo=true;},expired:()=>{expired=true;},failed:()=>{failed=true;}};
}
test("GitHub App JWT and installation scope are verified; publish token is repository-bound",async()=>{
  const f=fixture(),c=await f.broker.issue("publish");
  assert.equal(c.actor,"github-app:1234:installation:5678");assert.equal(c.expiresAt,time+3600000);
  assert.equal(c.token,fakeToken);
  assert.deepEqual(f.calls[2]?.body,{repository_ids:[1315731572],permissions:{contents:"write",issues:"read",pull_requests:"read"}});
});
test("read identity requests no write permission",async()=>{
  const f=fixture();await f.broker.issue("read");
  assert.deepEqual(f.calls[2]?.body,{repository_ids:[1315731572],permissions:{contents:"read",issues:"read",pull_requests:"read"}});
});
test("wrong App or installation refuses token issuance",async()=>{
  const a=fixture();a.badApp();await assert.rejects(a.broker.issue("publish"),/APP_IDENTITY_MISMATCH/);assert.equal(a.calls.length,1);
  const b=fixture();b.badInstall();await assert.rejects(b.broker.issue("publish"),/APP_INSTALLATION_MISMATCH/);assert.equal(b.calls.length,2);
});
test("overprivileged, expired or multi-repository credentials fail closed",async()=>{
  const a=fixture();a.overprivileged();await assert.rejects(a.broker.issue("publish"),/TOKEN_SCOPE_INVALID/);
  const b=fixture();b.expired();await assert.rejects(b.broker.issue("publish"),/EXPIRY_INVALID/);
  const c=fixture();c.extraRepo();await assert.rejects(c.broker.issue("publish"),/REPOSITORY_SCOPE_INVALID/);
});
test("transport ambiguity does not retry or leak upstream token",async()=>{
  const f=fixture();f.failed();await assert.rejects(f.broker.issue("publish"),(error:unknown)=>error instanceof Error&&error.message==="APP_IDENTITY_TRANSPORT_UNCONFIRMED");
  assert.equal(f.calls.length,3);
});
