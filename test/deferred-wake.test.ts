import assert from "node:assert/strict";
import test from "node:test";
import {emptyState,stateSchema,admitDeferredDirectorWake,runDeferredDirectorWake,runDirectorWake,listAcceptedDirectorWakes,type ClaimStore,type State,type DirectorWakePorts,type WakeSignal} from "../src/coordination/agentClaims.js";
const signal:WakeSignal={kind:"ci-completed",key:"ci:1:1",head:"a".repeat(40),evidence:"ci:1"};
function fixture(){
 let state:State=emptyState(),version=0,selected=0,deny=false,crash=false;
 const store:ClaimStore={async read(){return {state:structuredClone(state),version:String(version)};},
  async compareAndSwap(v,s){if(v!==String(version))throw Error("CAS_CONFLICT");state=stateSchema.parse(s);return String(++version);}};
 const ports:DirectorWakePorts={store,actor:"actor-a",session:"session-a",now:()=>1000+version,leaseMs:10000,maxUnits:1,
  async verifySignal(){return !deny;},async selectNext(){selected++;if(crash)throw Error("CRASH");return null;},async execute(){throw Error("unexpected execution");}};
 return {ports,store,count:()=>selected,deny:()=>{deny=true;},crash:()=>{crash=true;}};
}
test("durable receipt accepts without execution and survives new session",async()=>{
 const f=fixture();assert.equal((await admitDeferredDirectorWake(signal,f.ports)).status,"accepted");assert.equal(f.count(),0);
 assert.deepEqual(listAcceptedDirectorWakes((await f.store.read()).state),[signal]);
 assert.equal((await admitDeferredDirectorWake(signal,f.ports)).status,"duplicate");
 assert.equal((await runDirectorWake(signal,f.ports)).status,"reconciliation-required");
 assert.equal((await runDeferredDirectorWake(signal,{...f.ports,session:"session-b"})).status,"executed");
 assert.equal(f.count(),1);assert.deepEqual(listAcceptedDirectorWakes((await f.store.read()).state),[]);
 assert.equal((await runDeferredDirectorWake(signal,f.ports)).status,"duplicate");
});
test("concurrent dispatch executes at most one pass via existing CAS",async()=>{
 const f=fixture();await admitDeferredDirectorWake(signal,f.ports);
 const out=await Promise.allSettled([runDeferredDirectorWake(signal,f.ports),runDeferredDirectorWake(signal,{...f.ports,session:"session-b"})]);
 assert.equal(f.count(),1);assert.ok(out.some(x=>x.status==="fulfilled"&&x.value.status==="executed"));
});
test("crash retains pending receipt, no second execution or unsafe re-admission",async()=>{
 const f=fixture();await admitDeferredDirectorWake(signal,f.ports);f.crash();
 await assert.rejects(runDeferredDirectorWake(signal,f.ports),/CRASH/);
 assert.equal((await runDeferredDirectorWake(signal,f.ports)).status,"reconciliation-required");
 assert.equal((await admitDeferredDirectorWake(signal,f.ports)).status,"reconciliation-required");assert.equal(f.count(),1);
});
test("unverified or not-admitted signal cannot execute",async()=>{
 const f=fixture();await assert.rejects(runDeferredDirectorWake(signal,f.ports),/NOT_ADMITTED/);
 await admitDeferredDirectorWake(signal,f.ports);f.deny();
 await assert.rejects(runDeferredDirectorWake(signal,f.ports),/UNVERIFIED/);
 assert.equal(f.count(),0);assert.equal(listAcceptedDirectorWakes((await f.store.read()).state).length,1);
});
