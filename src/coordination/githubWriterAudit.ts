import {createHash} from "node:crypto";
import {z} from "zod";

const repository="Patricked-code/africafunds-market-data-pipeline";
const coordination="coordination/sadiaaf-agent-state";
const work=/^work\/sadiaaf-issue-[1-9][0-9]*-[a-z0-9-]+$/;
const positive=z.number().int().positive().safe();
const effective=z.array(z.object({type:z.string(),ruleset_id:positive,
 ruleset_source_type:z.literal("Repository"),ruleset_source:z.literal(repository),
 parameters:z.unknown().optional()})).min(1).max(99);
const detail=z.object({id:positive,target:z.literal("branch"),source_type:z.literal("Repository"),source:z.literal(repository),
 enforcement:z.literal("active"),conditions:z.object({ref_name:z.object({include:z.array(z.string()).min(1),exclude:z.array(z.string())})}),
 bypass_actors:z.array(z.object({actor_id:positive.nullable(),actor_type:z.string(),bypass_mode:z.string()})),
 rules:z.array(z.object({type:z.string(),parameters:z.unknown().optional()})).min(1).max(99)});
type Rule=z.infer<typeof detail>;
export type AuditRead=(path:string)=>Promise<unknown>;
const update=z.object({update_allows_fetch_and_merge:z.literal(false)});
const sha256=(s:string)=>createHash("sha256").update(s).digest("hex");
function strictScope(r:Rule,branch:string){
 const {include,exclude}=r.conditions.ref_name;
 return exclude.length===0&&include.length===1&&
  (include[0]==="refs/heads/"+branch||(work.test(branch)&&include[0]==="refs/heads/work/sadiaaf-issue-*"));
}
function types(r:Rule){return r.rules.map(x=>x.type).sort().join(",");}
function same(a:unknown,b:unknown):boolean{return JSON.stringify(a)===JSON.stringify(b);}
// Read-only administrative observer. GitHub hides bypass_actors from a
// caller that cannot write the ruleset; missing fields must not be treated
// as empty. Never provide this administrative credential to the executor.
// This checks policy at observation time, not secret custody or live
// negative-write/positive-write qualification.
export async function auditGitHubWriterPolicy(read:AuditRead,branch:string,appId:number){
 positive.parse(appId);
 if(branch!==coordination&&(!work.test(branch)||branch.length>200))throw Error("WRITER_AUDIT_BRANCH_NOT_ADMITTED");
 z.object({id:z.literal(1315731572),full_name:z.literal(repository),private:z.literal(false)}).parse(await read(""));
 const main=z.object({name:z.literal("main"),protected:z.literal(true),commit:z.object({sha:z.string().regex(/^[a-f0-9]{40}$/)})});
 const beforeMain=main.parse(await read("/branches/main"));
 async function snapshot(b:string){
  const path="/rules/branches/"+encodeURIComponent(b)+"?per_page=100&page=1";
  const entries=effective.parse(await read(path));
  const ids=[...new Set(entries.map(x=>x.ruleset_id))].sort((a,b)=>a-b);
  const rules:Rule[]=[];
  for(const id of ids){
   const r=detail.parse(await read("/rulesets/"+id+"?includes_parents=true"));
   if(r.id!==id)throw Error("WRITER_RULE_ID_MISMATCH");
   const seen=entries.filter(x=>x.ruleset_id===id).map(x=>x.type).sort();
   if(!same(seen,r.rules.map(x=>x.type).sort()))throw Error("WRITER_EFFECTIVE_RULE_MISMATCH");
   rules.push(r);
  }
  return {entries,rules};
 }
 const target=await snapshot(branch),m=await snapshot("main");
 // A dedicated access rule may authorize ONLY the selected App to create
 // and update the designated work ref. Safety rules are separate and have
 // no exceptions, including for this App.
 const access=target.rules.filter(r=>types(r)==="creation,update"&&strictScope(r,branch)&&
  r.bypass_actors.length===1&&r.bypass_actors[0]?.actor_id===appId&&
  r.bypass_actors[0]?.actor_type==="Integration"&&r.bypass_actors[0]?.bypass_mode==="always"&&
  update.safeParse(r.rules.find(x=>x.type==="update")?.parameters).success);
 const safety=target.rules.filter(r=>types(r)==="deletion,non_fast_forward"&&strictScope(r,branch)&&r.bypass_actors.length===0);
 if(access.length!==1||safety.length!==1||access[0]!.id===safety[0]!.id)
  throw Error("WRITER_DEDICATED_PROTECTIONS_REQUIRED");
 // Additional effective rules are not guessed compatible. The first
 // deployment profile requires exactly two; review any broader policy.
 if(target.rules.length!==2)throw Error("WRITER_EXTRA_RULES_REQUIRE_REVIEW");
 if(m.rules.some(r=>r.id===access[0]!.id||r.bypass_actors.length!==0))
  throw Error("WRITER_MAIN_EXCEPTION_OR_SCOPE_OVERLAP");
 const mainTypes=new Set(m.rules.flatMap(r=>r.rules.map(x=>x.type)));
 if(!["pull_request","deletion","non_fast_forward","required_status_checks"].every(x=>mainTypes.has(x)))
  throw Error("WRITER_MAIN_PROTECTION_INCOMPLETE");
 const mainChecks=z.object({strict_required_status_checks_policy:z.literal(true),do_not_enforce_on_create:z.literal(false),
  required_status_checks:z.array(z.object({context:z.string()}))});
 const checks=m.rules.flatMap(r=>r.rules.filter(x=>x.type==="required_status_checks")).map(x=>mainChecks.parse(x.parameters));
 if(!checks.some(x=>["validate","Build, boot, migrate and verify persistent PostgreSQL"].every(n=>x.required_status_checks.some(c=>c.context===n))))
  throw Error("WRITER_MAIN_REQUIRED_CHECKS_INCOMPLETE");
 const afterTarget=await snapshot(branch),afterMain=await snapshot("main");
 if(!same(target,afterTarget)||!same(m,afterMain)||!same(beforeMain,main.parse(await read("/branches/main"))))
  throw Error("WRITER_POLICY_CHANGED_DURING_AUDIT");
 return {status:"policy-observed" as const,repository,branch,appId,main:beforeMain.commit.sha,
  accessRulesetId:access[0]!.id,safetyRulesetId:safety[0]!.id,
  mainRulesetIds:m.rules.map(x=>x.id),policySha256:sha256(JSON.stringify({target,m})),
  writerIsolationAttested:false as const,requiresLiveQualification:true as const};
}
