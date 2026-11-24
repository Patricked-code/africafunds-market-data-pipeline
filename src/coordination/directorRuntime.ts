import {z} from "zod";
import {GitHubClaimStore,createAdmissionHistoryPort,listAcceptedDirectorWakes,runDeferredDirectorWake,type WakeSignal,type ClaimStore,type ClaimedWorkContext,type WorkPassResult} from "./agentClaims.js";
import {createGitHubRequest} from "./githubTransport.js";
import {createCanonicalAdmissionLoader,verifyAdmissionHistoryAdvance} from "./githubAdmissions.js";
import {createGitHubWorkSelector,type CanonicalWorkAdmission} from "./githubSelector.js";
import {runGitHubDirectorWake,deriveGitHubWake,type GitHubDirectorEvent} from "./githubDirector.js";
import type {createGitHubAppIdentity} from "./githubIdentity.js";
import {createGitHubSourceReader} from "./githubSource.js";
import {createLocalModelCoder,prepareCodingCandidate,type CodingResult} from "./modelCoder.js";
import {createDatesValidationPort,DATES_ACCEPTANCE,datesValidationSuite} from "./isolatedValidation.js";
import {createGitHubValidationEvidence} from "./githubValidationEvidence.js";
import {createGitHubCommitBuilder} from "./githubCommitBuilder.js";
import {createGitHubPublicationPort} from "./githubPublication.js";
import {publishClaimedCommit,type PreparedMutation} from "./mutationGateway.js";
import {createGitHubNewWork} from "./githubNewWork.js";

type Validated=Extract<CodingResult,{outcome:"validated"}>;
const positive=z.number().int().positive().safe();
const sessionSchema=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
const mainSchema=z.object({name:z.literal("main"),protected:z.literal(true),commit:z.object({sha:z.string().regex(/^[a-f0-9]{40}$/)})});
const prSchema=z.object({number:positive,state:z.literal("open"),merged:z.literal(false),
 base:z.object({ref:z.literal("main"),repo:z.object({id:z.literal(1315731572)})}),
 head:z.object({ref:z.string(),sha:z.string(),repo:z.object({id:z.literal(1315731572)})})});
export interface ExistingPrExecutorPorts {
 prepare(context:ClaimedWorkContext):Promise<CodingResult>;
 build(context:ClaimedWorkContext,result:Validated):Promise<PreparedMutation>;
 publish(context:ClaimedWorkContext,candidate:PreparedMutation,result:Validated):Promise<{head:string}>;
 // Present only for an explicitly admitted new branch. The existing
 // lifecycle ports persist intents and fence all writes.
 lifecycle?:{
  createBranch(context:ClaimedWorkContext):Promise<{head:string}>;
  createDraftPr(context:ClaimedWorkContext,candidate:PreparedMutation):Promise<{head:string;prNumber:number}>;
 };
}
export function createExistingPrExecutor(ports:ExistingPrExecutorPorts){
 return async(context:ClaimedWorkContext):Promise<WorkPassResult>=>{
  const result=await ports.prepare(context);
  if(result.outcome==="blocked")return {outcome:"blocked",trace:{
   head:context.claim.trace.head,nextAction:"Reconcile rejected model candidate before renewed admission",
   evidence:[result.red.evidence]}};
  if(ports.lifecycle){
   const branch=await ports.lifecycle.createBranch(context);
   if(branch.head!==result.head)throw Error("DIRECTOR_BRANCH_UNCONFIRMED");
  }
  const candidate=await ports.build(context,result);
  const published=await ports.publish(context,candidate,result);
  if(published.head!==candidate.candidateHead)throw Error("DIRECTOR_PUBLICATION_UNCONFIRMED");
  const opened=ports.lifecycle?await ports.lifecycle.createDraftPr(context,candidate):null;
  if(opened&&(opened.head!==published.head||!positive.safeParse(opened.prNumber).success))throw Error("DIRECTOR_DRAFT_PR_UNCONFIRMED");
  return {outcome:"completed",trace:{head:published.head,nextAction:"Reconcile exact PR CI and governed integration",
   evidence:[...new Set([result.red.evidence,result.green.evidence,"commit:"+published.head,...(opened?["pr:"+opened.prNumber]:[])])]}};
 };
}
export function supportedExistingPrAdmissions(admissions:readonly CanonicalWorkAdmission[]){
 // Explicit bounded first recipe, not a claim of general coding coverage.
 return admissions.filter(a=>a.pr!==null&&a.acceptance===DATES_ACCEPTANCE&&
  a.scopes.length===1&&a.scopes[0]==="file:src/utils/dates.ts");
}
export function supportedDirectorAdmissions(admissions:readonly CanonicalWorkAdmission[]){
 return admissions.filter(a=>a.acceptance===DATES_ACCEPTANCE&&a.scopes.length===1&&
  a.scopes[0]==="file:src/utils/dates.ts");
}
export interface DirectorRuntimeConfig {
 identity:ReturnType<typeof createGitHubAppIdentity>;
 session:string;
 coordinationRulesetId:number;
 imageId:string;
 now():number;
 leaseMs:number;
 maxUnits:number;
 fetcher?:typeof fetch;
 // These are trusted runtime policy/evidence ports, not client booleans.
 verifyCoordinationIsolation(actor:string):Promise<boolean>;
 verifyWriterIsolation(branch:string,actor:string):Promise<boolean>;
 verifyAdmissionHistory():Promise<boolean>;
 evidenceAppId:number;
 evidenceBotUserId:number;
 verifyCandidatePolicy(candidate:PreparedMutation,result:Validated):Promise<boolean>;
 authenticateDelivery(event:GitHubDirectorEvent):Promise<boolean>;
}
// Connect existing modules for one authenticated wake. New branch and draft
// PR use the governed lifecycle, only for admitted supported tasks.
// No scheduler, ready/merge action, admin mutation or implicit recovery.
export function eventFromAcceptedWake(signal:WakeSignal):GitHubDirectorEvent{
 const number=(s:string)=>positive.parse(Number(s));
 if(signal.kind==="ci-completed"){
  const m=/^ci:([1-9][0-9]*):([1-9][0-9]*)$/.exec(signal.key);
  if(!m||signal.evidence!=="ci:"+m[1])throw Error("DEFERRED_EVENT_IDENTITY_INVALID");
  return {kind:"workflow-completed",runId:number(m[1]!),attempt:number(m[2]!),head:signal.head};
 }
 if(signal.kind==="pr-merged"){
  const m=/^pr:([1-9][0-9]*):([a-f0-9]{40})$/.exec(signal.key);
  if(!m||signal.evidence!=="pr:"+m[1]||signal.head!==m[2])throw Error("DEFERRED_EVENT_IDENTITY_INVALID");
  return {kind:"pr-merged",number:number(m[1]!),mergeSha:signal.head};
 }
 throw Error("DEFERRED_EVENT_KIND_UNSUPPORTED");
}
export async function runExistingPrDirector(event:GitHubDirectorEvent,config:DirectorRuntimeConfig){
 return runDirector(config,event);
}
// A trusted worker invokes this entrypoint; the protected state itself is
// the admitted source, not an externally supplied event or receipt.
export async function runAcceptedExistingPrDirector(config:DirectorRuntimeConfig){
 return runDirector(config,null);
}
async function runDirector(config:DirectorRuntimeConfig,event:GitHubDirectorEvent|null){
 sessionSchema.parse(config.session);positive.parse(config.coordinationRulesetId);
 if(!Number.isSafeInteger(config.leaseMs)||config.leaseMs<1000||config.leaseMs>3600000||
  !Number.isSafeInteger(config.maxUnits)||config.maxUnits<1||config.maxUnits>10)
  throw Error("DIRECTOR_RUNTIME_LIMIT_INVALID");
 const actor=config.identity.actor;
 if(event!==null&&await config.authenticateDelivery(event)!==true)throw Error("UNAUTHENTICATED_DELIVERY");
 if(await config.verifyCoordinationIsolation(actor)!==true)throw Error("DIRECTOR_COORDINATION_ISOLATION_REQUIRED");
 if(await config.verifyAdmissionHistory()!==true)throw Error("DIRECTOR_ADMISSION_HISTORY_REQUIRED");
 const readCredential=await config.identity.issue("read"),writer=await config.identity.issue("publish"),evidenceCredential=await config.identity.issue("evidence");
 if(readCredential.actor!==actor||writer.actor!==actor||evidenceCredential.actor!==actor||
  new Set([readCredential.token,writer.token,evidenceCredential.token]).size!==3||
  !actor.startsWith("github-app:"+positive.parse(config.evidenceAppId)+":installation:"))throw Error("DIRECTOR_IDENTITY_MISMATCH");
 const network=config.fetcher??fetch;
 const scopedFetch=(expiresAt:number):typeof fetch=>async(input,init)=>{
  if(!Number.isSafeInteger(config.now())||config.now()+30000>=expiresAt)throw Error("DIRECTOR_CREDENTIAL_EXPIRED");
  return network(input,init);
 };
 const readFetch=scopedFetch(readCredential.expiresAt),writeFetch=scopedFetch(writer.expiresAt);
 const readRequest=createGitHubRequest({token:readCredential.token,fetcher:readFetch});
 const readGitHub=(path:string)=>readRequest("GET",path);
 const writeRequest=createGitHubRequest({token:writer.token,coordinationRulesetId:config.coordinationRulesetId,fetcher:writeFetch});
 const remote=new GitHubClaimStore(writeRequest);
 const store:ClaimStore={read:()=>remote.read(),async compareAndSwap(version,state){
  if(await config.verifyCoordinationIsolation(actor)!==true)throw Error("DIRECTOR_COORDINATION_ISOLATION_REQUIRED");
  return remote.compareAndSwap(version,state);
 }};
 const history=createAdmissionHistoryPort({store,actor,session:config.session,now:config.now,
  async authenticate(){return await config.verifyCoordinationIsolation(actor)===true&&await config.verifyAdmissionHistory()===true;},
  async verifyEmptyHistory(){return false;}, // explicit supervisor-only initialization, never bootstrap on wake
  verifyPrefixAdvance:(expected,next)=>verifyAdmissionHistoryAdvance(readGitHub,expected,next)});
 const load=createCanonicalAdmissionLoader(readGitHub,history);
 const admissions=async(main:string)=>{
  if(await config.verifyAdmissionHistory()!==true)throw Error("DIRECTOR_ADMISSION_HISTORY_REQUIRED");
  return supportedDirectorAdmissions(await load(main));
 };
 const readAdmission=async(workId:string)=>{
  const main=mainSchema.parse(await readGitHub("/branches/main")).commit.sha;
  return (await admissions(main)).find(a=>a.workId===workId)??null;
 };
 const readSource=createGitHubSourceReader({token:readCredential.token,fetcher:readFetch});
 const evidence=createGitHubValidationEvidence({token:evidenceCredential.token,appId:config.evidenceAppId,
  botUserId:positive.parse(config.evidenceBotUserId),expectedSuite:datesValidationSuite(config.imageId),fetcher:scopedFetch(evidenceCredential.expiresAt)});
 const validate=createDatesValidationPort({imageId:config.imageId,readSource,persistEvidence:evidence.persistEvidence});
 const model=createLocalModelCoder(); // loopback only; no GitHub credentials
 const execute=async(context:ClaimedWorkContext)=>{
  const initial=await readAdmission(context.claim.workId);
  if(!initial)throw Error("DIRECTOR_ADMISSION_REQUIRED");
  const checkAdmission=async()=>{
   const current=await readAdmission(initial.workId);
   if(JSON.stringify(current)!==JSON.stringify(initial))throw Error("DIRECTOR_ADMISSION_CHANGED");
  };
  const checkCurrentPr=async()=>{
   await checkAdmission();
   if(initial.pr===null)return;
   const pr=prSchema.parse(await readGitHub("/pulls/"+initial.pr));
   if(pr.number!==initial.pr||pr.head.ref!==initial.branch||pr.head.sha!==initial.head)
    throw Error("DIRECTOR_PR_HEAD_CHANGED");
  };
  await checkCurrentPr();
  const result=await prepareCodingCandidate(context,{readAdmission,readSource,validate,model,maxAttempts:3});
  if(result.outcome==="blocked")return {outcome:"blocked" as const,trace:{head:context.claim.trace.head,
   nextAction:"Reconcile rejected model candidate before renewed admission",evidence:[result.red.evidence]}};
  const publication=createGitHubPublicationPort({token:writer.token,fetcher:writeFetch,
   verifyWriterIsolation:b=>config.verifyWriterIsolation(b,actor),
   async verifyCandidatePolicy(candidate){
    await checkCurrentPr();
    return await evidence.verifyEvidence(result)===true&&await config.verifyCandidatePolicy(candidate,result)===true;
   }});
  const builder=createGitHubCommitBuilder({token:writer.token,fetcher:writeFetch,readAdmission,readSource,
   verifyEvidence:evidence.verifyEvidence,verifyPrepared:publication.verifyPrepared});
  const identity={workId:context.claim.workId,actor:context.claim.actor,session:context.claim.session,generation:context.claim.generation};
  const authenticate=async(i:typeof identity)=>i.actor===actor&&i.session===config.session&&i.workId===identity.workId&&i.generation===identity.generation;
  let built:PreparedMutation|undefined;
  let lifecycle:ExistingPrExecutorPorts["lifecycle"];
  if(initial.pr===null){
   const prCredential=await config.identity.issue("pull-request");
   if(prCredential.actor!==actor||[readCredential.token,writer.token,evidenceCredential.token].includes(prCredential.token))
    throw Error("DIRECTOR_LIFECYCLE_IDENTITY_MISMATCH");
   const newWork=createGitHubNewWork({store,now:config.now,branchToken:writer.token,prToken:prCredential.token,
    fetcher:scopedFetch(Math.min(writer.expiresAt,prCredential.expiresAt)),authenticate,readAdmission,
    verifyWriterIsolation:b=>config.verifyWriterIsolation(b,actor),
    async verifyPublishedCandidate(c){
     if(!built||c.workId!==identity.workId||c.generation!==identity.generation||c.trace.head!==built.candidateHead)return false;
     await checkAdmission();
     return await publication.readHead(c.branch)===built.candidateHead&&
      await evidence.verifyEvidence(result)===true&&await config.verifyCandidatePolicy(built,result)===true;
    },
    async verifyQuiescence(){return false;}});
   lifecycle={
    async createBranch(ctx){await ctx.heartbeat();await checkAdmission();return newWork.createBranch(identity);},
    async createDraftPr(ctx,candidate){
     await ctx.heartbeat();await checkAdmission();
     if((await ctx.assertCurrent()).trace.head!==candidate.candidateHead)throw Error("DIRECTOR_LIFECYCLE_HEAD_CHANGED");
     const opened=await newWork.createDraftPr(identity);
     return {head:opened.head,prNumber:positive.parse("prNumber" in opened?opened.prNumber:undefined)};
    }
   };
  }
  return createExistingPrExecutor({
   async prepare(){return result;},
   async build(ctx,r){built=await builder(ctx,r);return built;},
   ...(lifecycle?{lifecycle}:{}),
   async publish(_ctx,candidate){
    return publishClaimedCommit({...publication,store,now:config.now,
     authenticate,
     async verifyQuiescence(){return false;}},identity,candidate);
   }
  })(context);
 };
 const ports={store,actor,session:config.session,now:config.now,leaseMs:config.leaseMs,maxUnits:config.maxUnits,
  selectNext:createGitHubWorkSelector({readGitHub,readCanonicalAdmissions:admissions,store,actor,session:config.session,now:config.now,leaseMs:config.leaseMs}),
  execute,readGitHub,authenticateDelivery:config.authenticateDelivery};
 if(event!==null)return runGitHubDirectorWake(event,ports);
 const signal=listAcceptedDirectorWakes((await store.read()).state)[0];
 if(!signal)return {status:"no-accepted-wake" as const,finished:[]};
 const reconstructed=eventFromAcceptedWake(signal);
 return runDeferredDirectorWake(signal,{...ports,async verifySignal(s){
  // Revalidate live GitHub objects on every dispatch. No trust in caller
  // supplied event, stale CI, or unauthenticated receipt. An accepted receipt
  // is claimed by CAS in the existing director before model work starts.
  const live=await deriveGitHubWake(reconstructed,readGitHub);
  return s.kind===live.kind&&s.key===live.key&&s.head===live.head&&s.evidence===live.evidence;
 }});

}
