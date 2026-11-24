import {z} from "zod";
import {runDirectorWake,type DirectorWakePorts,type WakeSignal} from "./agentClaims.js";

const repoId=1315731572;
const repository=z.object({id:z.literal(repoId)});
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const positive=z.number().int().positive().safe();
const main=z.object({ref:z.literal("main"),repo:repository});
const head=z.object({sha,repo:repository});
const workflowIds=[409761758,410494947] as const;
const ciRun=z.object({
  id:positive,run_attempt:positive,workflow_id:z.union([z.literal(workflowIds[0]),z.literal(workflowIds[1])]),
  event:z.literal("pull_request"),status:z.literal("completed"),conclusion:z.enum(["success","failure"]),
  head_sha:sha,repository,head_repository:repository,
  pull_requests:z.array(z.object({number:positive,base:main,head})).length(1)
});
const pr=z.object({number:positive,state:z.enum(["open","closed"]),merged:z.boolean(),
  base:main,head,merge_commit_sha:sha.nullable()});
const eventSchema=z.discriminatedUnion("kind",[
  z.object({kind:z.literal("workflow-completed"),runId:positive,attempt:positive,head:sha}).strict(),
  z.object({kind:z.literal("pr-merged"),number:positive,mergeSha:sha}).strict()
]);
export type GitHubDirectorEvent=z.infer<typeof eventSchema>;
export type GitHubDirectorRead=(path:string)=>Promise<unknown>;

// Bound by the trusted caller to the canonical repository, authenticated GET
// only. A verified live object is not proof of authentic webhook delivery;
// the caller must authenticate the transport before dispatch.
export async function deriveGitHubWake(raw:GitHubDirectorEvent,read:GitHubDirectorRead):Promise<WakeSignal>{
  const e=eventSchema.parse(raw);
  if(e.kind==="workflow-completed"){
    const run=ciRun.parse(await read("/actions/runs/"+e.runId));
    const linked=run.pull_requests[0]!;
    const live=pr.parse(await read("/pulls/"+linked.number));
    if(run.id!==e.runId||run.run_attempt!==e.attempt||run.head_sha!==e.head||
      linked.head.sha!==e.head||live.number!==linked.number||live.state!=="open"||live.merged||live.head.sha!==e.head)
      throw Error("STALE_OR_UNRELATED_WORKFLOW");
    return {kind:"ci-completed",key:"ci:"+run.id+":"+run.run_attempt,head:e.head,evidence:"ci:"+run.id};
  }
  const live=pr.parse(await read("/pulls/"+e.number));
  if(live.number!==e.number||live.state!=="closed"||!live.merged||live.merge_commit_sha!==e.mergeSha)
    throw Error("UNVERIFIED_MERGE");
  const comparison=z.object({status:z.enum(["ahead","identical"]),merge_base_commit:z.object({sha})})
    .parse(await read("/compare/"+e.mergeSha+"...main"));
  if(comparison.merge_base_commit.sha!==e.mergeSha)throw Error("MERGE_NOT_ON_MAIN");
  return {kind:"pr-merged",key:"pr:"+e.number+":"+e.mergeSha,head:e.mergeSha,evidence:"pr:"+e.number};
}
export interface GitHubDirectorPorts extends Omit<DirectorWakePorts,"verifySignal"> {
  readGitHub:GitHubDirectorRead;
  // Verify authenticated event delivery in a trusted runtime. Never use a
  // client-supplied boolean, raw PR script, or webhook text as authority.
  authenticateDelivery(event:GitHubDirectorEvent):Promise<boolean>;
}
export async function runGitHubDirectorWake(raw:GitHubDirectorEvent,ports:GitHubDirectorPorts){
  const event=eventSchema.parse(raw);
  if(await ports.authenticateDelivery(event)!==true)throw Error("UNAUTHENTICATED_DELIVERY");
  const signal=await deriveGitHubWake(event,ports.readGitHub);
  return runDirectorWake(signal,{...ports,async verifySignal(s){
    const latest=await deriveGitHubWake(event,ports.readGitHub);
    return s.kind===latest.kind&&s.key===latest.key&&s.head===latest.head&&s.evidence===latest.evidence;
  }});
}

const coordinationRef="refs/heads/coordination/sadiaaf-agent-state";
const rulesetSchema=z.object({
  id:positive,target:z.literal("branch"),enforcement:z.literal("active"),
  source:z.literal("Patricked-code/africafunds-market-data-pipeline"),
  conditions:z.object({ref_name:z.object({include:z.array(z.string()),exclude:z.array(z.string())})}),
  bypass_actors:z.array(z.unknown()).length(0),
  current_user_can_bypass:z.literal("never"),
  rules:z.array(z.object({type:z.string()}))
});
// Check a separately authorized dedicated ruleset before bootstrap. This
// does not install protection, prove all effective inherited rules, or
// restrict the identities allowed to submit new fast-forward commits.
export async function assertCoordinationRuleset(read:GitHubDirectorRead,rulesetId:number):Promise<void>{
  positive.parse(rulesetId);
  const rule=rulesetSchema.parse(await read("/rulesets/"+rulesetId));
  const scope=rule.conditions.ref_name;
  const types=new Set(rule.rules.map(r=>r.type));
  if(rule.id!==rulesetId||scope.exclude.length!==0||scope.include.length!==1||scope.include[0]!==coordinationRef||
    !types.has("deletion")||!types.has("non_fast_forward"))throw Error("COORDINATION_PROTECTION_REQUIRED");
}
