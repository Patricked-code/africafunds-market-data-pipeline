import assert from "node:assert/strict";
import test from "node:test";
import {createGitHubRequest} from "../src/coordination/githubTransport.js";
const sha="a".repeat(40),ref="/git/refs/heads/coordination/sadiaaf-agent-state";
const rule={id:7,target:"branch",enforcement:"active",source:"Patricked-code/africafunds-market-data-pipeline",
  conditions:{ref_name:{include:["refs/heads/coordination/sadiaaf-agent-state"],exclude:[]}},bypass_actors:[],current_user_can_bypass:"never",rules:[{type:"deletion"},{type:"non_fast_forward"}]};
test("runtime transport restricts origin, path and default writes",async()=>{
  let seen=0;
  const request=createGitHubRequest({token:"fixture_token",fetcher:async(input,init)=>{
    seen++;assert.equal(String(input),"https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline/git/ref/heads/coordination/sadiaaf-agent-state");
    assert.equal(init?.method,"GET");assert.equal(init?.redirect,"error");assert.ok(init?.signal);
    assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer fixture_token");
    return Response.json({object:{sha}});
  }});
  assert.deepEqual(await request("GET","/git/ref/heads/coordination/sadiaaf-agent-state"),{object:{sha}});
  for(const path of ["/git/refs/heads/main","/../secrets","https://example.invalid","/pulls/1?extra=1"])await assert.rejects(request("GET",path),/PATH_NOT_ALLOWED/);
  await assert.rejects(request("PATCH",ref,{sha,force:false}),/WRITES_DISABLED/);
  assert.equal(seen,1);
});
test("coordination write requires live exact protection and refuses force and main",async()=>{
  const paths:string[]=[];
  const request=createGitHubRequest({token:"fixture_token",coordinationRulesetId:7,fetcher:async(input,init)=>{
    paths.push(String(input));
    if(String(input).endsWith("/rulesets/7"))return Response.json(rule);
    assert.equal(init?.method,"PATCH");assert.deepEqual(JSON.parse(String(init?.body)),{sha,force:false});
    return Response.json({object:{sha}});
  }});
  await assert.rejects(request("PATCH",ref,{sha,force:true}));
  await assert.rejects(request("PATCH","/git/refs/heads/main",{sha,force:false}),/PATH_NOT_ALLOWED/);
  assert.equal(paths.length,0);
  assert.deepEqual(await request("PATCH",ref,{sha,force:false}),{object:{sha}});
  assert.equal(paths.length,2);
  let count=0;
  const wrong=createGitHubRequest({token:"fixture_token",coordinationRulesetId:7,fetcher:async()=>{count++;return Response.json({...rule,conditions:{ref_name:{include:["refs/heads/main"],exclude:[]}}});}});
  await assert.rejects(wrong("PATCH",ref,{sha,force:false}),/COORDINATION_PROTECTION_REQUIRED/);
  assert.equal(count,1);
});
test("transport errors never echo the credential or raw response",async()=>{
  const request=createGitHubRequest({token:"fixture_token",fetcher:async()=>new Response("fixture_token",{status:403})});
  await assert.rejects(request("GET","/rulesets/7"),/^Error: GITHUB_HTTP_403$/);
  const failed=createGitHubRequest({token:"fixture_token",fetcher:async()=>{throw Error("fixture_token");}});
  await assert.rejects(failed("GET","/rulesets/7"),/^Error: GITHUB_TRANSPORT_UNCONFIRMED$/);
  assert.throws(()=>createGitHubRequest({token:"invalid\nheader"}),/CREDENTIAL_INVALID/);
});
