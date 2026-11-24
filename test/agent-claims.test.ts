import assert from "node:assert/strict";
import test from "node:test";
import {runDirectorWake,runClaimedWorkPass,applyCommand,assertFence,emptyState,transition,GitHubClaimStore,type ClaimStore,type State,type Command,type GitHubRequest} from "../src/coordination/agentClaims.js";
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
    if(method==="GET"&&path==="/git/ref/heads/coordination/sadiaaf-agent-state")return {object:{sha:head}};
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
  assert.equal(calls.find(c=>c.method==="PATCH")?.path,"/git/refs/heads/coordination/sadiaaf-agent-state");
  await assert.rejects(store.compareAndSwap(current,state()),/CLAIM_CAS_CONFLICT/);
});

test("native Git fast-forward race admits exactly one sibling and preserves winner",async()=>{
  const {mkdtemp,rm}=await import("node:fs/promises");
  const {tmpdir}=await import("node:os");
  const {join}=await import("node:path");
  const {execFile}=await import("node:child_process");
  const {promisify}=await import("node:util");
  const run=promisify(execFile);
  const dir=await mkdtemp(join(tmpdir(),"sadiaaf-claim-race-"));
  const env={...process.env,GIT_AUTHOR_NAME:"SadiaAF test",GIT_AUTHOR_EMAIL:"test@example.invalid",GIT_COMMITTER_NAME:"SadiaAF test",GIT_COMMITTER_EMAIL:"test@example.invalid"};
  const git=async(cwd:string,...args:string[])=>(await run("git",args,{cwd,env})).stdout.trim();
  try{
    const remote=join(dir,"remote.git");
    await git(dir,"init","--bare",remote);
    await git(dir,"init","-b","main");
    const {writeFile}=await import("node:fs/promises");
    await writeFile(join(dir,"agent-claims.json"),JSON.stringify(emptyState()));
    await git(dir,"add","agent-claims.json");
    await git(dir,"commit","-m","initial");
    const parent=await git(dir,"rev-parse","HEAD");
    const ref="refs/heads/coordination/sadiaaf-agent-state";
    await git(dir,"push",remote,parent+":"+ref);
    await writeFile(join(dir,"agent-claims.json"),JSON.stringify(state()));
    await git(dir,"add","agent-claims.json");
    await git(dir,"commit","-m","claim A");
    const a=await git(dir,"rev-parse","HEAD");
    await git(dir,"checkout","--detach",parent);
    await writeFile(join(dir,"agent-claims.json"),JSON.stringify(transition(emptyState(),{...first,actor:"agent-b",session:"session-b",scopes:[...first.scopes]},1000)));
    await git(dir,"add","agent-claims.json");
    await git(dir,"commit","-m","claim B");
    const b=await git(dir,"rev-parse","HEAD");
    const result=await Promise.allSettled([git(dir,"push",remote,a+":"+ref),git(dir,"push",remote,b+":"+ref)]);
    assert.equal(result.filter(x=>x.status==="fulfilled").length,1);
    const winner=await git(dir,"--git-dir="+remote,"rev-parse",ref);
    assert.ok(winner===a||winner===b);
    const loser=winner===a?b:a;
    await assert.rejects(git(dir,"push",remote,loser+":"+ref));
    assert.equal(await git(dir,"--git-dir="+remote,"rev-parse",ref),winner);
  }finally{await rm(dir,{recursive:true,force:true});}
});


function memoryStore():ClaimStore {
  let state = emptyState(); let version = "0";
  return {
    async read(){return {version,state:structuredClone(state)};},
    async compareAndSwap(expected,next){
      if(expected!==version) throw Error("CAS_CONFLICT");
      state=structuredClone(next);version=String(next.revision);return version;
    }
  };
}
function workCandidate(workId:string) {
  return {workId,lot:11,branch:"feat/"+workId,base,scopes:["file:src/"+workId],trace};
}
test("one admitted pass selects and runs two units without a second trigger",async()=>{
  const store=memoryStore();
  const selected:string[][]=[];
  const executed:string[]=[];
  let now=1000;
  const result=await runClaimedWorkPass({
    store,actor:"agent-a",session:"pass-a",now:()=>now++,leaseMs:1000,maxUnits:3,
    async selectNext(finished){
      selected.push([...finished]);
      return finished.length===0?workCandidate("one"):finished.length===1?workCandidate("two"):null;
    },
    async execute(ctx){
      assert.equal((await ctx.assertCurrent()).workId,ctx.claim.workId);
      await ctx.heartbeat();
      executed.push(ctx.claim.workId);
      return {outcome:ctx.claim.workId==="one"?"blocked":"completed",
        trace:{...trace,nextAction:ctx.claim.workId==="one"?"Wait for CI":"Reconcile next task",evidence:["issue:9"]}};
    }
  });
  assert.deepEqual(result,{stop:"no-work",finished:["one","two"]});
  assert.deepEqual(selected,[[],["one"],["one","two"]]);
  assert.deepEqual(executed,["one","two"]);
  assert.equal((await store.read()).state.claims.length,0);
});
test("interrupted or unconfirmed executor retains the claim and does not select another unit",async()=>{
  const store=memoryStore();let selections=0;
  await assert.rejects(runClaimedWorkPass({
    store,actor:"agent-a",session:"pass-a",now:()=>1000,leaseMs:1000,maxUnits:2,
    async selectNext(){selections++;return workCandidate("one");},
    async execute(){throw Error("EXECUTOR_INTERRUPTED");}
  }),/EXECUTOR_INTERRUPTED/);
  assert.equal(selections,1);
  assert.equal((await store.read()).state.claims[0]?.workId,"one");
});
test("expired execution cannot checkpoint or release a newer or expired claim",async()=>{
  const store=memoryStore();let now=1000;
  await assert.rejects(runClaimedWorkPass({
    store,actor:"agent-a",session:"pass-a",now:()=>now,leaseMs:1000,maxUnits:1,
    async selectNext(){return workCandidate("one");},
    async execute(){now=2000;return {outcome:"completed",trace};}
  }),/STALE_OR_EXPIRED_CLAIM/);
  assert.equal((await store.read()).state.claims[0]?.workId,"one");
});
test("bounded pass rejects repeated work and stops when limit is reached",async()=>{
  const store=memoryStore();
  const options={store,actor:"agent-a",session:"pass-a",now:()=>1000,leaseMs:1000,maxUnits:1,
    async selectNext(){return workCandidate("one");},
    async execute(){return {outcome:"completed" as const,trace};}};
  assert.deepEqual(await runClaimedWorkPass(options),{stop:"limit",finished:["one"]});
  await assert.rejects(runClaimedWorkPass({...options,maxUnits:2}),/WORK_ALREADY_ATTEMPTED_IN_PASS/);
});
test("missing proof retains claim rather than marking work finished",async()=>{
  const store=memoryStore();
  await assert.rejects(runClaimedWorkPass({
    store,actor:"agent-a",session:"pass-a",now:()=>1000,leaseMs:1000,maxUnits:1,
    async selectNext(){return workCandidate("one");},
    async execute(){return {outcome:"completed",trace:{...trace,evidence:[]}};}
  }),/WORK_PASS_EVIDENCE_REQUIRED/);
  assert.equal((await store.read()).state.claims[0]?.workId,"one");
});

const signal={key:"ci:123:1",kind:"ci-completed" as const,head:base,evidence:"ci:123"};
test("director wake persists intent before dispatch and result before duplicate acknowledgement",async()=>{
  const store=memoryStore();let selected=0;let now=1000;
  const ports={store,actor:"agent-a",session:"wake-a",now:()=>now++,leaseMs:1000,maxUnits:2,
    async verifySignal(){return true;},
    async selectNext(finished:readonly string[]){
      selected++;
      assert.equal((await store.read()).state.wakeReceipts?.[0]?.outcome,"pending");
      return finished.length?null:workCandidate("one");
    },
    async execute(){return {outcome:"completed" as const,trace};}};
  assert.deepEqual(await runDirectorWake(signal,ports),{status:"executed",stop:"no-work",finished:["one"]});
  assert.equal((await store.read()).state.wakeReceipts?.[0]?.outcome,"no-work");
  assert.deepEqual(await runDirectorWake(signal,ports),{status:"duplicate",finished:["one"]});
  assert.equal(selected,2);
  await assert.rejects(runDirectorWake({...signal,head:"b".repeat(40)},ports),/WAKE_KEY_CONFLICT/);
});
test("unverified wake cannot read tasks or dispatch an executor",async()=>{
  const store=memoryStore();let selections=0;
  await assert.rejects(runDirectorWake(signal,{store,actor:"agent-a",session:"wake-a",now:()=>1000,leaseMs:1000,maxUnits:1,
    async verifySignal(){return false;},
    async selectNext(){selections++;return null;},
    async execute(){throw Error("unexpected");}}),/UNVERIFIED_WAKE_SIGNAL/);
  assert.equal(selections,0);assert.equal((await store.read()).state.revision,0);
});
test("interrupted director wake remains pending and cannot dispatch on replay",async()=>{
  const store=memoryStore();let executions=0;
  const ports={store,actor:"agent-a",session:"wake-a",now:()=>1000,leaseMs:1000,maxUnits:1,
    async verifySignal(){return true;},async selectNext(){return workCandidate("one");},
    async execute(){executions++;throw Error("INTERRUPTED");}};
  await assert.rejects(runDirectorWake(signal,ports),/INTERRUPTED/);
  assert.equal((await store.read()).state.wakeReceipts?.[0]?.outcome,"pending");
  assert.deepEqual(await runDirectorWake(signal,ports),{status:"reconciliation-required",finished:[]});
  assert.equal(executions,1);assert.equal((await store.read()).state.claims.length,1);
});
test("two concurrent deliveries of same wake cannot both dispatch",async()=>{
  const store=memoryStore();let selections=0;
  const ports={store,actor:"agent-a",session:"wake-a",now:()=>1000,leaseMs:1000,maxUnits:1,
    async verifySignal(){return true;},async selectNext(){selections++;return null;},
    async execute(){throw Error("unexpected");}};
  const results=await Promise.allSettled([runDirectorWake(signal,ports),runDirectorWake(signal,ports)]);
  assert.equal(selections,1);
  assert.equal(results.filter(r=>r.status==="fulfilled"&&r.value.status==="executed").length,1);
});
