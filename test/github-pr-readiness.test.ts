import assert from "node:assert/strict";
import test from "node:test";
import {emptyState,transition,type ClaimStore,type State} from "../src/coordination/agentClaims.js";
import {createGitHubPrReadiness} from "../src/coordination/githubPrReadiness.js";
const main="a".repeat(40),head="b".repeat(40),branch="work/sadiaaf-issue-9-test",name="Patricked-code/africafunds-market-data-pipeline";
const repo={id:1315731572,full_name:name},scope="file:src/utils/dates.ts",n=43,ci=101,docker=102;
const admission={continuity:"SADIAAF-CONTINUITY-20261124-01",workId:"work-a",issue:9,lot:11,priority:0,mainSha:main,branch,head:main,pr:null,dependsOnPr:[],scopes:[scope],nextAction:"fix",acceptance:"dates"};
function fixture(){
 const identity={workId:"work-a",actor:"app",session:"session-a",generation:1};
 let state:State=transition(emptyState(),{kind:"claim",workId:"work-a",actor:"app",session:"session-a",lot:11,branch,base:main,scopes:[scope],
 trace:{head:main,nextAction:"fix",evidence:["issue:9"]},leaseMs:10000},1000),version=1;
 state=transition(state,{kind:"checkpoint",...identity,trace:{head,nextAction:"ready",evidence:["commit:"+head,"pr:43"]}},1001);version++;
 let draft=true,labeled=false,allowed=true,uncertain=false,quiet=false,sensitive=false,badRun=false,writes=0;
 const store:ClaimStore={async read(){return {state,version:String(version)};},async compareAndSwap(v,s){assert.equal(v,String(version));state=s;return String(++version);}};
 const fetcher:typeof fetch=async(input,init)=>{
  const url=String(input),path=url.split(name)[1]??"/graphql",method=init?.method??"GET";
  if(method==="POST"){
   writes++;assert.ok(state.claims[0]?.pendingLifecycle);
   if(path==="/issues/43/labels"){assert.equal(state.claims[0]?.pendingLifecycle?.kind,"label");labeled=true;if(uncertain)throw Error("lost");return Response.json([{name:"automerge-eligible"}]);}
   if(path==="/graphql"){assert.equal(state.claims[0]?.pendingLifecycle?.kind,"ready");assert.equal(labeled,true);draft=false;
    if(uncertain)throw Error("lost");return Response.json({data:{markPullRequestReadyForReview:{pullRequest:{number:n,isDraft:false,headRefOid:head}}}});}
   throw Error("unexpected mutation");
  }
  if(path==="")return Response.json({...repo,allow_auto_merge:true});
  if(path==="/branches/main")return Response.json({name:"main",protected:true,commit:{sha:main}});
  if(path==="/pulls/43")return Response.json({number:n,node_id:"PR_43",state:"open",merged:false,draft,auto_merge:null,changed_files:1,
   body:"SADIAAF-CONTINUITY-20261124-01\nWork: work-a\nIssue: #9\nHead: "+head,labels:labeled?[{name:"automerge-eligible"}]:[],
   head:{sha:head,ref:branch,repo},base:{sha:main,ref:"main",repo}});
  if(path==="/pulls/43/files?per_page=100")return Response.json([{filename:sensitive?"src/coordination/agentClaims.ts":"src/utils/dates.ts",status:"modified"}]);
  if(path.startsWith("/actions/runs/")){
   const id=Number(path.split("/")[3]),isCi=id===ci;
   if(path.includes("/jobs?"))return Response.json({total_count:1,jobs:[{name:isCi?"validate":"Build, boot, migrate and verify persistent PostgreSQL",status:"completed",conclusion:"success",head_sha:head}]});
   return Response.json({id,workflow_id:isCi?409761758:410494947,event:"pull_request",head_sha:badRun?main:head,status:"completed",conclusion:"success",run_attempt:1,head_repository:repo,pull_requests:[{number:n,head:{sha:head},base:{ref:"main"}}]});
  }
  throw Error("unexpected read");
 };
 const port=createGitHubPrReadiness({store,now:()=>1000+version,prToken:"pr-token",fetcher,async authenticate(){return true;},
  async readAdmission(){return admission;},async verifyWriterIsolation(){return true;},async verifyEligibility(){return allowed;},async verifyQuiescence(){return quiet;}});
 return {port,identity,store,writes:()=>writes,deny:()=>{allowed=false;},sensitive:()=>{sensitive=true;},badRun:()=>{badRun=true;},uncertain:()=>{uncertain=true;},quiet:()=>{quiet=true;}};
}
test("separate label and ready intents, exact checks and no direct merge",async()=>{
 const f=fixture();assert.equal((await f.port.label(f.identity,n,ci,docker)).phase,"labeled");
 assert.equal((await f.port.ready(f.identity,n,ci,docker)).phase,"ready");assert.equal(f.writes(),2);
 assert.equal((await f.store.read()).state.claims[0]?.pendingLifecycle,undefined);
});
test("ready requires prior label and sensitive paths or wrong SHA refuse mutation",async()=>{
 const f=fixture();await assert.rejects(f.port.ready(f.identity,n,ci,docker),/PHASE_MISMATCH/);
 f.sensitive();await assert.rejects(f.port.label(f.identity,n,ci,docker),/FILE_SCOPE/);assert.equal(f.writes(),0);
 const g=fixture();g.badRun();await assert.rejects(g.port.label(g.identity,n,ci,docker),/RUN_MISMATCH/);assert.equal(g.writes(),0);
});
test("independent eligibility denial fails closed",async()=>{
 const f=fixture();f.deny();await assert.rejects(f.port.label(f.identity,n,ci,docker),/ELIGIBILITY_DENIED/);assert.equal(f.writes(),0);
});
test("uncertain label is reconciled without repeating mutation",async()=>{
 const f=fixture();f.uncertain();await assert.rejects(f.port.label(f.identity,n,ci,docker),/TRANSPORT_UNCONFIRMED/);
 await assert.rejects(f.port.reconcile(f.identity,ci,docker),/STILL_UNCERTAIN/);f.quiet();
 assert.equal((await f.port.reconcile(f.identity,ci,docker)).phase,"labeled");assert.equal(f.writes(),1);
});
