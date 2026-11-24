import assert from "node:assert/strict";
import test from "node:test";
import {emptyState,stateSchema,runClaimedWorkPass,applyCommand,listWorkReceipts,readWorkReceipt,asPromotionReceipt,type WorkPublicationProof,type State,type ClaimStore,type WorkCandidate,type WorkPassPorts} from "../src/coordination/agentClaims.js";
const base="a".repeat(40),head="b".repeat(40);
const candidate:WorkCandidate={workId:"work-a",lot:11,branch:"work/sadiaaf-issue-9-dates",base,scopes:["file:src/utils/dates.ts"],
 trace:{head:base,nextAction:"code",evidence:["issue:9"]}};
const proof={head,nextAction:"Reconcile CI and promotion",evidence:["issue:91","issue:92","commit:"+head,"pr:43"]};
function fixture(){
 let state:State=emptyState(),version=0,selected=0,failRelease=false;
 const store:ClaimStore={async read(){return {version:String(version),state:structuredClone(state)};},
  async compareAndSwap(v,n){assert.equal(v,String(version));if(failRelease&&n.lastEvent?.kind==="release")throw Error("LOST_RELEASE");
   state=stateSchema.parse(n);return String(++version);}};
 const ports:WorkPassPorts={store,actor:"app",session:"session-a",now:()=>1000+version,leaseMs:10000,maxUnits:1,
  async selectNext(){return selected++===0?candidate:null;},async execute(){return {outcome:"completed",trace:proof};}};
 return {store,ports,fail:()=>{failRelease=true;}};
}
test("release atomically retains original pass evidence and exact PR",async()=>{
 const f=fixture();await runClaimedWorkPass(f.ports);
 const state=(await f.store.read()).state;assert.equal(state.claims.length,0);
 const r=await readWorkReceipt(f.store,"work-a",1);
 assert.equal(r.outcome,"completed");assert.equal(r.base,base);assert.equal(r.head,head);assert.equal(r.prNumber,43);
 assert.deepEqual(r.evidence,proof.evidence);assert.equal(r.receiptRevision,state.revision);
 assert.equal(state.lastEvent?.kind,"release");
});
test("new generation and later pass retain original receipt unchanged",async()=>{
 const f=fixture();await runClaimedWorkPass(f.ports);const first=await readWorkReceipt(f.store,"work-a",1);
 await runClaimedWorkPass({...f.ports,session:"session-b",async selectNext(){return {...candidate,base:head,trace:{...proof}};},
  async execute(){return {outcome:"completed",trace:{...proof,nextAction:"Ready observed"}};}});
 const receipts=await listWorkReceipts(f.store,"work-a");assert.equal(receipts.length,2);assert.deepEqual(receipts[0],first);
 assert.notEqual(receipts[1]?.generation,first.generation);assert.equal(receipts[1]?.base,head);
});
test("failed release leaves claim and no misleading receipt",async()=>{
 const f=fixture();f.fail();await assert.rejects(runClaimedWorkPass(f.ports),/LOST_RELEASE/);
 const s=(await f.store.read()).state;assert.equal(s.claims.length,1);assert.equal(s.claims[0]?.trace.head,head);
 assert.deepEqual(await listWorkReceipts(f.store,"work-a"),[]);
});
test("manual legacy release remains valid and missing receipt fails closed",async()=>{
 const f=fixture();const {state}=await applyCommand(f.store,{kind:"claim",...candidate,actor:"app",session:"manual",leaseMs:10000},1000);
 const c=state.claims[0]!;await applyCommand(f.store,{kind:"release",workId:c.workId,actor:c.actor,session:c.session,generation:c.generation,trace:c.trace},1001);
 await assert.rejects(readWorkReceipt(f.store,c.workId,c.generation),/NOT_FOUND/);
});

const publication:WorkPublicationProof={issue:9,mainSha:base,acceptance:"dates",paths:["src/utils/dates.ts"],
 red:{status:"fail",subject:"c".repeat(64),suite:"d".repeat(64),evidence:"issue:91",diagnostics:["red"]},
 green:{status:"pass",subject:"e".repeat(64),suite:"d".repeat(64),evidence:"issue:92",diagnostics:[]}};
test("structured proof is bound atomically to the original publication receipt",async()=>{
 const f=fixture();await runClaimedWorkPass({...f.ports,async execute(){return {outcome:"completed",trace:proof,publication};}});
 const receipt=await readWorkReceipt(f.store,"work-a",1),promotion=asPromotionReceipt(receipt);
 assert.equal(promotion.prNumber,43);assert.equal(promotion.base,base);assert.equal(promotion.head,head);assert.deepEqual(promotion.red,publication.red);
 assert.deepEqual(promotion.green,publication.green);assert.equal(promotion.acceptance,"dates");
});
test("mismatched publication proof blocks release instead of minting a promotion receipt",async()=>{
 const f=fixture();await assert.rejects(runClaimedWorkPass({...f.ports,async execute(){return {outcome:"completed",trace:proof,
 publication:{...publication,green:{...publication.green,evidence:"issue:93"}}};}}),/WORK_PUBLICATION_PROOF_MISMATCH/);
 assert.equal((await f.store.read()).state.claims.length,1);assert.deepEqual(await listWorkReceipts(f.store,"work-a"),[]);
});
