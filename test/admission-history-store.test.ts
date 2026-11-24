import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {CONTINUITY_ID,emptyState,stateSchema,createAdmissionHistoryPort,type ClaimStore,type State} from "../src/coordination/agentClaims.js";
const empty={count:0,digest:createHash("sha256").update(JSON.stringify({continuity:CONTINUITY_ID,records:[]})).digest("hex")};
const one={count:1,digest:"a".repeat(64)},two={count:2,digest:"b".repeat(64)};
function fixture(){
 let state:State=emptyState(),rev=0,authorized=true,emptyProof=false,prefixProof=true;
 const version=()=>rev.toString(16).padStart(40,"0");
 const store:ClaimStore={async read(){return {version:version(),state:structuredClone(state)};},
  async compareAndSwap(expected,next){if(expected!==version())throw Error("CAS_CONFLICT");state=stateSchema.parse(next);rev++;return version();}};
 const port=createAdmissionHistoryPort({store,actor:"director",session:"history-a",now:()=>1000+rev,
  async authenticate(){return authorized;},async verifyEmptyHistory(){return emptyProof;},async verifyPrefixAdvance(){return prefixProof;}});
 return {store,port,allowEmpty:()=>{emptyProof=true;},denyPrefix:()=>{prefixProof=false;},denyAuth:()=>{authorized=false;}};
}
test("missing checkpoint is not empty; bootstrap needs explicit evidence",async()=>{
 const f=fixture();await assert.rejects(f.port.readCheckpoint(),/NOT_INITIALIZED/);
 await assert.rejects(f.port.initializeEmpty(["issue:9"]),/EMPTY_PROOF_REQUIRED/);
 f.allowEmpty();assert.equal(await f.port.initializeEmpty(["issue:9"]),true);
 assert.deepEqual(await f.port.readCheckpoint(),empty);
 await assert.rejects(f.port.initializeEmpty(["issue:9"]),/BOOTSTRAP_REQUIRED/);
});
test("append-only checkpoint survives reload and refuses stale or regressing proposals",async()=>{
 const f=fixture();f.allowEmpty();await f.port.initializeEmpty(["issue:9"]);
 assert.equal(await f.port.advanceCheckpoint(empty,one),true);
 assert.equal(await f.port.advanceCheckpoint(empty,two),false);
 assert.equal(await f.port.advanceCheckpoint(one,empty),false);
 assert.equal(await f.port.advanceCheckpoint(one,{count:1,digest:two.digest}),false);
 assert.deepEqual(await f.port.readCheckpoint(),one);
 assert.equal(await f.port.advanceCheckpoint(one,two),true);
 assert.deepEqual((await f.store.read()).state.admissionHistory,two);
});
test("independent proof and authentication are mandatory",async()=>{
 const f=fixture();f.allowEmpty();await f.port.initializeEmpty(["issue:9"]);f.denyPrefix();
 await assert.rejects(f.port.advanceCheckpoint(empty,one),/PREFIX_PROOF_DENIED/);
 f.denyAuth();await assert.rejects(f.port.readCheckpoint(),/UNAUTHENTICATED/);
});
test("competing advances cannot both replace the same checkpoint",async()=>{
 const f=fixture();f.allowEmpty();await f.port.initializeEmpty(["issue:9"]);
 const outcomes=await Promise.allSettled([f.port.advanceCheckpoint(empty,one),f.port.advanceCheckpoint(empty,two)]);
 assert.equal(outcomes.filter(x=>x.status==="fulfilled"&&x.value===true).length,1);
 assert.ok([1,2].includes((await f.store.read()).state.admissionHistory!.count));
});
