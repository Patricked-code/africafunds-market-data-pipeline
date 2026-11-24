import assert from "node:assert/strict";
import test from "node:test";
import {createGitHubPublicationPort,type GitHubPublicationConfig} from "../src/coordination/githubPublication.js";
const base="a".repeat(40),next="b".repeat(40),workBranch="work/sadiaaf-issue-9-publication";
const candidate={branch:workBranch,expectedHead:base,candidateHead:next,paths:["src/utils/dates.ts"]};
function fixture(){
  let head=base, parent=base, paths=[{filename:"src/utils/dates.ts",status:"modified"}] as {filename:string;status:string;previous_filename?:string}[];
  let allowed=true,isolated=true,paginated=false,ambiguous=false;
  const calls:{url:string;method:string;body?:string}[]=[];
  const fetcher:typeof fetch=async(input,init)=>{
    const url=String(input),method=init?.method??"GET";
    calls.push({url,method,...(typeof init?.body==="string"?{body:init.body}:{})});
    assert.equal(init?.redirect,"error");
    assert.ok(url.startsWith("https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline"));
    const response=(x:unknown,headers?:HeadersInit)=>new Response(JSON.stringify(x),{status:200,...(headers===undefined?{}:{headers})});
    if(url.includes("/commits/"))return response({sha:next,parents:[{sha:parent}],files:paths},
      paginated?{link:'<https://example.invalid>; rel="next"'}:undefined);
    if(url.includes("/git/ref")){
      if(method==="PATCH"){
        if(ambiguous)throw Error("connection lost");
        head=next;
      }
      return response({ref:"refs/heads/"+workBranch,object:{sha:head,type:"commit"}});
    }
    return response({id:1315731572});
  };
  const config:GitHubPublicationConfig={token:"test-token",fetcher,async verifyWriterIsolation(){return isolated;},
    async verifyCandidatePolicy(){return allowed;}};
  return {port:createGitHubPublicationPort(config),calls,patches:()=>calls.filter(c=>c.method==="PATCH"),
    setParent:(s:string)=>{parent=s;},setHead:(s:string)=>{head=s;},setAllowed:(v:boolean)=>{allowed=v;},
    setIsolated:(v:boolean)=>{isolated=v;},setPaths:(p:typeof paths)=>{paths=p;},
    setPaginated:()=>{paginated=true;},setAmbiguous:()=>{ambiguous=true;}};
}
test("verified single-parent exact-scope publication uses only non-force work ref",async()=>{
  const f=fixture();assert.equal(await f.port.verifyPrepared(candidate),true);
  await f.port.publishNonForce(candidate);
  assert.equal(f.patches().length,1);assert.deepEqual(JSON.parse(f.patches()[0]!.body!),{sha:next,force:false});
  assert.ok(f.patches()[0]!.url.endsWith("/git/refs/heads/"+workBranch));
  assert.equal(await f.port.readHead(workBranch),next);
});
test("main, coordination, invalid refs and stale parent cannot publish",async()=>{
  const f=fixture();
  for(const branch of ["main","coordination/sadiaaf-agent-state","work/../main","work/.hidden","work/x.lock"])
    await assert.rejects(f.port.publishNonForce({...candidate,branch}));
  f.setParent("c".repeat(40));
  await assert.rejects(f.port.publishNonForce(candidate),/PARENT_MISMATCH/);
  assert.equal(f.patches().length,0);
});
test("exhaustive changed paths includes rename source and rejects hidden changes",async()=>{
  const f=fixture();
  f.setPaths([{filename:"src/utils/dates.ts",status:"renamed",previous_filename:"src/utils/old.ts"}]);
  await assert.rejects(f.port.verifyPrepared(candidate),/DIFF_MISMATCH/);
  assert.equal(await f.port.verifyPrepared({...candidate,paths:[...candidate.paths,"src/utils/old.ts"]}),true);
  f.setPaginated();await assert.rejects(f.port.verifyPrepared(candidate),/PAGINATED/);
});
test("denied evidence, writer isolation or stale live ref prevent publication",async()=>{
  const f=fixture();f.setAllowed(false);
  await assert.rejects(f.port.publishNonForce(candidate),/POLICY_DENIED/);
  f.setAllowed(true);f.setIsolated(false);
  await assert.rejects(f.port.publishNonForce(candidate),/ISOLATION_REQUIRED/);
  f.setIsolated(true);f.setHead("c".repeat(40));
  await assert.rejects(f.port.publishNonForce(candidate),/STALE_HEAD/);
  assert.equal(f.patches().length,0);
});
test("ambiguous PATCH is surfaced once, never retried",async()=>{
  const f=fixture();f.setAmbiguous();
  await assert.rejects(f.port.publishNonForce(candidate),/TRANSPORT_UNCONFIRMED/);
  assert.equal(f.patches().length,1);
});
