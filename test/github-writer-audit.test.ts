import assert from "node:assert/strict";
import test from "node:test";
import {auditGitHubWriterPolicy} from "../src/coordination/githubWriterAudit.js";
const repository="Patricked-code/africafunds-market-data-pipeline",branch="coordination/sadiaaf-agent-state";
const ref="refs/heads/"+branch,appId=123,head="a".repeat(40);
function fixture(){
 const rule=(id:number,include:string,types:string[],actors:unknown[])=>({id,target:"branch",source_type:"Repository",source:repository,enforcement:"active",
  conditions:{ref_name:{include:[include],exclude:[]}},bypass_actors:actors,
  rules:types.map(type=>({type,...(type==="update"?{parameters:{update_allows_fetch_and_merge:false}}:{})}))});
 const access=rule(1,ref,["creation","update"],[{actor_id:appId,actor_type:"Integration",bypass_mode:"always"}]);
 const safety=rule(2,ref,["deletion","non_fast_forward"],[]);
 const main=rule(3,"refs/heads/main",["pull_request","deletion","non_fast_forward","required_status_checks"],[]);
 main.rules=main.rules.map(x=>x.type==="required_status_checks"?{...x,parameters:{strict_required_status_checks_policy:true,do_not_enforce_on_create:false,required_status_checks:[{context:"validate"},{context:"Build, boot, migrate and verify persistent PostgreSQL"}]}} as typeof x:x);
 let missing=false,drift=false,reads=0,extra=false;
 const read=async(path:string):Promise<unknown>=>{
  if(path==="")return {id:1315731572,full_name:repository,private:false};
  if(path==="/branches/main")return {name:"main",protected:true,commit:{sha:head}};
  if(path.startsWith("/rules/branches/")){
   const rules=path.includes("/main?")?[main]:extra?[access,safety,main]:[access,safety];
   return rules.flatMap(r=>r.rules.map(x=>({...x,ruleset_id:r.id,ruleset_source:repository,ruleset_source_type:"Repository"})));
  }
  const id=Number(path.split("/")[2]?.split("?")[0]);const r=[access,safety,main].find(x=>x.id===id);
  if(!r)throw Error("unexpected path");
  if(id===1){reads++;if(missing){const {bypass_actors:_,...rest}=r;return rest;}
   if(drift&&reads>1)return {...r,conditions:{ref_name:{include:[ref],exclude:["refs/heads/x"]}}};}
  return structuredClone(r);
 };
 return {read,access,safety,main,missing:()=>{missing=true;},drift:()=>{drift=true;},extra:()=>{extra=true;}};
}
test("observes separate exact access and non-bypassable safety rules; never certifies runtime",async()=>{
 const f=fixture(),r=await auditGitHubWriterPolicy(f.read,branch,appId);
 assert.equal(r.status,"policy-observed");assert.equal(r.accessRulesetId,1);assert.equal(r.safetyRulesetId,2);
 assert.equal(r.writerIsolationAttested,false);assert.equal(r.requiresLiveQualification,true);assert.match(r.policySha256,/^[a-f0-9]{64}$/);
});
test("rejects missing administrator fields and unauthorized writer",async()=>{
 const f=fixture();f.missing();await assert.rejects(auditGitHubWriterPolicy(f.read,branch,appId));
 const g=fixture();await assert.rejects(auditGitHubWriterPolicy(g.read,branch,999),/DEDICATED_PROTECTIONS_REQUIRED/);
});
test("never permits safety or main exceptions",async()=>{
 const f=fixture();f.safety.bypass_actors.push({actor_id:appId,actor_type:"Integration",bypass_mode:"always"});
 await assert.rejects(auditGitHubWriterPolicy(f.read,branch,appId),/DEDICATED_PROTECTIONS_REQUIRED/);
 const g=fixture();g.main.bypass_actors.push({actor_id:appId,actor_type:"Integration",bypass_mode:"always"});
 await assert.rejects(auditGitHubWriterPolicy(g.read,branch,appId),/MAIN_EXCEPTION/);
});
test("rejects broad scope, extra rules, drift and forbidden branch",async()=>{
 const f=fixture();f.access.conditions.ref_name.include=["~ALL"];await assert.rejects(auditGitHubWriterPolicy(f.read,branch,appId),/DEDICATED_PROTECTIONS_REQUIRED/);
 const g=fixture();g.extra();await assert.rejects(auditGitHubWriterPolicy(g.read,branch,appId),/EXTRA_RULES/);
 const h=fixture();h.drift();await assert.rejects(auditGitHubWriterPolicy(h.read,branch,appId),/POLICY_CHANGED/);
 await assert.rejects(auditGitHubWriterPolicy(f.read,"main",appId),/BRANCH_NOT_ADMITTED/);
});

test("rejects removal of the required CI/Docker checks",async()=>{
 const f=fixture();f.main.rules=f.main.rules.filter(x=>x.type!=="required_status_checks");
 await assert.rejects(auditGitHubWriterPolicy(f.read,branch,appId),/MAIN_PROTECTION_INCOMPLETE/);
});
