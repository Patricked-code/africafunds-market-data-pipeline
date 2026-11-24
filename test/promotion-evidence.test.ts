import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {reconstructPromotionCandidate,type PromotionReceipt,type PromotionEvidencePorts} from "../src/coordination/promotionEvidence.js";
import {codingSubject} from "../src/coordination/modelCoder.js";
import {CONTINUITY_ID} from "../src/coordination/agentClaims.js";
import type {CanonicalWorkAdmission} from "../src/coordination/githubSelector.js";
const base="a".repeat(40),head="b".repeat(40),suite="c".repeat(64),path="src/utils/dates.ts";
const change={path,originalSha256:createHash("sha256").update("original").digest("hex"),content:"candidate"};
const receipt:PromotionReceipt={workId:"w",issue:9,lot:11,branch:"work/sadiaaf-issue-9-w",mainSha:base,base,head,prNumber:42,
 acceptance:"SADIAAF-DATES-CALENDAR-V1",scopes:["file:"+path],paths:[path],
 red:{status:"fail",subject:codingSubject(base,[]),suite,evidence:"issue:123",diagnostics:["invalid-feb30"]},
 green:{status:"pass",subject:codingSubject(base,[change]),suite,evidence:"issue:124",diagnostics:[]}};
const admission:CanonicalWorkAdmission={continuity:CONTINUITY_ID,workId:"w",issue:9,lot:11,priority:0,
 mainSha:base,branch:receipt.branch,head,pr:42,dependsOnPr:[],scopes:receipt.scopes,nextAction:"Promote exact candidate",acceptance:receipt.acceptance};
function ports():PromotionEvidencePorts{return {
 async readSource(h,p){assert.equal(p,path);return h===base?"original":"candidate";},
 async readAdmission(){return admission;},async verifyCurrent(){return true;},
 async verifyEvidence(r){assert.deepEqual(r.changes,[change]);return true;},
 async verifyPrepared(c,r){assert.equal(c.expectedHead,base);assert.equal(c.candidateHead,head);assert.equal(r.head,base);return true;}
};}
test("reconstructs exact original RED and GREEN subject from immutable blobs without model",async()=>{
 const r=await reconstructPromotionCandidate(receipt,ports());assert.deepEqual(r.result.changes,[change]);
 assert.equal(r.candidate.candidateHead,head);
});
test("refuses obsolete new-work admission and changed PR identity",async()=>{
 await assert.rejects(reconstructPromotionCandidate(receipt,{...ports(),async readAdmission(){return {...admission,pr:null,head:base};}}),/RENEWED/);
 await assert.rejects(reconstructPromotionCandidate({...receipt,prNumber:43},ports()),/RENEWED/);
});
test("refuses changed candidate source or failed independent proof",async()=>{
 await assert.rejects(reconstructPromotionCandidate(receipt,{...ports(),async readSource(h){return h===base?"original":"tampered";}}),/BINDING/);
 await assert.rejects(reconstructPromotionCandidate(receipt,{...ports(),async verifyEvidence(){return false;}}),/DENIED/);
 await assert.rejects(reconstructPromotionCandidate(receipt,{...ports(),async verifyPrepared(){return false;}}),/DENIED/);
});
test("rechecks admission after evidence and policy verification",async()=>{
 let reads=0;
 await assert.rejects(reconstructPromotionCandidate(receipt,{...ports(),async readAdmission(){return ++reads===1?admission:{...admission,priority:1};}}),/CHANGED/);
});
