import {z} from "zod";
import {applyCommand,assertFence,transition,type Claim,type ClaimStore,type PendingLifecycle} from "./agentClaims.js";
import {canonicalWorkAdmissionSchema} from "./githubSelector.js";

const root="https://api.github.com",repository="Patricked-code/africafunds-market-data-pipeline";
const path="/repos/"+repository, label="automerge-eligible";
const sha=z.string().regex(/^[a-f0-9]{40}$/),num=z.number().int().positive().safe();
const repo=z.object({id:z.literal(1315731572),full_name:z.literal(repository)});
const prSchema=z.object({number:num,node_id:z.string().min(1).max(200),state:z.literal("open"),merged:z.literal(false),
 draft:z.boolean(),body:z.string(),changed_files:num.max(100),auto_merge:z.null(),labels:z.array(z.object({name:z.string()})),
 head:z.object({sha,ref:z.string(),repo}),base:z.object({ref:z.literal("main"),repo,sha})});
const file=z.object({filename:z.string().max(295).regex(/^[A-Za-z0-9_.\/-]+$/),status:z.enum(["added","modified","removed","renamed","copied","changed","unchanged"]),previous_filename:z.string().optional()});
type Owner=Pick<Claim,"workId"|"actor"|"session"|"generation">;
const same=(c:Claim,i:Owner)=>c.workId===i.workId&&c.actor===i.actor&&c.session===i.session&&c.generation===i.generation;
type ReadinessOperation="label"|"ready";
type Pr=z.infer<typeof prSchema>;
type Files=z.infer<typeof file>[];
export interface PrReadinessConfig{
 store:ClaimStore;now():number;prToken:string;fetcher?:typeof fetch;timeoutMs?:number;
 authenticate(identity:Owner):Promise<boolean>;
 readAdmission(workId:string):Promise<unknown>;
 verifyWriterIsolation(branch:string):Promise<boolean>;
 // Must use the existing governed-native-automerge policy from trusted main,
 // plus independent candidate evidence, real exact SHA checks, and admission.
 // The historical gate remains the only enrollment/merge authority.
 verifyEligibility(input:{claim:Readonly<Claim>;pr:Readonly<Pr>;files:Readonly<Files>;ciRunId:number;dockerRunId:number}):Promise<boolean>;
 verifyQuiescence(identity:Owner,operation:PendingLifecycle):Promise<boolean>;
}
export function createGitHubPrReadiness(config:PrReadinessConfig){
 const token=z.string().min(1).max(4096).regex(/^[A-Za-z0-9_.-]+$/).parse(config.prToken);
 const timeout=config.timeoutMs??15000;
 if(!Number.isSafeInteger(timeout)||timeout<100||timeout>60000)throw Error("READINESS_TIMEOUT_INVALID");
 const fetcher=config.fetcher??fetch;
 async function request(method:"GET"|"POST",url:string,body?:unknown):Promise<unknown>{
  let result:Response;
  try{result=await fetcher(root+url,{method,redirect:"error",signal:AbortSignal.timeout(timeout),headers:{
   Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",
   ...(body===undefined?{}:{"Content-Type":"application/json"})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  catch{throw Error("READINESS_TRANSPORT_UNCONFIRMED");}
  if(!result.ok||result.headers.get("link")?.includes('rel="next"'))throw Error("READINESS_HTTP_UNCONFIRMED");
  try{return await result.json();}catch{throw Error("READINESS_RESPONSE_UNCONFIRMED");}
 }
 const get=(p:string)=>request("GET",path+p);
 const marker=(c:Claim,issue:number)=>"SADIAAF-CONTINUITY-20261124-01\nWork: "+c.workId+"\nIssue: #"+issue+"\nHead: "+c.trace.head;
 const hasLabel=(p:Pr)=>p.labels.some(x=>x.name===label);
 async function observe(c:Claim,n:number,issue:number,base:string){
  const p=prSchema.parse(await get("/pulls/"+n));
  if(p.number!==n||p.head.ref!==c.branch||p.head.sha!==c.trace.head||p.base.sha!==base||
    p.body!==marker(c,issue)||!c.trace.evidence.includes("pr:"+n))
   throw Error("READINESS_PR_MISMATCH");
  return p;
 }
 async function checkRun(id:number,workflow:number,jobName:string,n:number,head:string){
  const run=z.object({id:num,workflow_id:num,event:z.literal("pull_request"),head_sha:sha,status:z.literal("completed"),
   conclusion:z.literal("success"),run_attempt:num,head_repository:repo,
   pull_requests:z.array(z.object({number:num,head:z.object({sha}),base:z.object({ref:z.literal("main")})})).length(1)}).parse(await get("/actions/runs/"+id));
  if(run.id!==id||run.workflow_id!==workflow||run.head_sha!==head||run.pull_requests[0]?.number!==n||run.pull_requests[0]?.head.sha!==head)
   throw Error("READINESS_RUN_MISMATCH");
  const jobs=z.object({total_count:z.literal(1),jobs:z.array(z.object({name:z.literal(jobName),status:z.literal("completed"),conclusion:z.literal("success"),head_sha:sha})).length(1)})
   .parse(await get("/actions/runs/"+id+"/attempts/"+run.run_attempt+"/jobs?per_page=100"));
  if(jobs.jobs[0]?.head_sha!==head)throw Error("READINESS_JOB_MISMATCH");
 }
 async function preflight(c:Claim,n:number,ci:number,docker:number){
  if(!/^work\/sadiaaf-issue-[1-9][0-9]*-[a-z0-9-]+$/.test(c.branch)||ci===docker)throw Error("READINESS_SCOPE");
  const a=canonicalWorkAdmissionSchema.parse(await config.readAdmission(c.workId));
  if(a.workId!==c.workId||a.lot!==c.lot||a.branch!==c.branch||
    (a.pr===null?a.head!==c.base:a.pr!==n||a.head!==c.trace.head)||
    !c.branch.startsWith("work/sadiaaf-issue-"+a.issue+"-")||
    JSON.stringify([...a.scopes].sort())!==JSON.stringify([...c.scopes].sort()))throw Error("READINESS_ADMISSION_MISMATCH");
  repo.extend({allow_auto_merge:z.literal(true)}).parse(await get(""));
  const main=z.object({name:z.literal("main"),protected:z.literal(true),commit:z.object({sha})}).parse(await get("/branches/main"));
  if(main.commit.sha!==a.mainSha||await config.verifyWriterIsolation(c.branch)!==true)throw Error("READINESS_POLICY_UNCONFIRMED");
  const p=await observe(c,n,a.issue,a.mainSha);
  const files=z.array(file).max(100).parse(await get("/pulls/"+n+"/files?per_page=100"));
  if(files.length!==p.changed_files||new Set(files.map(x=>x.filename)).size!==files.length||
    files.some(f=>f.status!=="modified"&&f.status!=="added"||f.previous_filename!==undefined||
      !/^(src|test)\//.test(f.filename)||f.filename.split("/").some(x=>x==="."||x===".."||x==="")||
      /^(src\/(auth|identity|security|config|coordination)\/)|(^|[\/._-])(secrets?|credentials?|private.?keys?|tokens?)([\/._-]|$)/i.test(f.filename)||
      !c.scopes.some(s=>s==="file:"+f.filename||("file:"+f.filename).startsWith(s+"/"))))
   throw Error("READINESS_FILE_SCOPE");
  await checkRun(ci,409761758,"validate",n,c.trace.head);
  await checkRun(docker,410494947,"Build, boot, migrate and verify persistent PostgreSQL",n,c.trace.head);
  if(await config.verifyEligibility({claim:structuredClone(c),pr:structuredClone(p),files:structuredClone(files),ciRunId:ci,dockerRunId:docker})!==true)
   throw Error("READINESS_ELIGIBILITY_DENIED");
  return {p,a};
 }
 async function settle(i:Owner,c:Claim,o:PendingLifecycle,ci:number,docker:number){
  await applyCommand(config.store,{kind:"lifecycle-result",...i,operation:o,prNumber:o.prNumber!,
   trace:{head:o.head,nextAction:o.kind==="label"?"Revalidate gates before ready promotion":"Wait for native auto-merge and reconcile terminal PR",
    evidence:[...new Set(["commit:"+o.head,"pr:"+o.prNumber,"ci:"+ci,"ci:"+docker,...c.trace.evidence.slice(0,26)])]}},config.now());
 }
 async function execute(i:Owner,kind:ReadinessOperation,rawPr:number,rawCi:number,rawDocker:number){
  const n=num.parse(rawPr),ci=num.parse(rawCi),docker=num.parse(rawDocker);
  if(await config.authenticate(i)!==true)throw Error("READINESS_UNAUTHENTICATED");
  const c=assertFence((await config.store.read()).state,i,config.now()),first=await preflight(c,n,ci,docker);
  if(!first.p.draft||hasLabel(first.p)!==(kind==="ready"))throw Error("READINESS_PHASE_MISMATCH");
  const o:PendingLifecycle={kind,head:c.trace.head,issue:first.a.issue,prNumber:n};
  await applyCommand(config.store,{kind:"lifecycle-intent",...i,operation:o},config.now());
  const second=await preflight(c,n,ci,docker);
  const live=(await config.store.read()).state.claims.find(x=>same(x,i));
  if(!live||JSON.stringify(live.pendingLifecycle)!==JSON.stringify(o)||config.now()>=live.leaseUntil||
     !second.p.draft||hasLabel(second.p)!==(kind==="ready")||second.p.node_id!==first.p.node_id)
   throw Error("READINESS_DISPATCH_UNCONFIRMED");
  if(kind==="label"){
   const labels=z.array(z.object({name:z.string()})).parse(await request("POST",path+"/issues/"+n+"/labels",{labels:[label]}));
   if(!labels.some(x=>x.name===label))throw Error("READINESS_LABEL_UNCONFIRMED");
  }else{
   const query="mutation($id: ID!) { markPullRequestReadyForReview(input:{pullRequestId:$id}) { pullRequest { number isDraft headRefOid } } }";
   const result=z.object({errors:z.array(z.unknown()).length(0).optional(),data:z.object({markPullRequestReadyForReview:z.object({pullRequest:z.object({number:num,isDraft:z.literal(false),headRefOid:sha})})})}).parse(await request("POST","/graphql",{query,variables:{id:second.p.node_id}}));
   const p=result.data.markPullRequestReadyForReview.pullRequest;
   if(p.number!==n||p.headRefOid!==c.trace.head)throw Error("READINESS_PROMOTION_UNCONFIRMED");
  }
  const p=await observe(c,n,o.issue,second.a.mainSha);
  if(!hasLabel(p)||p.draft!==(kind==="label"))throw Error("READINESS_EFFECT_UNCONFIRMED");
  await settle(i,c,o,ci,docker);
  return {head:c.trace.head,prNumber:n,phase:kind==="label"?"labeled" as const:"ready" as const};
 }
 return {label:(i:Owner,n:number,ci:number,docker:number)=>execute(i,"label",n,ci,docker),
  ready:(i:Owner,n:number,ci:number,docker:number)=>execute(i,"ready",n,ci,docker),
  async reconcile(i:Owner,ci:number,docker:number){
   num.parse(ci);num.parse(docker);
   if(await config.authenticate(i)!==true)throw Error("READINESS_UNAUTHENTICATED");
   const c=(await config.store.read()).state.claims.find(x=>same(x,i)),o=c?.pendingLifecycle;
   if(!c||!o||(o.kind!=="label"&&o.kind!=="ready")||!o.prNumber||await config.verifyQuiescence(i,o)!==true)throw Error("READINESS_STILL_UNCERTAIN");
   const {p}=await preflight(c,o.prNumber,ci,docker);
   if(!hasLabel(p)||p.draft!==(o.kind==="label"))throw Error("READINESS_EFFECT_UNCONFIRMED");
   await settle(i,c,o,ci,docker);
   return {head:o.head,prNumber:o.prNumber,phase:o.kind==="label"?"labeled" as const:"ready" as const};
  }};
}
// No merge API, no direct main write, no automatic retry. Ambiguous effects
// retain the canonical lifecycle intention for independently proven recovery.
