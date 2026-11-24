import {createHash} from "node:crypto";
import {z} from "zod";
import {codingSubject,type CodingResult,type CodingProof} from "./modelCoder.js";
import type {ValidationRecord} from "./isolatedValidation.js";

const root="https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline";
const marker="SADIAAF_VALIDATION_EVIDENCE_V1";
const digest=z.string().regex(/^[a-f0-9]{64}$/),sha=z.string().regex(/^[a-f0-9]{40}$/);
const positive=z.number().int().positive().safe();
const ids=["valid-leap","valid-date","timezone","date-object","invalid-text","invalid-object","days-between","bucket-365","bucket-366","invalid-feb30","invalid-leap","invalid-apr31","invalid-month13","invalid-month00","invalid-day00","century-leap","century-nonleap","year-0001"] as const;
const caseId=z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const result=z.discriminatedUnion("kind",[
 z.object({id:caseId,kind:z.literal("value"),value:z.union([z.string().max(300),z.number().finite()])}).strict(),
 z.object({id:caseId,kind:z.literal("throw")}).strict()
]);
function evidenceRecord(caseIds:readonly string[]){
 const allowed=new Set(z.array(caseId).min(1).max(30).parse(caseIds));
 if(allowed.size!==caseIds.length)throw Error("EVIDENCE_CASE_CONTRACT_INVALID");
 return z.object({head:sha,subject:digest,suite:digest,status:z.enum(["pass","fail"]),diagnostics:z.array(caseId).max(allowed.size),observed:z.array(result).length(allowed.size)}).strict().superRefine((r,ctx)=>{
  if(new Set(r.observed.map(x=>x.id)).size!==allowed.size||r.observed.some(x=>!allowed.has(x.id))||r.diagnostics.some(x=>!allowed.has(x))||new Set(r.diagnostics).size!==r.diagnostics.length||
   (r.status==="pass")!==(!r.diagnostics.length))ctx.addIssue({code:"custom",message:"INVALID_EVIDENCE_CASES"});
 });
}
const envelope=z.object({continuity:z.literal("SADIAAF-CONTINUITY-20261124-01"),recordHash:digest,
 recordBase64:z.string().max(20000)}).strict();
const comment=z.object({id:positive,issue_url:z.literal(root+"/issues/9"),body:z.string().max(22000),
 created_at:z.string().datetime(),updated_at:z.string().datetime(),
 user:z.object({id:positive,type:z.literal("Bot")}),
 performed_via_github_app:z.object({id:positive})});
const hash=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
type Validated=Extract<CodingResult,{outcome:"validated"}>;
export interface ValidationEvidenceConfig{
 // Separate least-privilege issue-write credential from the verified broker,
 // never supplied by the model or reused as a branch publication credential.
 token:string;appId:number;botUserId:number;expectedSuite:string;expectedCaseIds?:readonly string[];
 fetcher?:typeof fetch;timeoutMs?:number;
}
export function createGitHubValidationEvidence(config:ValidationEvidenceConfig){
 const token=z.string().min(1).max(4096).regex(/^[A-Za-z0-9_.-]+$/).parse(config.token);
 const appId=positive.parse(config.appId),botId=positive.parse(config.botUserId),suite=digest.parse(config.expectedSuite);
 const record=evidenceRecord(config.expectedCaseIds??ids);
 const timeout=config.timeoutMs??15000;
 if(!Number.isSafeInteger(timeout)||timeout<100||timeout>60000)throw Error("EVIDENCE_TIMEOUT_INVALID");
 const send=config.fetcher??fetch;
 async function request(method:"GET"|"POST",path:string,body?:unknown){
  let r:Response;
  try{r=await send(root+path,{method,redirect:"error",signal:AbortSignal.timeout(timeout),headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(body===undefined?{}:{"Content-Type":"application/json"})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  catch{throw Error("EVIDENCE_TRANSPORT_UNCONFIRMED");}
  if(!r.ok||!r.body)throw Error("EVIDENCE_HTTP_"+r.status);
  const reader=r.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true});let raw="",size=0;
  try{while(true){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;if(size>100000){await reader.cancel();throw Error("EVIDENCE_RESPONSE_LIMIT");}raw+=decoder.decode(x.value,{stream:true});}raw+=decoder.decode();}
  finally{reader.releaseLock();}
  return JSON.parse(raw) as unknown;
 }
 function decode(raw:unknown){
  const c=comment.parse(raw);
  if(c.user.id!==botId||c.performed_via_github_app.id!==appId||c.updated_at!==c.created_at||!c.body.startsWith(marker+"\n"))throw Error("EVIDENCE_AUTHOR_OR_VERSION_MISMATCH");
  const e=envelope.parse(JSON.parse(c.body.slice(marker.length+1)));
  const b=Buffer.from(e.recordBase64,"base64");
  if(b.toString("base64")!==e.recordBase64)throw Error("EVIDENCE_ENCODING_INVALID");
  const text=new TextDecoder("utf-8",{fatal:true}).decode(b);
  if(hash(text)!==e.recordHash)throw Error("EVIDENCE_HASH_MISMATCH");
  const r=record.parse(JSON.parse(text));
  if(r.suite!==suite)throw Error("EVIDENCE_SUITE_MISMATCH");
  return {id:c.id,body:c.body,record:r};
 }
 async function read(id:number){const c=decode(await request("GET","/issues/comments/"+positive.parse(id)));if(c.id!==id)throw Error("EVIDENCE_ID_MISMATCH");return c;}
 async function persistEvidence(raw:ValidationRecord):Promise<string>{
  const r=record.parse(raw);
  if(r.suite!==suite)throw Error("EVIDENCE_SUITE_MISMATCH");
  // Encode untrusted observations as data; never interpolate raw candidate
  // output into issue prose or treat a model-generated proof as authority.
  const text=JSON.stringify(r),body=marker+"\n"+JSON.stringify({continuity:"SADIAAF-CONTINUITY-20261124-01",recordHash:hash(text),recordBase64:Buffer.from(text,"utf8").toString("base64")});
  // No blind retry after an uncertain POST: reconcile issue history first.
  const posted=decode(await request("POST","/issues/9/comments",{body}));
  const confirmed=await read(posted.id);
  if(posted.body!==body||confirmed.body!==body)throw Error("EVIDENCE_WRITE_UNCONFIRMED");
  // issue:<id> in this port denotes an issue-9 COMMENT identifier.
  return "issue:"+confirmed.id;
 }
 async function verifyOne(head:string,p:CodingProof){
  const match=/^issue:([1-9][0-9]{0,15})$/.exec(p.evidence);
  if(!match)return false;
  const r=(await read(positive.parse(Number(match[1])))).record;
  return r.head===head&&r.suite===suite&&r.suite===p.suite&&r.subject===p.subject&&r.status===p.status&&
   JSON.stringify(r.diagnostics.slice(0,12))===JSON.stringify(p.diagnostics);
 }
 return {persistEvidence,async verifyEvidence(c:Validated):Promise<boolean>{
  if(c.red.status!=="fail"||c.green.status!=="pass"||c.red.evidence===c.green.evidence||!c.red.diagnostics.length||c.green.diagnostics.length||
   c.red.subject!==codingSubject(c.head,[])||c.green.subject!==codingSubject(c.head,c.changes))return false;
  return await verifyOne(c.head,c.red)&&await verifyOne(c.head,c.green);
 }};
}
// This port verifies durable provenance and exact binding, not semantic
// correctness or exclusive writers. The expected suite, App credential and
// policy must be independently attested before real runtime activation.
