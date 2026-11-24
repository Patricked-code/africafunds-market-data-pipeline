import {z} from "zod";
import {GitHubClaimStore,type ClaimStore,type ClaimedWorkContext,type WorkPassResult} from "./agentClaims.js";
import {createGitHubRequest} from "./githubTransport.js";
import {createCanonicalAdmissionLoader} from "./githubAdmissions.js";
import {createGitHubWorkSelector,type CanonicalWorkAdmission} from "./githubSelector.js";
import {runGitHubDirectorWake,type GitHubDirectorEvent} from "./githubDirector.js";
import type {createGitHubAppIdentity} from "./githubIdentity.js";
import {createGitHubSourceReader} from "./githubSource.js";
import {createLocalModelCoder,prepareCodingCandidate,type CodingResult} from "./modelCoder.js";
import {createDatesValidationPort,DATES_ACCEPTANCE,type ValidationRecord} from "./isolatedValidation.js";
import {createGitHubCommitBuilder} from "./githubCommitBuilder.js";
import {createGitHubPublicationPort} from "./githubPublication.js";
import {publishClaimedCommit,type PreparedMutation} from "./mutationGateway.js";

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
}
export function createExistingPrExecutor(ports:ExistingPrExecutorPorts){
 return async(context:ClaimedWorkContext):Promise<WorkPassResult>=>{
  const result=await ports.prepare(context);
  if(result.outcome==="blocked")return {outcome:"blocked",trace:{
   head:context.claim.trace.head,nextAction:"Reconcile rejected model candidate before renewed admission",
   evidence:[result.red.evidence]}};
  const candidate=await ports.build(context,result);
  const published=await ports.publish(context,candidate,result);
  if(published.head!==candidate.candidateHead)throw Error("DIRECTOR_PUBLICATION_UNCONFIRMED");
  return {outcome:"completed",trace:{head:published.head,nextAction:"Reconcile exact PR CI and governed integration",
   evidence:[...new Set([result.red.evidence,result.green.evidence,"commit:"+published.head])]}};
 };
}
export function supportedExistingPrAdmissions(admissions:readonly CanonicalWorkAdmission[]){
 // Explicit bounded first recipe, not a claim of general coding coverage.
 return admissions.filter(a=>a.pr!==null&&a.acceptance===DATES_ACCEPTANCE&&
  a.scopes.length===1&&a.scopes[0]==="file:src/utils/dates.ts");
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
 verifyEvidence(result:Validated):Promise<boolean>;
 verifyCandidatePolicy(candidate:PreparedMutation,result:Validated):Promise<boolean>;
 persistEvidence(record:ValidationRecord):Promise<string>;
 authenticateDelivery(event:GitHubDirectorEvent):Promise<boolean>;
}
// Connect the existing modules for one authenticated wake on already-admitted
// existing PRs. No scheduler, branch creation, PR creation, admin mutation,
// model credential delivery, or implicit recovery. Not a complete activation.
export async function runExistingPrDirector(event:GitHubDirectorEvent,config:DirectorRuntimeConfig){
 sessionSchema.parse(config.session);positive.parse(config.coordinationRulesetId);
 if(!Number.isSafeInteger(config.leaseMs)||config.leaseMs<1000||config.leaseMs>3600000||
  !Number.isSafeInteger(config.maxUnits)||config.maxUnits<1||config.maxUnits>10)
  throw Error("DIRECTOR_RUNTIME_LIMIT_INVALID");
 const actor=config.identity.actor;
 if(await config.authenticateDelivery(event)!==true)throw Error("UNAUTHENTICATED_DELIVERY");
 if(await config.verifyCoordinationIsolation(actor)!==true)throw Error("DIRECTOR_COORDINATION_ISOLATION_REQUIRED");
 if(await config.verifyAdmissionHistory()!==true)throw Error("DIRECTOR_ADMISSION_HISTORY_REQUIRED");
 const readCredential=await config.identity.issue("read"),writer=await config.identity.issue("publish");
 if(readCredential.actor!==actor||writer.actor!==actor)throw Error("DIRECTOR_IDENTITY_MISMATCH");
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
 const load=createCanonicalAdmissionLoader(readGitHub);
 const admissions=async(main:string)=>{
  if(await config.verifyAdmissionHistory()!==true)throw Error("DIRECTOR_ADMISSION_HISTORY_REQUIRED");
  return supportedExistingPrAdmissions(await load(main));
 };
 const readAdmission=async(workId:string)=>{
  const main=mainSchema.parse(await readGitHub("/branches/main")).commit.sha;
  return (await admissions(main)).find(a=>a.workId===workId)??null;
 };
 const readSource=createGitHubSourceReader({token:readCredential.token,fetcher:readFetch});
 const validate=createDatesValidationPort({imageId:config.imageId,readSource,persistEvidence:config.persistEvidence});
 const model=createLocalModelCoder(); // loopback only; no GitHub credentials
 const execute=async(context:ClaimedWorkContext)=>{
  const initial=await readAdmission(context.claim.workId);
  if(!initial||initial.pr===null)throw Error("DIRECTOR_EXISTING_PR_REQUIRED");
  const checkCurrentPr=async()=>{
   const current=await readAdmission(initial.workId);
   if(JSON.stringify(current)!==JSON.stringify(initial))throw Error("DIRECTOR_ADMISSION_CHANGED");
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
    return await config.verifyEvidence(result)===true&&await config.verifyCandidatePolicy(candidate,result)===true;
   }});
  const builder=createGitHubCommitBuilder({token:writer.token,fetcher:writeFetch,readAdmission,readSource,
   verifyEvidence:config.verifyEvidence,verifyPrepared:publication.verifyPrepared});
  const identity={workId:context.claim.workId,actor:context.claim.actor,session:context.claim.session,generation:context.claim.generation};
  return createExistingPrExecutor({
   async prepare(){return result;},build:builder,
   async publish(_ctx,candidate){
    return publishClaimedCommit({...publication,store,now:config.now,
     async authenticate(i){return i.actor===actor&&i.session===config.session&&i.workId===identity.workId&&i.generation===identity.generation;},
     async verifyQuiescence(){return false;}},identity,candidate);
   }
  })(context);
 };
 return runGitHubDirectorWake(event,{store,actor,session:config.session,now:config.now,leaseMs:config.leaseMs,maxUnits:config.maxUnits,
  selectNext:createGitHubWorkSelector({readGitHub,readCanonicalAdmissions:admissions,store,actor,session:config.session,now:config.now,leaseMs:config.leaseMs}),
  execute,readGitHub,authenticateDelivery:config.authenticateDelivery});
}
