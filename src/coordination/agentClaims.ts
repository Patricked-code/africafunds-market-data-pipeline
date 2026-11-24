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
const claim = z.object({
  workId: id, actor: id, session: id, lot: z.number().int().min(0).max(13),
  branch: z.string().min(1).max(200).regex(/^[A-Za-z0-9._/-]+$/)
    .refine(b => b !== "main" && !b.startsWith("coordination/") && !b.includes("..")),
  base: sha, scopes: z.array(scope).min(1).max(100),
  generation: stamp.positive(), leaseUntil: stamp, updatedAt: stamp,
  trace,
}).strict();
const event = z.object({
  revision: stamp.positive(), kind: z.enum(["claim","heartbeat","checkpoint","release","recover"]),
  at: stamp, workId: id, actor: id, session: id, generation: stamp.positive(),
  previousGeneration: stamp.positive().optional(), trace,
}).strict();
export const stateSchema = z.object({
  continuity: z.literal(CONTINUITY_ID), revision: stamp, updatedAt: stamp,
  claims: z.array(claim), lastEvent: event.nullable(),
}).strict().superRefine((s,ctx) => {
  const fail = (message: string) => ctx.addIssue({code:"custom",message});
  if ((s.revision === 0) !== (s.lastEvent === null) ||
      (s.lastEvent && (s.lastEvent.revision !== s.revision || s.lastEvent.at !== s.updatedAt))) fail("invalid event revision");
  for (const [i,a] of s.claims.entries()) {
    if (a.generation > s.revision || a.updatedAt > s.updatedAt || a.leaseUntil <= a.updatedAt ||
        new Set(a.scopes).size !== a.scopes.length) fail("invalid claim state");
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
  | ({kind:"release"; trace:Trace} & Identity);

export function emptyState(): State {
  return {continuity:CONTINUITY_ID,revision:0,updatedAt:0,claims:[],lastEvent:null};
}
function conflicts(a: Pick<Claim,"workId"|"branch"|"scopes">, b: Pick<Claim,"workId"|"branch"|"scopes">): boolean {
  return a.workId === b.workId || a.branch === b.branch || a.scopes.some(x =>
    b.scopes.some(y => x === y || x.startsWith(y+"/") || y.startsWith(x+"/")));
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
  } else {
    if (!old || old.actor !== command.actor || old.session !== command.session ||
        old.generation !== command.generation || now >= old.leaseUntil) throw new Error("STALE_OR_EXPIRED_CLAIM");
    next = claim.parse({...old,updatedAt:now,
      ...(command.kind === "heartbeat" ? {leaseUntil:lease(now,command.leaseMs)} : {trace:command.trace})});
    claims = s.claims.filter(c => c !== old);
    if (command.kind !== "release") claims.push(next);
  }
  return stateSchema.parse({continuity:CONTINUITY_ID,revision,updatedAt:now,claims,
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
  if (now < s.updatedAt || !c || c.actor !== identity.actor || c.session !== identity.session ||
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
    const version = refResponse.parse(await this.request("GET",refPath)).object.sha;
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
