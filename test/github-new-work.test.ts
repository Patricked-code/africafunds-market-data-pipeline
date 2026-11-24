import assert from "node:assert/strict";
import test from "node:test";
import {emptyState,transition,type State,type ClaimStore} from "../src/coordination/agentClaims.js";
import {createGitHubNewWork} from "../src/coordination/githubNewWork.js";
const main="a".repeat(40),candidate="b".repeat(40),branch="work/sadiaaf-issue-9-test",repo={id:1315731572};
const admission={continuity:"SADIAAF-CONTINUITY-20261124-01",workId:"work-a",issue:9,lot:11,priority:0,mainSha:main,branch,head:main,
 pr:null,dependsOnPr:[],scopes:["file:src/utils/dates.ts"],nextAction:"fix",acceptance:"dates"};
function fixture(published=false){
 let state:State=transition(emptyState(),{kind:"claim",workId:"work-a",actor:"agent-a",session:"session-a",lot:11,branch,base:main,
 scopes:admission.scopes,trace:{head:main,nextAction:"fix",evidence:["issue:9"]},leaseMs:10000},1000),version=1;
 const identity={workId:"work-a",actor:"agent-a",session:"session-a",generation:1};
 if(published){state=transition(state,{kind:"checkpoint",...identity,trace:{head:candidate,nextAction:"PR",evidence:["commit:"+candidate]}},1001);version++;}
 let remote:string|null=published?candidate:null,created:unknown=null,uncertain=false,isolated=true,quiescent=false,writes=0;
 const store:ClaimStore={async read(){return {state,version:String(version)};},async compareAndSwap(v,s){assert.equal(v,String(version));state=s;return String(++version);}};
 const fetcher:typeof fetch=async(input,init)=>{
  const path=String(input).split("africafunds-market-data-pipeline")[1]!,method=init?.method??"GET",auth=new Headers(init?.headers).get("authorization");
  const body=typeof init?.body==="string"?JSON.parse(init.body):null;
  if(path==="")return Response.json(repo);
  if(path==="/branches/main")return Response.json({name:"main",protected:true,commit:{sha:main}});
  if(path.startsWith("/git/ref/heads/"))return remote===null?new Response(null,{status:404}):Response.json({ref:"refs/heads/"+branch,object:{sha:remote,type:"commit"}});
  if(path.startsWith("/pulls?"))return Response.json(created===null?[]:[created]);
  if(method==="POST"){
   writes++;assert.ok(state.claims[0]?.pendingLifecycle);
   if(path==="/git/refs"){assert.equal(auth,"Bearer branch-token");assert.deepEqual(body,{ref:"refs/heads/"+branch,sha:main});remote=main;
    if(uncertain)throw Error("lost response");return Response.json({ref:body.ref,object:{sha:main,type:"commit"}});}
   if(path==="/pulls"){assert.equal(auth,"Bearer pr-token");assert.equal(body.draft,true);assert.equal(body.base,"main");
    created={number:43,state:"open",draft:true,body:body.body,head:{ref:branch,sha:candidate,repo},base:{ref:"main",repo}};
    if(uncertain)throw Error("lost response");return Response.json(created);}
  }
  throw Error("unexpected endpoint");
 };
 const port=createGitHubNewWork({store,now:()=>1000+version,branchToken:"branch-token",prToken:"pr-token",fetcher,
  async authenticate(){return true;},async readAdmission(){return admission;},async verifyWriterIsolation(){return isolated;},
  async verifyPublishedCandidate(){return published;},async verifyQuiescence(){return quiescent;}});
 return {port,identity,store,writes:()=>writes,uncertain:()=>{uncertain=true;},deny:()=>{isolated=false;},quiescent:()=>{quiescent=true;}};
}
test("new branch uses durable intent and exact admitted main, no ref update",async()=>{
 const f=fixture();assert.deepEqual(await f.port.createBranch(f.identity),{head:main});assert.equal(f.writes(),1);
 assert.equal((await f.store.read()).state.claims[0]?.pendingLifecycle,undefined);
});
test("draft PR uses separate credential and records exact PR evidence",async()=>{
 const f=fixture(true);assert.deepEqual(await f.port.createDraftPr(f.identity),{head:candidate,prNumber:43});
 assert.ok((await f.store.read()).state.claims[0]?.trace.evidence.includes("pr:43"));assert.equal(f.writes(),1);
});
test("uncertain write blocks re-execution until old publisher quiescence and readback",async()=>{
 const f=fixture();f.uncertain();await assert.rejects(f.port.createBranch(f.identity),/TRANSPORT_UNCONFIRMED/);
 assert.equal((await f.store.read()).state.claims[0]?.pendingLifecycle?.kind,"branch");
 await assert.rejects(f.port.createBranch(f.identity),/STALE_OR_EXPIRED/);
 await assert.rejects(f.port.reconcile(f.identity),/STILL_UNCERTAIN/);
 f.quiescent();assert.deepEqual(await f.port.reconcile(f.identity),{head:main});assert.equal(f.writes(),1);
});
test("writer isolation failure does not create objects",async()=>{
 const f=fixture();f.deny();await assert.rejects(f.port.createBranch(f.identity),/WRITER_ISOLATION_REQUIRED/);assert.equal(f.writes(),0);
});
