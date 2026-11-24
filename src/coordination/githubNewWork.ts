import {z} from "zod";
import {applyCommand,assertFence,transition,type Claim,type ClaimStore,type PendingLifecycle} from "./agentClaims.js";
import {canonicalWorkAdmissionSchema,type CanonicalWorkAdmission} from "./githubSelector.js";

const root="https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline";
const repo=z.object({id:z.literal(1315731572)});
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const branch=z.string().regex(/^work\/sadiaaf-issue-[1-9][0-9]*-[a-z0-9-]+$/).max(200);
const ref=z.object({ref:z.string(),object:z.object({sha,type:z.literal("commit")})});
const pr=z.object({number:z.number().int().positive().safe(),state:z.literal("open"),merged:z.boolean().optional(),draft:z.literal(true),
 body:z.string(),head:z.object({ref:z.string(),sha,repo}),base:z.object({ref:z.literal("main"),repo})});
type Owner=Pick<Claim,"workId"|"actor"|"session"|"generation">;
const owner=(c:Claim):Owner=>({workId:c.workId,actor:c.actor,session:c.session,generation:c.generation});
const same=(a:Owner,b:Owner)=>a.workId===b.workId&&a.actor===b.actor&&a.session===b.session&&a.generation===b.generation;
export interface NewWorkConfig{
 store:ClaimStore;now():number;branchToken:string;prToken:string;fetcher?:typeof fetch;timeoutMs?:number;
 authenticate(identity:Owner):Promise<boolean>;
 readAdmission(workId:string):Promise<unknown>;
 verifyWriterIsolation(branch:string):Promise<boolean>;
 verifyPublishedCandidate(claim:Claim):Promise<boolean>;
 // Must prove old request terminal and writer stopped, not merely lease expiry.
 verifyQuiescence(identity:Owner,operation:PendingLifecycle):Promise<boolean>;
 // Independent evidence of terminal absence; not a model-supplied callback.
 verifyAbsentEffect?(claim:Readonly<Claim>,operation:Readonly<PendingLifecycle>,evidence:readonly string[]):Promise<boolean>;
}
export function createGitHubNewWork(config:NewWorkConfig){
 const token=z.string().min(1).max(4096).regex(/^[A-Za-z0-9_.-]+$/);
 const bt=token.parse(config.branchToken),pt=token.parse(config.prToken);
 if(bt===pt)throw Error("LIFECYCLE_CREDENTIAL_SEPARATION_REQUIRED");
 const timeout=config.timeoutMs??15000;
 if(!Number.isSafeInteger(timeout)||timeout<100||timeout>60000)throw Error("LIFECYCLE_TIMEOUT_INVALID");
 const send=config.fetcher??fetch;
 async function request(method:"GET"|"POST",path:string,credential:string,body?:unknown,allow404=false):Promise<unknown>{
  let response:Response;
  try{response=await send(root+path,{method,redirect:"error",signal:AbortSignal.timeout(timeout),
   headers:{Authorization:"Bearer "+credential,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(body===undefined?{}:{"Content-Type":"application/json"})},
   ...(body===undefined?{}:{body:JSON.stringify(body)})});}
  catch{throw Error("LIFECYCLE_TRANSPORT_UNCONFIRMED");}
  if(allow404&&method==="GET"&&response.status===404)return null;
  if(!response.ok)throw Error("LIFECYCLE_HTTP_"+response.status);
  if(response.headers.get("link")?.includes('rel="next"'))throw Error("LIFECYCLE_PAGINATED");
  try{return await response.json();}catch{throw Error("LIFECYCLE_RESPONSE_UNCONFIRMED");}
 }
 async function getHead(b:string){
  const result=await request("GET","/git/ref/heads/"+branch.parse(b),bt,undefined,true);
  if(result===null)return null;
  const x=ref.parse(result);if(x.ref!=="refs/heads/"+b)throw Error("LIFECYCLE_REF_MISMATCH");return x.object.sha;
 }
 const marker=(c:Claim,issue:number)=>"SADIAAF-CONTINUITY-20261124-01\nWork: "+c.workId+"\nIssue: #"+issue+"\nHead: "+c.trace.head;
 async function readPr(c:Claim,issue:number){
  const query="?state=all&head="+encodeURIComponent("Patricked-code:"+c.branch)+"&base=main&per_page=100";
  const list=z.array(z.unknown()).max(99).parse(await request("GET","/pulls"+query,pt));
  if(list.length===0)return null;
  if(list.length!==1)throw Error("LIFECYCLE_PR_AMBIGUOUS");
  const p=pr.parse(list[0]);if(p.head.ref!==c.branch||p.head.sha!==c.trace.head||p.body!==marker(c,issue)||p.merged===true)
   throw Error("LIFECYCLE_PR_MISMATCH");
  return p.number;
 }
 async function checkAdmission(c:Claim):Promise<CanonicalWorkAdmission>{
  const a=canonicalWorkAdmissionSchema.parse(await config.readAdmission(c.workId));
  if(a.pr!==null||a.workId!==c.workId||a.branch!==c.branch||a.head!==c.base||a.lot!==c.lot||
    JSON.stringify([...a.scopes].sort())!==JSON.stringify([...c.scopes].sort()))throw Error("LIFECYCLE_ADMISSION_MISMATCH");
  repo.parse(await request("GET","",bt));
  const main=z.object({name:z.literal("main"),protected:z.literal(true),commit:z.object({sha})}).parse(await request("GET","/branches/main",bt));
  if(main.commit.sha!==a.mainSha)throw Error("LIFECYCLE_MAIN_MOVED");
  if(await config.verifyWriterIsolation(c.branch)!==true)throw Error("LIFECYCLE_WRITER_ISOLATION_REQUIRED");
  return a;
 }
 async function finish(c:Claim,o:PendingLifecycle,n?:number){
  await applyCommand(config.store,{kind:"lifecycle-result",...owner(c),operation:o,...(n===undefined?{}:{prNumber:n}),
   trace:{head:o.head,nextAction:n===undefined?"Prepare admitted candidate":"Run CI on admitted draft PR",
    evidence:[...new Set([...c.trace.evidence.slice(0,27),"commit:"+o.head,...(n===undefined?[]:["pr:"+n])])]}},config.now());
 }
 async function start(identity:Owner,kind:"branch"|"pr"){
  if(await config.authenticate(identity)!==true)throw Error("LIFECYCLE_UNAUTHENTICATED");
  const c=assertFence((await config.store.read()).state,identity,config.now()),a=await checkAdmission(c);
  if(kind==="branch"){
   if(c.trace.head!==a.mainSha||await getHead(c.branch)!==null)throw Error("LIFECYCLE_BRANCH_RECONCILIATION_REQUIRED");
  }else{
   if(c.trace.head===a.mainSha||await getHead(c.branch)!==c.trace.head||await config.verifyPublishedCandidate(c)!==true||await readPr(c,a.issue)!==null)
    throw Error("LIFECYCLE_PR_RECONCILIATION_REQUIRED");
  }
  const o:PendingLifecycle={kind,head:c.trace.head,issue:a.issue};
  await applyCommand(config.store,{kind:"lifecycle-intent",...identity,operation:o},config.now());
  await checkAdmission(c);
  const live=(await config.store.read()).state.claims.find(x=>same(x,identity));
  if(!live||JSON.stringify(live.pendingLifecycle)!==JSON.stringify(o)||config.now()>=live.leaseUntil)
   throw Error("LIFECYCLE_DISPATCH_UNCONFIRMED");
  if(kind==="branch"){
   if(await getHead(c.branch)!==null)throw Error("LIFECYCLE_BRANCH_RECONCILIATION_REQUIRED");
   const created=ref.parse(await request("POST","/git/refs",bt,{ref:"refs/heads/"+c.branch,sha:o.head}));
   if(created.ref!=="refs/heads/"+c.branch||created.object.sha!==o.head||await getHead(c.branch)!==o.head)
    throw Error("LIFECYCLE_BRANCH_UNCONFIRMED");
   await finish(c,o);return {head:o.head};
  }
  if(await getHead(c.branch)!==o.head||await readPr(c,a.issue)!==null||await config.verifyPublishedCandidate(c)!==true)
   throw Error("LIFECYCLE_PR_RECONCILIATION_REQUIRED");
  const created=pr.parse(await request("POST","/pulls",pt,{head:c.branch,base:"main",draft:true,
   title:"SadiaAF: governed work "+c.workId,body:marker(c,a.issue)}));
  if(created.head.ref!==c.branch||created.head.sha!==o.head||created.body!==marker(c,a.issue)||await readPr(c,a.issue)!==created.number)
   throw Error("LIFECYCLE_PR_UNCONFIRMED");
  await finish(c,o,created.number);return {head:o.head,prNumber:created.number};
 }
 return {createBranch:(i:Owner)=>start(i,"branch"),createDraftPr:(i:Owner)=>start(i,"pr"),
  async reconcileAbsent(i:Owner,rawEvidence:readonly string[]){
   const evidence=z.array(z.string().regex(/^(?:issue|pr|ci):[1-9][0-9]{0,19}$/)).min(1).max(20).parse(rawEvidence);
   if(new Set(evidence).size!==evidence.length)throw Error("LIFECYCLE_ABSENCE_EVIDENCE_INVALID");
   if(await config.authenticate(i)!==true)throw Error("LIFECYCLE_UNAUTHENTICATED");
   const snapshot=await config.store.read(),c=snapshot.state.claims.find(x=>same(x,i)),o=c?.pendingLifecycle;
   if(!c||!o||(o.kind!=="branch"&&o.kind!=="pr")||await config.verifyQuiescence(i,o)!==true)throw Error("LIFECYCLE_STILL_UNCERTAIN");
   if(!config.verifyAbsentEffect)throw Error("LIFECYCLE_ABSENCE_PROOF_REQUIRED");
   const absent=async()=>{
    repo.parse(await request("GET","",bt));
    if(await config.verifyWriterIsolation(c.branch)!==true)throw Error("LIFECYCLE_WRITER_ISOLATION_REQUIRED");
    const observed=await getHead(c.branch);
    if(o.kind==="branch")return observed===null&&await readPr(c,o.issue)===null;
    return observed===o.head&&await readPr(c,o.issue)===null;
   };
   if(!await absent())throw Error("LIFECYCLE_EFFECT_NOT_ABSENT");
   if(await config.verifyAbsentEffect(structuredClone(c),structuredClone(o),[...evidence])!==true)
    throw Error("LIFECYCLE_ABSENCE_PROOF_DENIED");
   if(!await absent()||await config.verifyQuiescence(i,o)!==true)throw Error("LIFECYCLE_ABSENCE_CHANGED");
   const next=transition(snapshot.state,{kind:"lifecycle-absent",...i,operation:o,
    trace:{head:o.head,nextAction:"Reconcile fresh canonical admission before any new operation",
     evidence:[...new Set([...evidence,"commit:"+o.head,...c.trace.evidence.slice(0,9)])]}},config.now());
   // Bind proof and absence observation to the original state version.
   // No external mutation, no retry, and no clearing a newer intent.
   await config.store.compareAndSwap(snapshot.version,next);
   return {status:"absent" as const,head:o.head};
  },
  async reconcile(i:Owner){
   if(await config.authenticate(i)!==true)throw Error("LIFECYCLE_UNAUTHENTICATED");
   const c=(await config.store.read()).state.claims.find(x=>same(x,i)),o=c?.pendingLifecycle;
   if(!c||!o||(o.kind!=="branch"&&o.kind!=="pr")||await config.verifyQuiescence(i,o)!==true)throw Error("LIFECYCLE_STILL_UNCERTAIN");
   if(await config.verifyWriterIsolation(c.branch)!==true||await getHead(c.branch)!==o.head)throw Error("LIFECYCLE_HEAD_UNCONFIRMED");
   const n=o.kind==="pr"?await readPr(c,o.issue):undefined;
   if(o.kind==="pr"&&n===null)throw Error("LIFECYCLE_PR_UNCONFIRMED");
   await finish(c,o,n??undefined);
   return {head:o.head,...(n==null?{}:{prNumber:n})};
  }};
}
// No direct main mutation, branch deletion, merge or auto-merge activation.
// Absent/ambiguous effects stay pending until explicit evidence-based reconciliation.
