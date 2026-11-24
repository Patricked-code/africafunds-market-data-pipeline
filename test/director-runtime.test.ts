import assert from "node:assert/strict";
import test from "node:test";
import {createExistingPrExecutor,supportedExistingPrAdmissions,supportedDirectorAdmissions,runExistingPrDirector,runAcceptedExistingPrDirector,eventFromAcceptedWake,type DirectorRuntimeConfig} from "../src/coordination/directorRuntime.js";
import {emptyState,transition,type ClaimedWorkContext} from "../src/coordination/agentClaims.js";
import type {CanonicalWorkAdmission} from "../src/coordination/githubSelector.js";
import type {CodingResult} from "../src/coordination/modelCoder.js";
const head="a".repeat(40),next="b".repeat(40),path="src/utils/dates.ts";
const admission:CanonicalWorkAdmission={continuity:"SADIAAF-CONTINUITY-20261124-01",workId:"runtime-test",issue:9,lot:11,priority:0,
 mainSha:head,head,branch:"work/sadiaaf-issue-9-runtime",pr:42,dependsOnPr:[],scopes:["file:"+path],nextAction:"Fix calendar",acceptance:"SADIAAF-DATES-CALENDAR-V1"};
const claim=transition(emptyState(),{kind:"claim",workId:admission.workId,actor:"agent-a",session:"session-a",lot:11,branch:admission.branch,
 base:head,scopes:admission.scopes,trace:{head,nextAction:"Test",evidence:["issue:9"]},leaseMs:10000},1000).claims[0]!;
const context:ClaimedWorkContext={claim,async assertCurrent(){return claim;},async heartbeat(){},async checkpoint(){}};
const red={status:"fail" as const,subject:"a".repeat(64),suite:"b".repeat(64),evidence:"ci:1",diagnostics:["invalid-date"]};
const result:Extract<CodingResult,{outcome:"validated"}>={outcome:"validated",workId:admission.workId,branch:admission.branch,head,
 changes:[{path,content:"example",originalSha256:"c".repeat(64)}],red,green:{...red,status:"pass",evidence:"ci:2",diagnostics:[]}};
const prepared={branch:admission.branch,expectedHead:head,candidateHead:next,paths:[path]};
test("executor connects validated candidate to builder and gateway with exact resulting proof",async()=>{
 const calls:string[]=[];
 const execute=createExistingPrExecutor({async prepare(){calls.push("prepare");return result;},
  async build(ctx,r){assert.equal(ctx,context);assert.equal(r,result);calls.push("build");return prepared;},
  async publish(ctx,p,r){assert.equal(ctx,context);assert.equal(p,prepared);assert.equal(r,result);calls.push("publish");return {head:next};}});
 const out=await execute(context);assert.deepEqual(calls,["prepare","build","publish"]);
 assert.equal(out.outcome,"completed");assert.deepEqual(out.trace.evidence,["ci:1","ci:2","commit:"+next]);
});
test("blocked model result does not build or publish; uncertain result fails closed",async()=>{
 const execute=createExistingPrExecutor({async prepare(){return {outcome:"blocked",reason:"RED",red,attempts:3};},
  async build(){throw Error("unexpected build");},async publish(){throw Error("unexpected publish");}});
 assert.equal((await execute(context)).outcome,"blocked");
 const uncertain=createExistingPrExecutor({async prepare(){return result;},async build(){return prepared;},async publish(){return {head};}});
 await assert.rejects(uncertain(context),/PUBLICATION_UNCONFIRMED/);
});
test("runtime admits only current supported existing-PR recipe",()=>{
 assert.deepEqual(supportedExistingPrAdmissions([admission,{...admission,pr:null},{...admission,acceptance:"other"},{...admission,scopes:["file:src/other.ts"]}]),[admission]);
});
test("runtime does not issue credentials before delivery and isolation verification",async()=>{
 let issued=0;
 const config:DirectorRuntimeConfig={identity:{actor:"fixture",async issue(){issued++;throw Error("unexpected");}},
  session:"session-a",coordinationRulesetId:1,imageId:"sha256:"+"f".repeat(64),now:()=>1000,leaseMs:10000,maxUnits:1,
  async verifyCoordinationIsolation(){return false;},async verifyWriterIsolation(){return false;},async verifyAdmissionHistory(){return false;},
  evidenceAppId:10,evidenceBotUserId:20,async verifyCandidatePolicy(){return false;},
  async authenticateDelivery(){return true;}};
 const event={kind:"pr-merged" as const,number:42,mergeSha:head};
 await assert.rejects(runExistingPrDirector(event,config),/COORDINATION_ISOLATION_REQUIRED/);
 await assert.rejects(runExistingPrDirector(event,{...config,async authenticateDelivery(){return false;}}),/UNAUTHENTICATED_DELIVERY/);
 assert.equal(issued,0);
});

test("runtime requires three separate scoped credentials and matching evidence App before any GitHub request",async()=>{
 const issued:string[]=[];
 const config:DirectorRuntimeConfig={identity:{actor:"github-app:10:installation:99",async issue(mode){issued.push(mode);return {actor:"github-app:10:installation:99",token:"same-token",expiresAt:1000000};}},session:"session-a",coordinationRulesetId:1,imageId:"sha256:"+"f".repeat(64),now:()=>1000,leaseMs:10000,maxUnits:1,evidenceAppId:10,evidenceBotUserId:20,
 async verifyCoordinationIsolation(){return true;},async verifyWriterIsolation(){return false;},async verifyAdmissionHistory(){return true;},async verifyCandidatePolicy(){return false;},async authenticateDelivery(){return true;},fetcher:async()=>{throw Error("unexpected network");}};
 await assert.rejects(runExistingPrDirector({kind:"pr-merged",number:42,mergeSha:head},config),/DIRECTOR_IDENTITY_MISMATCH/);
 assert.deepEqual(issued,["read","publish","evidence"]);
});

test("deferred wake reconstructs only canonical exact GitHub event identities",()=>{
 assert.deepEqual(eventFromAcceptedWake({kind:"ci-completed",key:"ci:123:2",head,evidence:"ci:123"}),{kind:"workflow-completed",runId:123,attempt:2,head});
 assert.deepEqual(eventFromAcceptedWake({kind:"pr-merged",key:"pr:42:"+head,head,evidence:"pr:42"}),{kind:"pr-merged",number:42,mergeSha:head});
 assert.throws(()=>eventFromAcceptedWake({kind:"ci-completed",key:"ci:123:2",head,evidence:"ci:124"}),/IDENTITY/);
 assert.throws(()=>eventFromAcceptedWake({kind:"pr-merged",key:"pr:42:"+next,head,evidence:"pr:42"}),/IDENTITY/);
 assert.throws(()=>eventFromAcceptedWake({kind:"manual-admission",key:"manual",head,evidence:"issue:9"}),/UNSUPPORTED/);
});
test("deferred worker cannot access credentials without proven coordination isolation",async()=>{
 let issued=0;
 const config:DirectorRuntimeConfig={identity:{actor:"fixture",async issue(){issued++;throw Error("unexpected");}},
 session:"session-a",coordinationRulesetId:1,imageId:"sha256:"+"f".repeat(64),now:()=>1000,leaseMs:10000,maxUnits:1,evidenceAppId:10,evidenceBotUserId:20,
 async verifyCoordinationIsolation(){return false;},async verifyWriterIsolation(){return false;},async verifyAdmissionHistory(){return true;},async verifyCandidatePolicy(){return false;},async authenticateDelivery(){throw Error("deferred entrypoint must not synthesize delivery");}};
 await assert.rejects(runAcceptedExistingPrDirector(config),/COORDINATION_ISOLATION_REQUIRED/);
 assert.equal(issued,0);
});

test("new-work lifecycle validates before branch creation then builds, publishes and opens exact draft",async()=>{
 const calls:string[]=[];
 const execute=createExistingPrExecutor({async prepare(){calls.push("prepare");return result;},
 async build(){calls.push("build");return prepared;},async publish(){calls.push("publish");return {head:next};},
 lifecycle:{async createBranch(){calls.push("branch");return {head};},async createDraftPr(_ctx,p){assert.equal(p,prepared);calls.push("draft");return {head:next,prNumber:43};}}});
 const out=await execute(context);assert.deepEqual(calls,["prepare","branch","build","publish","draft"]);
 assert.deepEqual(out.trace.evidence,["ci:1","ci:2","commit:"+next,"pr:43"]);
});
test("blocked model never creates a branch; uncertain branch never builds",async()=>{
 const lifecycle={async createBranch(){throw Error("unexpected branch");},async createDraftPr(){throw Error("unexpected draft");}};
 const execute=createExistingPrExecutor({async prepare(){return {outcome:"blocked",reason:"RED",red,attempts:3};},
 async build(){throw Error("unexpected build");},async publish(){throw Error("unexpected publish");},lifecycle});
 assert.equal((await execute(context)).outcome,"blocked");
 const invalid=createExistingPrExecutor({async prepare(){return result;},async build(){throw Error("unexpected build");},
 async publish(){throw Error("unexpected publish");},lifecycle:{...lifecycle,async createBranch(){return {head:next};}}});
 await assert.rejects(invalid(context),/BRANCH_UNCONFIRMED/);
});
test("draft creation is not called on uncertain publication",async()=>{
 const execute=createExistingPrExecutor({async prepare(){return result;},async build(){return prepared;},
 async publish(){return {head};},lifecycle:{async createBranch(){return {head};},async createDraftPr(){throw Error("unexpected draft");}}});
 await assert.rejects(execute(context),/PUBLICATION_UNCONFIRMED/);
});
test("director admits new and existing work only within supported contract",()=>{
 const fresh={...admission,pr:null};
 assert.deepEqual(supportedDirectorAdmissions([fresh,admission,{...fresh,acceptance:"unknown"}]),[fresh,admission]);
});

test("financial contract is admitted only with exact corresponding source scope",()=>{
 const indices={...admission,acceptance:"SADIAAF-INDICES-DAYCOUNT-V1",scopes:["file:src/calc/indices.ts"]};
 assert.deepEqual(supportedDirectorAdmissions([indices,{...indices,scopes:admission.scopes}]),[indices]);
});
