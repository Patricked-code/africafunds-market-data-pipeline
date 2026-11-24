import {z} from "zod";
import {emptyState,stateSchema} from "./agentClaims.js";
import {assertCoordinationRuleset} from "./githubDirector.js";
import {auditGitHubWriterPolicy} from "./githubWriterAudit.js";
import type {createGitHubAppIdentity} from "./githubIdentity.js";

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
export interface BootstrapWriter {
 appId:number;identity:ReturnType<typeof createGitHubAppIdentity>;now():number;fetcher?:typeof fetch;
}
// Administrative observation and App mutations are deliberately separated.
// The old apply mode cannot initialize a partially protected ref.
export async function bootstrapCoordination(request:BootstrapRequest,apply=false,writer?:BootstrapWriter){
  repo.parse(await request("GET",""));
  const base=main.parse(await request("GET","/branches/main")).commit.sha;
  const list=rules.parse(await request("GET","/rulesets?includes_parents=true&per_page=100"));
  const matches=list.filter(x=>x.name===RULE_NAME);
  if(matches.length>1)throw Error("COORDINATION_RULE_AMBIGUOUS");
  const ruleId=matches[0]?.id;
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
  if(!apply){
    if(current!==null)return {status:"existing" as const,main:base,ruleId,...await verifyState(current),writerIsolationAttested:false};
    return {status:"setup-required" as const,main:base,ruleId,writerIsolationAttested:false};
  }
  if(!writer||!positive.safeParse(writer.appId).success||!writer.identity.actor.startsWith("github-app:"+writer.appId+":installation:"))
    throw Error("BOOTSTRAP_DEDICATED_APP_REQUIRED");
  if(ruleId===undefined)throw Error("BOOTSTRAP_INSTALL_PROTECTIONS_FIRST");
  const audit=async()=>{
    const p=await auditGitHubWriterPolicy(path=>request("GET",path),"coordination/sadiaaf-agent-state",writer.appId);
    if(p.safetyRulesetId!==ruleId||p.main!==base)throw Error("BOOTSTRAP_POLICY_MISMATCH");
    return p;
  };
  const observedPolicy=await audit();
  if(current!==null)return {status:"existing" as const,main:base,ruleId,...await verifyState(current),writerIsolationAttested:false};
  const credential=await writer.identity.issue("publish");
  if(credential.actor!==writer.identity.actor||credential.expiresAt-writer.now()<120000)
    throw Error("BOOTSTRAP_APP_CREDENTIAL_INVALID");
  const mutate=async(path:"/git/trees"|"/git/commits"|"/git/refs",body:unknown)=>{
    if(credential.expiresAt-writer.now()<60000)throw Error("BOOTSTRAP_APP_CREDENTIAL_EXPIRING");
    let response:Response;
    try{response=await (writer.fetcher??fetch)("https://api.github.com/repos/"+COORDINATION_REPOSITORY+path,{
      method:"POST",redirect:"error",signal:AbortSignal.timeout(15000),headers:{
       Authorization:"Bearer "+credential.token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",
       "Content-Type":"application/json"},body:JSON.stringify(body)});}
    catch{throw Error("BOOTSTRAP_APP_MUTATION_UNCONFIRMED");}
    if(!response.ok)throw Error("BOOTSTRAP_APP_HTTP_"+response.status);
    try{return await response.json();}catch{throw Error("BOOTSTRAP_APP_RESPONSE_UNCONFIRMED");}
  };
  await verifyRule(ruleId);
  // Check again after installing protection. Never replace an existing ref.
  current=await request("GET",READ_REF);
  if(current!==null){
    const state=await verifyState(current);
    return {status:"existing" as const,main:base,ruleId,...state,writerIsolationAttested:false};
  }
  const tree=z.object({sha}).parse(await mutate("/git/trees",{
    tree:[{path:"agent-claims.json",mode:"100644",type:"blob",content:JSON.stringify(emptyState())+"\n"}]
  })).sha;
  const root=z.object({sha}).parse(await mutate("/git/commits",{
    message:"coordination: initialize SADIAAF-CONTINUITY-20261124-01",tree,parents:[]
  })).sha;
  await verifyRule(ruleId);
  if((await audit()).policySha256!==observedPolicy.policySha256)throw Error("BOOTSTRAP_POLICY_CHANGED");
  if(await request("GET",READ_REF)!==null)throw Error("BOOTSTRAP_REF_APPEARED_RECONCILE");
  const created=ref.parse(await mutate("/git/refs",{ref:REF,sha:root}));
  if(created.object.sha!==root)throw Error("BOOTSTRAP_REF_UNCONFIRMED");
  const state=await verifyState(await request("GET",READ_REF));
  if(state.head!==root||state.revision!==0)throw Error("BOOTSTRAP_RECONCILIATION_REQUIRED");
  if((await audit()).policySha256!==observedPolicy.policySha256)throw Error("BOOTSTRAP_POLICY_CHANGED_AFTER_EFFECT");
  return {status:"initialized" as const,main:base,ruleId,...state,writerIsolationAttested:false};
}
