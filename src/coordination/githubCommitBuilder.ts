import {createHash} from "node:crypto";
import {z} from "zod";
import {canonicalWorkAdmissionSchema} from "./githubSelector.js";
import {codingSubject,type CodingResult} from "./modelCoder.js";
import type {ClaimedWorkContext} from "./agentClaims.js";
import type {PreparedMutation} from "./mutationGateway.js";

const root="https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline";
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const pathSchema=z.string().max(240).regex(/^src\/[A-Za-z0-9_.\/-]+\.ts$/)
 .refine(p=>!p.split("/").some(x=>["",".",".."].includes(x)))
 .refine(p=>!/^src\/(auth|identity|security|config|coordination)\//i.test(p))
 .refine(p=>!/(secret|credential|token|private[-_]?key)/i.test(p));
const changeSchema=z.object({path:pathSchema,originalSha256:digest,content:z.string().min(1).max(24000).refine(s=>!s.includes("\0"))}).strict();
const proofSchema=z.object({status:z.enum(["pass","fail"]),subject:digest,suite:digest,
 evidence:z.string().regex(/^(commit:[a-f0-9]{40}|(?:ci|issue|pr):[1-9][0-9]{0,19})$/),
 diagnostics:z.array(z.string().min(1).max(300)).max(12)}).strict();
const validated=z.object({outcome:z.literal("validated"),workId:z.string(),branch:z.string(),head:sha,
 changes:z.array(changeSchema).min(1).max(5),red:proofSchema,green:proofSchema}).strict();
const hash=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
const gitBlob=(s:string)=>{const bytes=Buffer.from(s,"utf8");return createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");};
export interface CommitBuilderConfig {
 token:string;
 fetcher?:typeof fetch;
 timeoutMs?:number;
 readAdmission(workId:string):Promise<unknown>;
 readSource(head:string,path:string):Promise<string>;
 // Independently re-read durable RED/GREEN evidence, exact suite/subject and
 // policy. A model or caller-supplied success flag is insufficient.
 verifyEvidence(candidate:Extract<CodingResult,{outcome:"validated"}>):Promise<boolean>;
 // Verify exhaustive final diff, tree modes and actual candidate policy.
 verifyPrepared(candidate:PreparedMutation):Promise<boolean>;
}
// Creates only unreferenced Git objects. It cannot create/update branches,
// open PRs, merge, or execute generated code. All live writes use the gateway.
export function createGitHubCommitBuilder(config:CommitBuilderConfig){
 const t=z.string().min(1).max(4096).regex(/^[A-Za-z0-9_.-]+$/).safeParse(config.token);
 if(!t.success)throw Error("BUILDER_CREDENTIAL_INVALID");
 const timeout=config.timeoutMs??15000;
 if(!Number.isSafeInteger(timeout)||timeout<100||timeout>60000)throw Error("BUILDER_TIMEOUT_INVALID");
 const fetcher=config.fetcher??fetch;
 async function request(method:"GET"|"POST",path:string,body?:unknown):Promise<unknown>{
  let response:Response;
  try{response=await fetcher(root+path,{method,redirect:"error",signal:AbortSignal.timeout(timeout),
   headers:{Authorization:"Bearer "+t.data,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",
    ...(body===undefined?{}:{"Content-Type":"application/json"})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  catch{throw Error("BUILDER_TRANSPORT_UNCONFIRMED");}
  if(!response.ok)throw Error("BUILDER_HTTP_"+response.status);
  try{return await response.json();}catch{throw Error("BUILDER_RESPONSE_INVALID");}
 }
 return async(context:ClaimedWorkContext,raw:Extract<CodingResult,{outcome:"validated"}>):Promise<PreparedMutation>=>{
  const result=validated.parse(raw),c=context.claim;
  const admission=canonicalWorkAdmissionSchema.parse(await config.readAdmission(c.workId));
  if(result.workId!==c.workId||result.branch!==c.branch||result.head!==c.base||
   admission.workId!==c.workId||admission.branch!==c.branch||admission.head!==c.base||admission.lot!==c.lot||
   JSON.stringify([...admission.scopes].sort())!==JSON.stringify([...c.scopes].sort()))
   throw Error("BUILDER_ADMISSION_MISMATCH");
  const paths=result.changes.map(x=>x.path);
  if(new Set(paths).size!==paths.length||paths.some(p=>!c.scopes.includes("file:"+p))||
    JSON.stringify(paths)!==JSON.stringify([...paths].sort()))throw Error("BUILDER_SCOPE_MISMATCH");
  if(result.red.status!=="fail"||!result.red.diagnostics.length||result.green.status!=="pass"||
    result.green.diagnostics.length||result.red.suite!==result.green.suite||result.red.evidence===result.green.evidence||
    result.red.subject!==codingSubject(result.head,[])||result.green.subject!==codingSubject(result.head,result.changes))
   throw Error("BUILDER_PROOF_MISMATCH");
  const refresh=async()=>{
   await context.heartbeat();
   const live=await context.assertCurrent();
   if(live.trace.head!==result.head||live.generation!==c.generation||
    JSON.stringify(canonicalWorkAdmissionSchema.parse(await config.readAdmission(c.workId)))!==JSON.stringify(admission))
    throw Error("BUILDER_AUTHORIZATION_CHANGED");
  };
  await refresh();
  if(await config.verifyEvidence(result)!==true)throw Error("BUILDER_EVIDENCE_DENIED");
  z.object({id:z.literal(1315731572)}).parse(await request("GET",""));
  const commitSchema=z.object({sha,tree:z.object({sha}),parents:z.array(z.object({sha}))});
  const base=commitSchema.parse(await request("GET","/git/commits/"+result.head));
  if(base.sha!==result.head)throw Error("BUILDER_BASE_MISMATCH");
  const entries:{path:string;mode:"100644";type:"blob";sha:string}[]=[];
  for(const change of result.changes){
   const original=await config.readSource(result.head,change.path);
   if(hash(original)!==change.originalSha256||original===change.content)throw Error("BUILDER_ORIGINAL_MISMATCH");
   await refresh();
   const blob=z.object({sha}).parse(await request("POST","/git/blobs",{content:Buffer.from(change.content,"utf8").toString("base64"),encoding:"base64"}));
   if(blob.sha!==gitBlob(change.content))throw Error("BUILDER_BLOB_MISMATCH");
   entries.push({path:change.path,mode:"100644",type:"blob",sha:blob.sha});
  }
  await refresh();
  const tree=z.object({sha}).parse(await request("POST","/git/trees",{base_tree:base.tree.sha,tree:entries}));
  if(tree.sha===base.tree.sha)throw Error("BUILDER_TREE_UNCHANGED");
  await refresh();
  const created=commitSchema.parse(await request("POST","/git/commits",{
   message:"SadiaAF: governed change "+c.workId,tree:tree.sha,parents:[result.head]}));
  if(created.sha===result.head||created.tree.sha!==tree.sha||created.parents.length!==1||created.parents[0]?.sha!==result.head)
   throw Error("BUILDER_COMMIT_MISMATCH");
  const actual=commitSchema.parse(await request("GET","/git/commits/"+created.sha));
  if(JSON.stringify(actual)!==JSON.stringify(created))throw Error("BUILDER_COMMIT_UNCONFIRMED");
  for(const change of result.changes){
   if(await config.readSource(created.sha,change.path)!==change.content)throw Error("BUILDER_CANDIDATE_CONTENT_MISMATCH");
  }
  const prepared:PreparedMutation={branch:c.branch,expectedHead:result.head,candidateHead:created.sha,paths};
  await refresh();
  if(await config.verifyPrepared(prepared)!==true)throw Error("BUILDER_FINAL_DIFF_DENIED");
  await refresh();
  return prepared;
 };
}
