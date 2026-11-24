import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {createGitHubCommitBuilder,type CommitBuilderConfig} from "../src/coordination/githubCommitBuilder.js";
import {codingSubject,type CodingResult} from "../src/coordination/modelCoder.js";
import {emptyState,transition,type ClaimedWorkContext} from "../src/coordination/agentClaims.js";
const head="a".repeat(40),tree="b".repeat(40),nextTree="c".repeat(40),next="d".repeat(40);
const path="src/utils/dates.ts",original="export const x=1;\n",content="export const x=2;\n";
const admission={continuity:"SADIAAF-CONTINUITY-20261124-01",workId:"builder-test",issue:9,lot:11,priority:0,mainSha:head,head,
 branch:"work/sadiaaf-issue-9-builder",pr:null,dependsOnPr:[],scopes:["file:"+path],nextAction:"Fix calendar",acceptance:"SADIAAF-DATES-CALENDAR-V1"};
const claim=transition(emptyState(),{kind:"claim",workId:admission.workId,actor:"agent-a",session:"session-a",
 lot:11,branch:admission.branch,base:head,scopes:admission.scopes,trace:{head,nextAction:"Test",evidence:["issue:9"]},leaseMs:10000},1000).claims[0]!;
const changes=[{path,originalSha256:createHash("sha256").update(original).digest("hex"),content}];
const result:Extract<CodingResult,{outcome:"validated"}>={outcome:"validated",workId:admission.workId,branch:admission.branch,head,changes,
 red:{status:"fail",subject:codingSubject(head,[]),suite:"e".repeat(64),evidence:"ci:1",diagnostics:["invalid-date"]},
 green:{status:"pass",subject:codingSubject(head,changes),suite:"e".repeat(64),evidence:"ci:2",diagnostics:[]}};
function fixture(){
 let allowed=true,final=true,wrongOriginal=false,wrongBlob=false,revoked=false,changed=false;
 const calls:{path:string;method:string;body:unknown}[]=[];
 const fetcher:typeof fetch=async(input,init)=>{
  const url=String(input),method=init?.method??"GET",body=typeof init?.body==="string"?JSON.parse(init.body):null;
  const p=url.split("africafunds-market-data-pipeline")[1]!;calls.push({path:p,method,body});
  assert.equal(init?.redirect,"error");
  if(p==="")return Response.json({id:1315731572});
  if(p==="/git/commits/"+head)return Response.json({sha:head,tree:{sha:tree},parents:[]});
  if(p==="/git/blobs"){
   const bytes=Buffer.from(body.content,"base64");
   return Response.json({sha:wrongBlob?"f".repeat(40):createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")});
  }
  if(p==="/git/trees"){assert.equal(body.base_tree,tree);assert.equal(body.tree[0].path,path);return Response.json({sha:nextTree});}
  if(p==="/git/commits"||p==="/git/commits/"+next)return Response.json({sha:next,tree:{sha:nextTree},parents:[{sha:head}]});
  throw Error("unexpected endpoint");
 };
 const config:CommitBuilderConfig={token:"fixture-token",fetcher,async readAdmission(){return revoked?null:admission;},
  async readSource(h){return h===head?(wrongOriginal?"different":original):(changed?"different":content);},
  async verifyEvidence(){return allowed;},async verifyPrepared(){return final;}};
 const ctx:ClaimedWorkContext={claim,async assertCurrent(){return claim;},async heartbeat(){},async checkpoint(){}};
 return {build:createGitHubCommitBuilder(config),ctx,calls,deny:()=>{allowed=false;},denyFinal:()=>{final=false;},
  wrongOriginal:()=>{wrongOriginal=true;},wrongBlob:()=>{wrongBlob=true;},revoke:()=>{revoked=true;},change:()=>{changed=true;}};
}
test("validated candidate creates only immutable objects then verifies exact final content",async()=>{
 const f=fixture();assert.deepEqual(await f.build(f.ctx,result),{branch:admission.branch,expectedHead:head,candidateHead:next,paths:[path]});
 assert.deepEqual(f.calls.filter(x=>x.method==="POST").map(x=>x.path),["/git/blobs","/git/trees","/git/commits"]);
 assert.ok(f.calls.every(x=>!x.path.includes("/refs")&&!x.path.includes("/pulls")));
});
test("false evidence, revoked admission and invalid suite fail before Git writes",async()=>{
 const f=fixture();f.deny();await assert.rejects(f.build(f.ctx,result),/EVIDENCE_DENIED/);assert.equal(f.calls.length,0);
 const g=fixture();g.revoke();await assert.rejects(g.build(g.ctx,result));assert.equal(g.calls.length,0);
 const h=fixture();await assert.rejects(h.build(h.ctx,{...result,green:{...result.green,suite:"f".repeat(64)}}),/PROOF_MISMATCH/);assert.equal(h.calls.length,0);
});
test("wrong original or Git blob hash prevents candidate commit creation",async()=>{
 const f=fixture();f.wrongOriginal();await assert.rejects(f.build(f.ctx,result),/ORIGINAL_MISMATCH/);
 assert.ok(f.calls.every(x=>x.method==="GET"));
 const g=fixture();g.wrongBlob();await assert.rejects(g.build(g.ctx,result),/BLOB_MISMATCH/);
 assert.equal(g.calls.filter(x=>x.method==="POST").length,1);
});
test("candidate content drift or final diff denial never returns a publishable result",async()=>{
 const f=fixture();f.change();await assert.rejects(f.build(f.ctx,result),/CANDIDATE_CONTENT_MISMATCH/);
 const g=fixture();g.denyFinal();await assert.rejects(g.build(g.ctx,result),/FINAL_DIFF_DENIED/);
 assert.ok(g.calls.every(x=>!x.path.includes("/refs")));
});
