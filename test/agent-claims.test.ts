import assert from "node:assert/strict";
import test from "node:test";
import {applyCommand,assertFence,emptyState,transition,GitHubClaimStore,type ClaimStore,type State,type Command,type GitHubRequest} from "../src/coordination/agentClaims.js";
const base = "a".repeat(40);
const trace = {head:base,nextAction:"Run targeted tests",evidence:["issue:9"]};
const first = {kind:"claim",workId:"issue-9",actor:"agent-a",session:"session-a",lot:11,
  branch:"feat/coord-a",base,scopes:["file:src/coordination","component:agent-admission"],trace,leaseMs:1000} as const;
function acquire():Command {return {...first,scopes:[...first.scopes]};}
const identity = {workId:first.workId,actor:first.actor,session:first.session,generation:1};
const state = () => transition(emptyState(),acquire(),1000);
test("claim records identity, scope, checkpoint and monotonically increasing generation",()=>{
  const s=state(); assert.equal(s.claims[0]?.generation,1);assert.equal(s.lastEvent?.kind,"claim");
  assert.equal(s.claims[0]?.leaseUntil,2000);
});
test("same task, branch, directory or semantic scope cannot be claimed",()=>{
  const s=state();
  for(const [branch,scopes] of [["feat/coord-b",["file:src/coordination/a.ts"]],["feat/coord-a",["file:src/unrelated.ts"]],["feat/coord-c",["component:agent-admission"]]] as [string,string[]][]) {
    assert.throws(()=>transition(s,{...first,workId:"issue-10",branch,scopes},1100),/SCOPE_OCCUPIED/);
  }
  assert.throws(()=>transition(s,acquire(),1100),/ALREADY_CLAIMED/);
});
test("disjoint claims coexist and expiry does not silently release a scope",()=>{
  const s=transition(state(),{...first,workId:"issue-10",branch:"feat/coord-b",scopes:["file:src/api"]},1100);
  assert.equal(s.claims.length,2);
  assert.throws(()=>transition(s,{...first,workId:"issue-11",branch:"feat/coord-c",scopes:["file:src/coordination/a.ts"]},3000),/SCOPE_OCCUPIED/);
});
test("heartbeat, checkpoint and release preserve evidence and refuse old owners",()=>{
  let s=transition(state(),{kind:"heartbeat",...identity,leaseMs:2000},1500);
  const checkpoint={...trace,head:"b".repeat(40),evidence:["pr:42","ci:123"]};
  s=transition(s,{kind:"checkpoint",...identity,trace:checkpoint},1600);
  assert.equal(s.claims[0]?.trace.head,checkpoint.head);
  assert.throws(()=>transition(s,{kind:"release",...identity,session:"other",trace},1700),/STALE/);
  s=transition(s,{kind:"release",...identity,trace:checkpoint},1700);
  assert.equal(s.claims.length,0);assert.deepEqual(s.lastEvent?.trace,checkpoint);
});
test("expired claim requires explicit reconciliation and new generation; stale writer is fenced",()=>{
  const s=state();
  const recover={...first,kind:"recover" as const,actor:"agent-b",session:"session-b",scopes:[...first.scopes],previousGeneration:1,reconciledHead:base};
  assert.throws(()=>transition(s,recover,1999),/RECOVERY_NOT_ADMISSIBLE/);
  assert.throws(()=>transition(s,{...recover,reconciledHead:"b".repeat(40)},2000),/RECONCILIATION_REQUIRED/);
  const resumed=transition(s,recover,2000);
  assert.equal(resumed.claims[0]?.generation,2);
  assert.throws(()=>assertFence(resumed,identity,2001),/STALE/);
  assert.equal(assertFence(resumed,{...identity,actor:"agent-b",session:"session-b",generation:2},2001).generation,2);
});
test("reject clock regression, invalid leases, malformed scope and unknown evidence",()=>{
  assert.throws(()=>transition(state(),{kind:"heartbeat",...identity,leaseMs:1000},999),/CLOCK_REGRESSION/);
  assert.throws(()=>transition(emptyState(),{...first,scopes:[...first.scopes],leaseMs:0},1000),/INVALID_LEASE/);
  assert.throws(()=>transition(emptyState(),{...first,scopes:["file:src/../other"]},1000));
  assert.throws(()=>transition(emptyState(),{...first,scopes:[...first.scopes],trace:{...trace,evidence:["unknown"]}},1000));
});
test("competing claims based on one snapshot yield one CAS winner",async()=>{
  let version="initial";let s=emptyState();
  const store:ClaimStore={async read(){return {version,state:structuredClone(s)}},
    async compareAndSwap(expected,next){if(expected!==version)throw Error("CAS_CONFLICT");s=next;version=String(next.revision);return version;}};
  const result=await Promise.allSettled([applyCommand(store,acquire(),1000),applyCommand(store,{...first,actor:"agent-b",scopes:[...first.scopes]},1000)]);
  assert.equal(result.filter(r=>r.status==="fulfilled").length,1);
  assert.equal(s.claims.length,1);
});
test("GitHub adapter constructs single-parent commit and non-force ref update; rejects stale base",async()=>{
  const current="1".repeat(40),tree="2".repeat(40),commit="3".repeat(40);
  let head=current; const calls:{method:string;path:string;body:unknown}[]=[];
  const request:GitHubRequest=async(method,path,body)=>{
    calls.push({method,path,body});
    if(method==="GET"&&path.startsWith("/git/refs/"))return {object:{sha:head}};
    if(method==="GET"&&path.startsWith("/contents/"))return {encoding:"base64",content:Buffer.from(JSON.stringify(emptyState())).toString("base64")};
    if(path==="/git/trees")return {sha:tree};
    if(path==="/git/commits")return {sha:commit};
    if(method==="PATCH"){head=commit;return {object:{sha:head}};}
    throw Error("unexpected");
  };
  const store=new GitHubClaimStore(request);
  const out=await applyCommand(store,acquire(),1000);
  assert.equal(out.version,commit);
  assert.deepEqual(calls.find(c=>c.path==="/git/commits")?.body,{message:"coordination: claim issue-9",tree,parents:[current]});
  assert.deepEqual(calls.find(c=>c.method==="PATCH")?.body,{sha:commit,force:false});
  await assert.rejects(store.compareAndSwap(current,state()),/CLAIM_CAS_CONFLICT/);
});
