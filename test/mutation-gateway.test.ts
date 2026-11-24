import assert from "node:assert/strict";
import test from "node:test";
import {emptyState,transition,applyCommand,type ClaimStore,type Command} from "../src/coordination/agentClaims.js";
import {publishClaimedCommit,reconcileClaimedMutation,type MutationGatewayPorts} from "../src/coordination/mutationGateway.js";
const base="a".repeat(40),candidateHead="b".repeat(40);
const trace={head:base,nextAction:"Test",evidence:["issue:9"]};
const admission:Command={kind:"claim",workId:"gateway-test",actor:"agent-a",session:"session-a",lot:11,branch:"work/gateway-test",base,scopes:["file:src/utils"],trace,leaseMs:1000};
const identity={workId:"gateway-test",actor:"agent-a",session:"session-a",generation:1};
const proposal={branch:"work/gateway-test",expectedHead:base,candidateHead,paths:["src/utils/dates.ts"]};
function fixture(){
  let state=transition(emptyState(),admission,1000),version="1",head=base,now=1100,writes=0;
  const store:ClaimStore={async read(){return {version,state:structuredClone(state)}},
    async compareAndSwap(v,s){if(v!==version)throw Error("CAS_CONFLICT");state=structuredClone(s);version=String(s.revision);return version}};
  const ports:MutationGatewayPorts={store,now:()=>now,async authenticate(){return true;},
    async verifyPrepared(){return true;},async readHead(){return head;},
    async publishNonForce(p){writes++;head=p.candidateHead;},async verifyQuiescence(){return true;}};
  return {ports,store,setNow:(n:number)=>{now=n;},setHead:(s:string)=>{head=s;},writes:()=>writes};
}
test("durable intent precedes publication and result updates checkpoint",async()=>{
  const f=fixture(),publish=f.ports.publishNonForce;
  f.ports.publishNonForce=async p=>{assert.equal((await f.store.read()).state.claims[0]?.pendingMutation?.candidateHead,candidateHead);await publish(p)};
  assert.deepEqual(await publishClaimedCommit(f.ports,identity,proposal),{head:candidateHead});
  const c=(await f.store.read()).state.claims[0]!;
  assert.equal(c.pendingMutation,undefined);assert.equal(c.trace.head,candidateHead);assert.equal(f.writes(),1);
  await assert.rejects(publishClaimedCommit(f.ports,identity,proposal),/MUTATION_SCOPE_MISMATCH/);
});
test("out of scope, wrong branch, stale identity and denied proof never publish",async()=>{
  const f=fixture();
  await assert.rejects(publishClaimedCommit(f.ports,identity,{...proposal,paths:["src/other.ts"]}),/SCOPE/);
  await assert.rejects(publishClaimedCommit(f.ports,identity,{...proposal,branch:"main"}),/SCOPE/);
  await assert.rejects(publishClaimedCommit(f.ports,{...identity,generation:2},proposal),/STALE/);
  f.ports.verifyPrepared=async()=>false;
  await assert.rejects(publishClaimedCommit(f.ports,identity,proposal),/NOT_VERIFIED/);
  assert.equal(f.writes(),0);assert.equal((await f.store.read()).state.claims[0]?.pendingMutation,undefined);
});
test("competing intents admit only one publisher",async()=>{
  const f=fixture();
  const results=await Promise.allSettled([publishClaimedCommit(f.ports,identity,proposal),publishClaimedCommit(f.ports,identity,proposal)]);
  assert.equal(results.filter(x=>x.status==="fulfilled").length,1);assert.equal(f.writes(),1);
});
test("ambiguous publication blocks release and recovery, even after expiry",async()=>{
  const f=fixture();
  f.ports.publishNonForce=async()=>{throw Error("NETWORK_UNCERTAIN")};
  await assert.rejects(publishClaimedCommit(f.ports,identity,proposal),/NETWORK_UNCERTAIN/);
  await assert.rejects(applyCommand(f.store,{kind:"release",...identity,trace},1200),/RECONCILIATION/);
  f.setNow(2100);
  const recovery:Command={...admission,kind:"recover",actor:"agent-b",session:"session-b",previousGeneration:1,reconciledHead:base};
  await assert.rejects(applyCommand(f.store,recovery,2100),/RECONCILIATION/);
  f.ports.verifyQuiescence=async()=>false;
  await assert.rejects(reconcileClaimedMutation(f.ports,identity),/STILL_UNCERTAIN/);
  f.ports.verifyQuiescence=async()=>true;
  assert.deepEqual(await reconcileClaimedMutation(f.ports,identity),{head:base,published:false});
  await applyCommand(f.store,recovery,2101);
  assert.equal((await f.store.read()).state.claims[0]?.actor,"agent-b");
});
test("confirmed late success reconciles without republishing",async()=>{
  const f=fixture();
  f.ports.publishNonForce=async()=>{f.setHead(candidateHead);throw Error("RESPONSE_LOST")};
  await assert.rejects(publishClaimedCommit(f.ports,identity,proposal),/RESPONSE_LOST/);
  f.setNow(2200);
  assert.deepEqual(await reconcileClaimedMutation(f.ports,identity),{head:candidateHead,published:true});
  assert.equal((await f.store.read()).state.claims[0]?.trace.head,candidateHead);
  assert.equal(f.writes(),0);
});
test("head divergence and unauthorized reconciliation fail closed",async()=>{
  const f=fixture();
  f.ports.publishNonForce=async()=>{throw Error("UNKNOWN")};
  await assert.rejects(publishClaimedCommit(f.ports,identity,proposal),/UNKNOWN/);
  f.setHead("c".repeat(40));
  await assert.rejects(reconcileClaimedMutation(f.ports,identity),/DIVERGED/);
  f.ports.authenticate=async()=>false;
  await assert.rejects(reconcileClaimedMutation(f.ports,identity),/UNAUTHENTICATED/);
  assert.ok((await f.store.read()).state.claims[0]?.pendingMutation);
});
