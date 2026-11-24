import {z} from "zod";
import {emptyState,stateSchema} from "./agentClaims.js";
import {assertCoordinationRuleset} from "./githubDirector.js";

export const COORDINATION_REPOSITORY="Patricked-code/africafunds-market-data-pipeline";
const REF="refs/heads/coordination/sadiaaf-agent-state";
const RULE_NAME="SadiaAF - Coordination transactionnelle - protection";
const READ_REF="/git/ref/heads/coordination/sadiaaf-agent-state";
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const positive=z.number().int().positive().safe();
const repo=z.object({id:z.literal(1315731572),full_name:z.literal(COORDINATION_REPOSITORY),private:z.literal(false)});
const main=z.object({name:z.literal("main"),protected:z.literal(true),commit:z.object({sha})});
const rules=z.array(z.object({id:positive,name:z.string()})).max(99);
const ref=z.object({ref:z.literal(REF),object:z.object({sha,type:z.literal("commit")})});
const content=z.object({encoding:z.literal("base64"),content:z.string()});
export type BootstrapRequest=(method:"GET"|"POST",path:string,body?:unknown)=>Promise<unknown>;
// Only the administrator transport may report an authenticated HTTP 404 as null.
export async function bootstrapCoordination(request:BootstrapRequest,apply=false){
  repo.parse(await request("GET",""));
  const base=main.parse(await request("GET","/branches/main")).commit.sha;
  const list=rules.parse(await request("GET","/rulesets?includes_parents=true&per_page=100"));
  const matches=list.filter(x=>x.name===RULE_NAME);
  if(matches.length>1)throw Error("COORDINATION_RULE_AMBIGUOUS");
  let ruleId=matches[0]?.id;
  let current=await request("GET",READ_REF);
  if(current!==null && ruleId===undefined)throw Error("EXISTING_REF_WITHOUT_VERIFIED_RULE");
  const verifyRule=async(id:number)=>{
    const rule=await request("GET","/rulesets/"+id);
    const exact=z.object({name:z.literal(RULE_NAME),rules:z.array(z.object({type:z.enum(["deletion","non_fast_forward"])})).length(2)}).parse(rule);
    if(new Set(exact.rules.map(x=>x.type)).size!==2)throw Error("COORDINATION_RULE_INVALID");
    await assertCoordinationRuleset(async()=>rule,id);
  };
  if(ruleId!==undefined)await verifyRule(ruleId);
  const verifyState=async(value:unknown)=>{
    const head=ref.parse(value).object.sha;
    const file=content.parse(await request("GET","/contents/agent-claims.json?ref="+head));
    const state=stateSchema.parse(JSON.parse(Buffer.from(file.content,"base64").toString("utf8")));
    return {head,revision:state.revision};
  };
  if(current!==null){
    const state=await verifyState(current);
    return {status:"existing" as const,main:base,ruleId,...state,writerIsolationAttested:false};
  }
  if(!apply)return {status:"setup-required" as const,main:base,ruleId,writerIsolationAttested:false};
  if(ruleId===undefined){
    const result=z.object({id:positive}).parse(await request("POST","/rulesets",{
      name:RULE_NAME,target:"branch",enforcement:"active",
      conditions:{ref_name:{include:[REF],exclude:[]}},bypass_actors:[],
      rules:[{type:"deletion"},{type:"non_fast_forward"}]
    }));
    ruleId=result.id;
  }
  await verifyRule(ruleId);
  // Check again after installing protection. Never replace an existing ref.
  current=await request("GET",READ_REF);
  if(current!==null){
    const state=await verifyState(current);
    return {status:"existing" as const,main:base,ruleId,...state,writerIsolationAttested:false};
  }
  const tree=z.object({sha}).parse(await request("POST","/git/trees",{
    tree:[{path:"agent-claims.json",mode:"100644",type:"blob",content:JSON.stringify(emptyState())+"\n"}]
  })).sha;
  const root=z.object({sha}).parse(await request("POST","/git/commits",{
    message:"coordination: initialize SADIAAF-CONTINUITY-20261124-01",tree,parents:[]
  })).sha;
  await verifyRule(ruleId);
  const created=ref.parse(await request("POST","/git/refs",{ref:REF,sha:root}));
  if(created.object.sha!==root)throw Error("BOOTSTRAP_REF_UNCONFIRMED");
  const state=await verifyState(await request("GET",READ_REF));
  if(state.head!==root||state.revision!==0)throw Error("BOOTSTRAP_RECONCILIATION_REQUIRED");
  return {status:"initialized" as const,main:base,ruleId,...state,writerIsolationAttested:false};
}
