import {z} from "zod";
import {applyCommand,assertFence,type Claim,type ClaimStore,type PendingMutation} from "./agentClaims.js";

type Identity=Pick<Claim,"workId"|"actor"|"session"|"generation">;
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const file=z.string().max(295).regex(/^[A-Za-z0-9_.\/-]+$/)
  .refine(p=>!p.split("/").some(x=>x===""||x==="."||x===".."));
const prepared=z.object({
  branch:z.string().max(200).regex(/^[A-Za-z0-9._/-]+$/),
  expectedHead:sha,candidateHead:sha,
  paths:z.array(file).min(1).max(100),
}).strict().refine(p=>p.expectedHead!==p.candidateHead && new Set(p.paths).size===p.paths.length);
export type PreparedMutation=z.infer<typeof prepared>;
export interface MutationGatewayPorts {
  store:ClaimStore;
  now():number;
  // All ports belong to the trusted runtime, never to generated code.
  authenticate(identity:Identity):Promise<boolean>;
  // Verify immutable candidate commit has exactly one parent == expectedHead,
  // exhaustive changed paths (including rename sources), independent tests and
  // authorization/policy. Reject missing or truncated evidence.
  verifyPrepared(candidate:PreparedMutation):Promise<boolean>;
  readHead(branch:string):Promise<string>;
  // Only a non-force update of the given work branch; must enforce expected
  // parent/head, writer isolation, and no hidden retry. No general API proxy.
  publishNonForce(candidate:PreparedMutation):Promise<void>;
  // For interrupted requests: trustworthy proof that the previous publisher
  // is quiescent and no late request can still mutate the ref.
  verifyQuiescence(identity:Identity,mutation:PendingMutation):Promise<boolean>;
}
function owner(c:Claim):Identity {
  return {workId:c.workId,actor:c.actor,session:c.session,generation:c.generation};
}
function sameOwner(c:Claim,i:Identity){
  return c.workId===i.workId && c.actor===i.actor && c.session===i.session && c.generation===i.generation;
}
async function settle(ports:MutationGatewayPorts,c:Claim,m:PendingMutation,observed:string){
  await applyCommand(ports.store,{kind:"mutation-result",...owner(c),
    candidateHead:m.candidateHead,observedHead:observed,
    trace:{head:observed,nextAction:observed===m.candidateHead?"Verify published commit and continue canonical work":"Reconcile task before any new publication",
      evidence:[...new Set([...c.trace.evidence.slice(0,28),"commit:"+observed])]}},ports.now());
}
// A CAS intent survives crashes and prevents recovery/release during a possibly
// in-flight external write. A failed or ambiguous operation is never retried here.
export async function publishClaimedCommit(ports:MutationGatewayPorts,identity:Identity,raw:PreparedMutation){
  const candidate=prepared.parse(raw);
  if(await ports.authenticate(identity)!==true)throw Error("UNAUTHENTICATED_MUTATION");
  const c=assertFence((await ports.store.read()).state,identity,ports.now());
  if(candidate.branch!==c.branch || candidate.expectedHead!==c.trace.head ||
     candidate.paths.some(p=>!c.scopes.some(s=>s==="file:"+p||("file:"+p).startsWith(s+"/"))))
    throw Error("MUTATION_SCOPE_MISMATCH");
  if(await ports.verifyPrepared(candidate)!==true)throw Error("PREPARED_COMMIT_NOT_VERIFIED");
  if(await ports.readHead(c.branch)!==candidate.expectedHead)throw Error("WORK_HEAD_MOVED");
  const m:PendingMutation={expectedHead:candidate.expectedHead,candidateHead:candidate.candidateHead,paths:[...candidate.paths]};
  // CAS is authoritative; competing workers cannot acquire a second intent.
  await applyCommand(ports.store,{kind:"mutation-intent",...owner(c),mutation:m},ports.now());
  // From here all uncertainty retains the intent. No release or recover can
  // race this publication, even if the lease expires. Reconcile explicitly.
  if(await ports.readHead(c.branch)!==m.expectedHead)throw Error("MUTATION_RECONCILIATION_REQUIRED");
  await ports.publishNonForce(candidate);
  if(await ports.readHead(c.branch)!==m.candidateHead)throw Error("MUTATION_RECONCILIATION_REQUIRED");
  await settle(ports,c,m,m.candidateHead);
  return {head:m.candidateHead};
}
export async function reconcileClaimedMutation(ports:MutationGatewayPorts,identity:Identity){
  if(await ports.authenticate(identity)!==true)throw Error("UNAUTHENTICATED_MUTATION");
  const c=(await ports.store.read()).state.claims.find(x=>sameOwner(x,identity));
  const m=c?.pendingMutation;
  if(!c||!m)throw Error("NO_PENDING_MUTATION");
  if(await ports.verifyQuiescence(identity,m)!==true)throw Error("MUTATION_STILL_UNCERTAIN");
  const observed=sha.parse(await ports.readHead(c.branch));
  if(observed!==m.expectedHead && observed!==m.candidateHead)throw Error("MUTATION_HEAD_DIVERGED");
  await settle(ports,c,m,observed);
  return {head:observed,published:observed===m.candidateHead};
}
