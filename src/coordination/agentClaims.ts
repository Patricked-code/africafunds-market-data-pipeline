import { z } from "zod";

export const CONTINUITY_ID = "SADIAAF-CONTINUITY-20261124-01";
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const stamp = z.number().int().nonnegative().safe();
const scope = z.string().max(300).regex(/^(file|component|contract|task):[A-Za-z0-9_.\/-]+$/)
  .refine(s => !s.split(":")[1]?.split("/").some(p => p === "." || p === ".." || p === ""));
const trace = z.object({
  head: sha, nextAction: z.string().min(1).max(500),
  evidence: z.array(z.string().regex(/^(commit:[a-f0-9]{40}|(?:pr|issue|ci):[1-9][0-9]{0,19})$/)).max(30),
}).strict();
const pendingMutationSchema = z.object({
  expectedHead:sha, candidateHead:sha,
  paths:z.array(z.string().max(295).regex(/^[A-Za-z0-9_.\/-]+$/)
    .refine(p=>!p.split("/").some(x=>x===""||x==="."||x===".."))).min(1).max(100),
}).strict().superRefine((m,ctx)=>{
  if(m.expectedHead===m.candidateHead || new Set(m.paths).size!==m.paths.length)
    ctx.addIssue({code:"custom",message:"INVALID_MUTATION_INTENT"});
});
export type PendingMutation=z.infer<typeof pendingMutationSchema>;
const claim = z.object({
  workId: id, actor: id, session: id, lot: z.number().int().min(0).max(13),
  branch: z.string().min(1).max(200).regex(/^[A-Za-z0-9._/-]+$/)
    .refine(b => b !== "main" && !b.startsWith("coordination/") && !b.includes("..")),
  base: sha, scopes: z.array(scope).min(1).max(100),
  generation: stamp.positive(), leaseUntil: stamp, updatedAt: stamp,
  trace,
  pendingMutation:pendingMutationSchema.optional(),
}).strict();
const wakeSignalSchema = z.object({
  key: id,
  kind: z.enum(["ci-completed","pr-merged","dependency-ready","claim-recovery","manual-admission","hourly-reconcile"]),
  head: sha,
  evidence: z.string().regex(/^(commit:[a-f0-9]{40}|(?:pr|issue|ci):[1-9][0-9]{0,19})$/)
}).strict();
const wakeReceiptSchema = z.object({
  signal: wakeSignalSchema, actor:id, session:id, startedAt:stamp,
  intentRevision:stamp.positive(),
  outcome:z.enum(["accepted","pending","no-work","limit"]),
  finished:z.array(id).max(10),
  completedAt:stamp.optional()
}).strict();
export type WakeSignal = z.infer<typeof wakeSignalSchema>;
type WakeReceipt = z.infer<typeof wakeReceiptSchema>;
const event = z.object({
  revision: stamp.positive(), kind: z.enum(["claim","heartbeat","checkpoint","release","recover","wake-accepted","wake-intent","wake-result","mutation-intent","mutation-result"]),
  at: stamp, workId: id, actor: id, session: id, generation: stamp.positive(),
  previousGeneration: stamp.positive().optional(), wakeKey:id.optional(), trace,
}).strict();
export const stateSchema = z.object({
  continuity: z.literal(CONTINUITY_ID), revision: stamp, updatedAt: stamp,
  claims: z.array(claim), lastEvent: event.nullable(),
  wakeReceipts:z.array(wakeReceiptSchema).max(4096).optional(),
}).strict().superRefine((s,ctx) => {
  const fail = (message: string) => ctx.addIssue({code:"custom",message});
  if ((s.revision === 0) !== (s.lastEvent === null) ||
      (s.lastEvent && (s.lastEvent.revision !== s.revision || s.lastEvent.at !== s.updatedAt))) fail("invalid event revision");
  const keys = new Set<string>();
  for (const r of s.wakeReceipts ?? []) {
    if (keys.has(r.signal.key) || r.startedAt > s.updatedAt || r.intentRevision > s.revision ||
        new Set(r.finished).size !== r.finished.length ||
        ((r.outcome === "pending" || r.outcome === "accepted") && (r.completedAt !== undefined || r.finished.length !== 0)) ||
        (r.outcome !== "pending" && r.outcome !== "accepted" && (r.completedAt === undefined || r.completedAt < r.startedAt || r.completedAt > s.updatedAt)))
      fail("invalid wake receipt");
    keys.add(r.signal.key);
  }
  if (s.lastEvent?.kind.startsWith("wake-") && (!s.lastEvent.wakeKey || !keys.has(s.lastEvent.wakeKey))) fail("missing wake receipt");
  for (const [i,a] of s.claims.entries()) {
    if (a.generation > s.revision || a.updatedAt > s.updatedAt || a.leaseUntil <= a.updatedAt ||
        new Set(a.scopes).size !== a.scopes.length || (a.pendingMutation && (a.pendingMutation.expectedHead!==a.trace.head || !mutationPathsAllowed(a,a.pendingMutation.paths)))) fail("invalid claim state");
    for (const b of s.claims.slice(i+1)) if (conflicts(a,b)) fail("overlapping existing claims");
  }
});
export type State = z.infer<typeof stateSchema>;
export type Claim = z.infer<typeof claim>;
type Trace = z.infer<typeof trace>;
type Admission = Pick<Claim,"workId"|"actor"|"session"|"lot"|"branch"|"base"|"scopes"|"trace">;
type Identity = Pick<Claim,"workId"|"actor"|"session"|"generation">;
export type Command =
  | ({kind:"claim"; leaseMs:number} & Admission)
  | ({kind:"recover"; leaseMs:number; previousGeneration:number; reconciledHead:string} & Admission)
  | ({kind:"heartbeat"; leaseMs:number} & Identity)
  | ({kind:"checkpoint"; trace:Trace} & Identity)
  | ({kind:"release"; trace:Trace} & Identity)
  | ({kind:"mutation-intent"; mutation:PendingMutation} & Identity)
  | ({kind:"mutation-result"; candidateHead:string; observedHead:string; trace:Trace} & Identity);

export function emptyState(): State {
  return {continuity:CONTINUITY_ID,revision:0,updatedAt:0,claims:[],lastEvent:null};
}
function conflicts(a: Pick<Claim,"workId"|"branch"|"scopes">, b: Pick<Claim,"workId"|"branch"|"scopes">): boolean {
  return a.workId === b.workId || a.branch === b.branch || a.scopes.some(x =>
    b.scopes.some(y => x === y || x.startsWith(y+"/") || y.startsWith(x+"/")));
}
function mutationPathsAllowed(c:Pick<Claim,"scopes">,paths:readonly string[]):boolean {
  return paths.every(p=>c.scopes.some(s=>s==="file:"+p || ("file:"+p).startsWith(s+"/")));
}
function lease(now:number, ms:number):number {
  if (!Number.isSafeInteger(ms) || ms < 1000 || ms > 3600000) throw new Error("INVALID_LEASE");
  return stamp.parse(now+ms);
}
export function transition(input:State, command:Command, now:number):State {
  const s = stateSchema.parse(input);
  stamp.parse(now);
  if (now < s.updatedAt) throw new Error("CLOCK_REGRESSION");
  const revision = stamp.positive().parse(s.revision+1);
  const old = s.claims.find(c => c.workId === command.workId);
  let next:Claim;
  let claims:Claim[];
  if (old?.pendingMutation && command.kind!=="heartbeat" && command.kind!=="mutation-result")
    throw Error("MUTATION_RECONCILIATION_REQUIRED");
  if (command.kind === "claim" || command.kind === "recover") {
    if (command.kind === "claim" && old) throw new Error("ALREADY_CLAIMED");
    if (command.kind === "recover") {
      if (!old || old.generation !== command.previousGeneration || now < old.leaseUntil)
        throw new Error("RECOVERY_NOT_ADMISSIBLE");
      if (old.trace.head !== command.reconciledHead || command.trace.head !== command.reconciledHead ||
          old.branch !== command.branch || old.base !== command.base || old.lot !== command.lot ||
          [...old.scopes].sort().join("|") !== [...command.scopes].sort().join("|"))
        throw new Error("RECONCILIATION_REQUIRED");
    }
    const {workId,actor,session,lot,branch,base,scopes,trace:checkpoint} = command;
    next = claim.parse({workId,actor,session,lot,branch,base,scopes,trace:checkpoint,
      generation:revision,leaseUntil:lease(now,command.leaseMs),updatedAt:now});
    if (command.kind === "claim" && next.trace.head !== next.base) throw new Error("BASE_NOT_RECONCILED");
    if (s.claims.some(c => c !== old && conflicts(c,next))) throw new Error("SCOPE_OCCUPIED");
    claims = [...s.claims.filter(c => c !== old),next];
  } else if(command.kind==="mutation-intent" || command.kind==="mutation-result") {
    if(!old || old.actor!==command.actor || old.session!==command.session || old.generation!==command.generation)
      throw Error("STALE_OR_EXPIRED_CLAIM");
    if(command.kind==="mutation-intent"){
      const m=pendingMutationSchema.parse(command.mutation);
      if(now>=old.leaseUntil || old.pendingMutation || m.expectedHead!==old.trace.head || !mutationPathsAllowed(old,m.paths))
        throw Error("MUTATION_NOT_ADMISSIBLE");
      next=claim.parse({...old,updatedAt:now,pendingMutation:m});
    }else{
      const m=old.pendingMutation;
      if(!m || m.candidateHead!==command.candidateHead ||
         (command.observedHead!==m.expectedHead && command.observedHead!==m.candidateHead) ||
         command.trace.head!==command.observedHead || !command.trace.evidence.includes("commit:"+command.observedHead))
        throw Error("MUTATION_RESULT_NOT_ADMISSIBLE");
      // A trusted gateway can settle a confirmed terminal outcome even after
      // expiry. Preserve original lease and updatedAt so recovery remains explicit.
      const {pendingMutation: _pending,...rest}=old;
      next=claim.parse({...rest,trace:command.trace});
    }
    claims=[...s.claims.filter(c=>c!==old),next];
  } else {
    if (!old || old.actor !== command.actor || old.session !== command.session ||
        old.generation !== command.generation || now >= old.leaseUntil) throw new Error("STALE_OR_EXPIRED_CLAIM");
    next = claim.parse({...old,updatedAt:now,
      ...(command.kind === "heartbeat" ? {leaseUntil:lease(now,command.leaseMs)} : {trace:command.trace})});
    claims = s.claims.filter(c => c !== old);
    if (command.kind !== "release") claims.push(next);
  }
  return stateSchema.parse({...s,continuity:CONTINUITY_ID,revision,updatedAt:now,claims,
    lastEvent:{revision,kind:command.kind,at:now,workId:next.workId,actor:next.actor,
      session:next.session,generation:next.generation,trace:next.trace,
      ...(command.kind === "recover" ? {previousGeneration:command.previousGeneration} : {})}});
}

export interface ClaimStore {
  read(): Promise<{version:string; state:State}>;
  // Must commit exactly one successor to version or reject, without force.
  compareAndSwap(version:string,state:State):Promise<string>;
}
export async function applyCommand(store:ClaimStore,command:Command,now:number):Promise<{version:string;state:State}> {
  const current = await store.read();
  const next = transition(current.state,command,now);
  const version = await store.compareAndSwap(current.version,next);
  return {version,state:next};
}

// Call before each governed mutation. This is a fencing check, not a substitute
// for a mutation gateway that enforces the same generation atomically.
export function assertFence(state:State,identity:Identity,now:number):Claim {
  stamp.parse(now);
  const s = stateSchema.parse(state);
  const c = s.claims.find(x => x.workId === identity.workId);
  if (now < s.updatedAt || !c || c.pendingMutation || c.actor !== identity.actor || c.session !== identity.session ||
      c.generation !== identity.generation || now >= c.leaseUntil) throw new Error("STALE_OR_EXPIRED_CLAIM");
  return c;
}

export type GitHubRequest = (method:"GET"|"POST"|"PATCH",path:string,body?:unknown)=>Promise<unknown>;
const refPath = "/git/refs/heads/coordination/sadiaaf-agent-state";
const statePath = "agent-claims.json";
const refResponse = z.object({object:z.object({sha})});
const shaResponse = z.object({sha});
const contentsResponse = z.object({encoding:z.literal("base64"),content:z.string()});

// Native GitHub Git Data API. The caller binds the request to this repository,
// authenticates the actor and supplies a trusted clock. The separate operational
// ref must be explicitly initialized and protected against deletion/force push.
// It is not a roadmap, task queue or source of truth for business data.
export class GitHubClaimStore implements ClaimStore {
  constructor(private readonly request:GitHubRequest) {}
  async read():Promise<{version:string;state:State}> {
    const version = refResponse.parse(await this.request("GET","/git/ref/heads/coordination/sadiaaf-agent-state")).object.sha;
    const raw = contentsResponse.parse(await this.request("GET","/contents/"+statePath+"?ref="+version));
    const state = stateSchema.parse(JSON.parse(Buffer.from(raw.content,"base64").toString("utf8")));
    return {version,state};
  }
  async compareAndSwap(version:string,state:State):Promise<string> {
    sha.parse(version);
    const next = stateSchema.parse(state);
    const current = await this.read();
    if (current.version !== version || next.revision !== current.state.revision+1 || next.updatedAt < current.state.updatedAt)
      throw new Error("CLAIM_CAS_CONFLICT");
    const tree = shaResponse.parse(await this.request("POST","/git/trees",{
      tree:[{path:statePath,mode:"100644",type:"blob",content:JSON.stringify(next)+"\n"}]
    })).sha;
    const commit = shaResponse.parse(await this.request("POST","/git/commits",{
      message:"coordination: "+next.lastEvent?.kind+" "+next.lastEvent?.workId,
      tree,parents:[version]
    })).sha;
    // Concurrent siblings cannot both fast-forward the ref. No automatic retry
    // after a failed or ambiguous write: re-read and reconcile before proceeding.
    const observed = refResponse.parse(await this.request("PATCH",refPath,{sha:commit,force:false})).object.sha;
    if (observed !== commit) throw new Error("CLAIM_CAS_UNCONFIRMED");
    return commit;
  }
}


/**
 * One bounded pass of the EXISTING development loop, not a scheduler, task
 * queue, or model client. A trusted caller must bind the authenticated actor,
 * trusted clock, protected ClaimStore, live canonical selector and actual
 * coding executor. Selection is repeated after each completed/blocked unit.
 * A failed/ambiguous execution deliberately retains the claim for reconciliation.
 */
export type WorkCandidate = Omit<Admission,"actor"|"session">;
export type WorkPassResult = {outcome:"completed"|"blocked"; trace:Trace};
export interface ClaimedWorkContext {
  claim:Claim;
  assertCurrent():Promise<Claim>;
  heartbeat():Promise<void>;
  checkpoint(value:Trace):Promise<void>;
}
export interface WorkPassPorts {
  store:ClaimStore;
  actor:string;
  session:string;
  now():number;
  leaseMs:number;
  maxUnits:number;
  selectNext(finished:readonly string[]):Promise<WorkCandidate|null>;
  execute(context:ClaimedWorkContext):Promise<WorkPassResult>;
}
export async function runClaimedWorkPass(ports:WorkPassPorts):Promise<{
  stop:"no-work"|"limit"; finished:string[];
}> {
  id.parse(ports.actor);
  id.parse(ports.session);
  if (!Number.isSafeInteger(ports.maxUnits) || ports.maxUnits < 1 || ports.maxUnits > 10)
    throw new Error("INVALID_WORK_PASS_LIMIT");
  lease(stamp.parse(ports.now()),ports.leaseMs);
  const finished:string[] = [];
  for (let i=0;i<ports.maxUnits;i++) {
    // The trusted selector must reconcile GitHub, actual dependencies, owners,
    // branch heads and authorization anew on every call. No local task list.
    const candidate = await ports.selectNext([...finished]);
    if (!candidate) return {stop:"no-work",finished};
    if (finished.includes(candidate.workId)) throw new Error("WORK_ALREADY_ATTEMPTED_IN_PASS");
    const admission = await applyCommand(ports.store,{
      ...candidate,kind:"claim",actor:ports.actor,session:ports.session,leaseMs:ports.leaseMs
    },ports.now());
    const acquired = admission.state.claims.find(c=>c.workId===candidate.workId);
    if (!acquired) throw new Error("CLAIM_NOT_CONFIRMED");
    const owner:Identity = {workId:acquired.workId,actor:acquired.actor,
      session:acquired.session,generation:acquired.generation};
    const assertCurrent = async()=>assertFence((await ports.store.read()).state,owner,ports.now());
    const context:ClaimedWorkContext = {
      claim:acquired,
      assertCurrent,
      async heartbeat(){
        await applyCommand(ports.store,{kind:"heartbeat",...owner,leaseMs:ports.leaseMs},ports.now());
      },
      async checkpoint(value){
        await applyCommand(ports.store,{kind:"checkpoint",...owner,trace:value},ports.now());
      }
    };
    // This is only a pre-dispatch check. The real executor's mutation gateway
    // must enforce fencing at EACH write. Do not interpret this callback as
    // atomic authorization of an external GitHub mutation.
    await assertCurrent();
    const result = await ports.execute(context);
    if (result.outcome!=="completed" && result.outcome!=="blocked")
      throw new Error("INVALID_WORK_PASS_RESULT");
    const proof = trace.parse(result.trace);
    if (proof.evidence.length===0) throw new Error("WORK_PASS_EVIDENCE_REQUIRED");
    await context.checkpoint(proof);
    await applyCommand(ports.store,{kind:"release",...owner,trace:proof},ports.now());
    // 'completed' means this bounded unit has returned, not that a whole
    // lot, PR, CI, source or production release has been certified DONE.
    finished.push(candidate.workId);
  }
  return {stop:"limit",finished};
}


/** Event admission is a port of the existing director, not another queue.
 * The trusted transport verifies delivery, derives the semantic event key
 * (e.g. CI run + attempt), and re-reads the live GitHub object before returning
 * true. Never accept arbitrary webhook text or a client-supplied "verified" flag.
 */
export interface DirectorWakePorts extends WorkPassPorts {
  verifySignal(signal:WakeSignal):Promise<boolean>;
}
type WakeResult =
  | {status:"duplicate"|"reconciliation-required"; finished:string[]}
  | {status:"executed"; stop:"no-work"|"limit"; finished:string[]};

function wakeState(s:State, r:WakeReceipt, kind:"wake-accepted"|"wake-intent"|"wake-result", now:number):State {
  stamp.parse(now);
  if (now < s.updatedAt) throw new Error("CLOCK_REGRESSION");
  const revision=stamp.positive().parse(s.revision+1);
  const receipts=s.wakeReceipts??[];
  const existing=receipts.find(x=>x.signal.key===r.signal.key);
  if (kind==="wake-accepted" || (kind==="wake-intent" && !existing)) {
    if (existing || receipts.length>=4096) throw new Error("WAKE_ADMISSION_CLOSED");
  } else if (kind==="wake-intent") {
    if (!existing || existing.outcome!=="accepted" || !sameWake(existing.signal,r.signal) ||
        r.outcome!=="pending" || r.intentRevision!==revision) throw new Error("DEFERRED_WAKE_NOT_ADMISSIBLE");
  } else if (!existing || existing.outcome!=="pending" || existing.intentRevision!==r.intentRevision ||
    existing.actor!==r.actor || existing.session!==r.session) throw new Error("WAKE_RESULT_NOT_ADMISSIBLE");
  return stateSchema.parse({...s,revision,updatedAt:now,
    wakeReceipts:[...receipts.filter(x=>x.signal.key!==r.signal.key),r],
    lastEvent:{revision,kind,at:now,workId:"director",actor:r.actor,session:r.session,
      generation:r.intentRevision,wakeKey:r.signal.key,
      trace:{head:r.signal.head,nextAction:kind==="wake-accepted"?"Dispatch durable accepted wake":kind==="wake-intent"?"Execute reconciled bounded pass":"Reconcile next admissible work",
        evidence:[r.signal.evidence]}}});
}
export async function runDirectorWake(raw:WakeSignal, ports:DirectorWakePorts):Promise<WakeResult> {
  const signal=wakeSignalSchema.parse(raw);
  id.parse(ports.actor);id.parse(ports.session);
  if (await ports.verifySignal(signal)!==true) throw new Error("UNVERIFIED_WAKE_SIGNAL");
  const current=await ports.store.read();
  const s=stateSchema.parse(current.state);
  const previous=s.wakeReceipts?.find(r=>r.signal.key===signal.key);
  if (previous) {
    if (previous.signal.kind!==signal.kind || previous.signal.head!==signal.head || previous.signal.evidence!==signal.evidence)
      throw new Error("WAKE_KEY_CONFLICT");
    return {status:previous.outcome==="pending"||previous.outcome==="accepted"?"reconciliation-required":"duplicate",finished:[...previous.finished]};
  }
  const startedAt=ports.now();
  const receipt:WakeReceipt={signal,actor:ports.actor,session:ports.session,startedAt,
    intentRevision:s.revision+1,outcome:"pending",finished:[]};
  // Persist the intention BEFORE any selector/executor call. A failed CAS
  // or an ambiguous transport response must never authorize dispatch.
  await ports.store.compareAndSwap(current.version,wakeState(s,receipt,"wake-intent",startedAt));
  const result=await runClaimedWorkPass(ports);
  const after=await ports.store.read();
  const completedAt=ports.now();
  await ports.store.compareAndSwap(after.version,wakeState(stateSchema.parse(after.state),
    {...receipt,outcome:result.stop,finished:result.finished,completedAt},"wake-result",completedAt));
  return {status:"executed",...result};
}
// An interrupted pass or failed result write deliberately leaves a pending
// receipt. Reconcile GitHub, claims and operation proofs before any recovery.
// The bounded receipt window fails closed at capacity; production requires a
// verified history/index strategy before activation. No silent pruning.

function sameWake(a:WakeSignal,b:WakeSignal){
 return a.key===b.key&&a.kind===b.kind&&a.head===b.head&&a.evidence===b.evidence;
}
export interface DeferredWakeAdmissionPorts {
 store:ClaimStore; actor:string; session:string; now():number;
 verifySignal(signal:WakeSignal):Promise<boolean>;
}
// Admission and dispatch share the EXISTING durable receipt registry. An
// accepted receipt has never authorized execution; pending requires explicit
// reconciliation after failure. No second queue or in-memory fire-and-forget.
export async function admitDeferredDirectorWake(raw:WakeSignal,ports:DeferredWakeAdmissionPorts){
 const signal=wakeSignalSchema.parse(raw);id.parse(ports.actor);id.parse(ports.session);
 if(await ports.verifySignal(signal)!==true)throw Error("UNVERIFIED_WAKE_SIGNAL");
 const current=await ports.store.read(),s=stateSchema.parse(current.state);
 const prior=s.wakeReceipts?.find(r=>r.signal.key===signal.key);
 if(prior){
  if(!sameWake(prior.signal,signal))throw Error("WAKE_KEY_CONFLICT");
  return {status:prior.outcome==="pending"?"reconciliation-required" as const:"duplicate" as const,key:signal.key};
 }
 const now=ports.now();
 const receipt:WakeReceipt={signal,actor:ports.actor,session:ports.session,startedAt:now,intentRevision:s.revision+1,outcome:"accepted",finished:[]};
 await ports.store.compareAndSwap(current.version,wakeState(s,receipt,"wake-accepted",now));
 return {status:"accepted" as const,key:signal.key};
}
export function listAcceptedDirectorWakes(state:State):WakeSignal[]{
 return (stateSchema.parse(state).wakeReceipts??[]).filter(r=>r.outcome==="accepted")
  .sort((a,b)=>a.intentRevision-b.intentRevision).map(r=>r.signal);
}
export async function runDeferredDirectorWake(raw:WakeSignal,ports:DirectorWakePorts):Promise<WakeResult>{
 const signal=wakeSignalSchema.parse(raw);id.parse(ports.actor);id.parse(ports.session);
 if(await ports.verifySignal(signal)!==true)throw Error("UNVERIFIED_WAKE_SIGNAL");
 const current=await ports.store.read(),s=stateSchema.parse(current.state);
 const prior=s.wakeReceipts?.find(r=>r.signal.key===signal.key);
 if(!prior||!sameWake(prior.signal,signal))throw Error("DEFERRED_WAKE_NOT_ADMITTED");
 if(prior.outcome!=="accepted")return {status:prior.outcome==="pending"?"reconciliation-required":"duplicate",finished:[...prior.finished]};
 const startedAt=ports.now();
 const receipt:WakeReceipt={signal,actor:ports.actor,session:ports.session,startedAt,intentRevision:s.revision+1,outcome:"pending",finished:[]};
 // A different worker can claim only the accepted receipt. Losing CAS never
 // authorizes selection or execution. Never retry an uncertain intent.
 await ports.store.compareAndSwap(current.version,wakeState(s,receipt,"wake-intent",startedAt));
 const result=await runClaimedWorkPass(ports);
 const after=await ports.store.read(),completedAt=ports.now();
 await ports.store.compareAndSwap(after.version,wakeState(stateSchema.parse(after.state),
  {...receipt,outcome:result.stop,finished:result.finished,completedAt},"wake-result",completedAt));
 return {status:"executed",...result};
}
