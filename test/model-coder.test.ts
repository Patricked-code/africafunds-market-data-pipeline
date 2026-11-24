import assert from "node:assert/strict";
import test from "node:test";
import {applyModelEdits,createLocalModelCoder,prepareCodingCandidate,codingSubject,type CodingPorts} from "../src/coordination/modelCoder.js";
import {CONTINUITY_ID,type ClaimedWorkContext} from "../src/coordination/agentClaims.js";
import type {CanonicalWorkAdmission} from "../src/coordination/githubSelector.js";
const head="a".repeat(40),path="src/utils/a.ts",source="export const x = 1;\n",suite="c".repeat(64);
const a:CanonicalWorkAdmission={continuity:CONTINUITY_ID,workId:"task-a",issue:9,lot:11,priority:1,mainSha:head,branch:"work/sadiaaf-issue-9-a",head,pr:null,dependsOnPr:[],scopes:["file:"+path],nextAction:"Fix",acceptance:"Fixed test succeeds"};
const claim={workId:a.workId,actor:"a",session:"s",generation:1,lot:a.lot,branch:a.branch,base:head,scopes:a.scopes,leaseUntil:9000,updatedAt:1,trace:{head,nextAction:"Fix",evidence:["issue:9"]}};
const ctx:ClaimedWorkContext={claim,async assertCurrent(){return claim;},async heartbeat(){},async checkpoint(){throw Error("unexpected mutation");}};
const edit={edits:[{path,before:"x = 1",after:"x = 2"}]};
function ports():CodingPorts{return {async readAdmission(){return a;},async readSource(h,p){assert.equal(h,head);assert.equal(p,path);return source;},async validate(h,changes){return {status:changes.length?"pass":"fail",subject:codingSubject(h,changes),suite,evidence:changes.length?"ci:2":"ci:1",diagnostics:changes.length?[]:["wrong value"]};},async model(){return edit;},maxAttempts:3};}
test("exact scoped edits preserve unrelated code and reject ambiguous or foreign edits",()=>{
 assert.equal(applyModelEdits(edit,[{path,content:source}])[0]?.content,"export const x = 2;\n");
 assert.throws(()=>applyModelEdits(edit,[{path,content:"x = 1; x = 1"}]),/ANCHOR/);
 assert.throws(()=>applyModelEdits({edits:[{...edit.edits[0],path:"src/other.ts"}]},[{path,content:source}]),/SCOPE/);
 assert.throws(()=>applyModelEdits({edits:[{...edit.edits[0],path:"src/security/a.ts"}]},[{path:"src/security/a.ts",content:source}]));
});
test("requires RED and matching independent GREEN, returns candidate only",async()=>{
 const r=await prepareCodingCandidate(ctx,ports());assert.equal(r.outcome,"validated");
 if(r.outcome==="validated"){assert.equal(r.changes[0]?.content,"export const x = 2;\n");assert.equal(r.green.evidence,"ci:2");}
});
test("rejects wrong validation subject and changed test suite",async()=>{
 const normal=ports();
 await assert.rejects(prepareCodingCandidate(ctx,{...normal,async validate(h,c,acceptance){const p=await normal.validate(h,c,acceptance) as Record<string,unknown>;return {...p,suite:c.length?"d".repeat(64):suite};}}),/EVIDENCE/);
 await assert.rejects(prepareCodingCandidate(ctx,{...normal,async validate(){return {status:"fail",subject:"d".repeat(64),suite,evidence:"ci:1",diagnostics:["wrong"]};}}),/REAL_RED/);
});
test("bounded correction avoids repeating a rejected candidate",async()=>{
 let validations=0,models=0;
 const r=await prepareCodingCandidate(ctx,{...ports(),async validate(h,c){validations++;return {status:"fail",subject:codingSubject(h,c),suite,evidence:"ci:1",diagnostics:["wrong"]};},async model(){models++;return edit;}});
 assert.equal(r.outcome,"blocked");assert.equal(models,3);assert.equal(validations,2);
});
test("local transport is loopback only, no credentials, strict JSON",async()=>{
 const fake:typeof fetch=async(url,options)=>{assert.equal(url,"http://127.0.0.1:18081/v1/chat/completions");assert.equal(options?.redirect,"error");assert.equal(new Headers(options?.headers).has("Authorization"),false);return new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content:JSON.stringify(edit)}}]}));};
 assert.deepEqual(await createLocalModelCoder(fake)({objective:"Fix",acceptance:"Tests",sources:[{path,content:source}],diagnostics:[]},1),edit);
});
