import assert from "node:assert/strict";
import test from "node:test";
import {bootstrapCoordination,type BootstrapRequest} from "../src/coordination/bootstrap.js";
import {emptyState} from "../src/coordination/agentClaims.js";
const ref="refs/heads/coordination/sadiaaf-agent-state",name="SadiaAF - Coordination transactionnelle - protection";
const main="a".repeat(40),tree="b".repeat(40),root="c".repeat(40),appId=123;
const repository="Patricked-code/africafunds-market-data-pipeline";
function fixture(initialRule=false,initialRef=false){
 let rule=initialRule,created=initialRef;
 const calls:{method:string;path:string;body:unknown}[]=[];
 const request:BootstrapRequest=async(method,path,body)=>{
  calls.push({method,path,body});
  if(method==="GET"&&path==="")return {id:1315731572,full_name:"Patricked-code/africafunds-market-data-pipeline",private:false};
  if(path==="/branches/main")return {name:"main",protected:true,commit:{sha:main}};
  if(path.startsWith("/rulesets?"))return rule?[{id:7,name}]:[];
  if(path==="/rulesets/7"&&rule)return {id:7,name,target:"branch",source:"Patricked-code/africafunds-market-data-pipeline",enforcement:"active",conditions:{ref_name:{include:[ref],exclude:[]}},bypass_actors:[],current_user_can_bypass:"never",rules:[{type:"deletion"},{type:"non_fast_forward"}]};
  const access={id:8,target:"branch",source_type:"Repository",source:repository,enforcement:"active",conditions:{ref_name:{include:[ref],exclude:[]}},
   bypass_actors:[{actor_id:appId,actor_type:"Integration",bypass_mode:"always"}],rules:[{type:"creation"},{type:"update",parameters:{update_allows_fetch_and_merge:false}}]};
  const safety={id:7,target:"branch",source_type:"Repository",source:repository,enforcement:"active",conditions:{ref_name:{include:[ref],exclude:[]}},
   bypass_actors:[],rules:[{type:"deletion"},{type:"non_fast_forward"}]};
  const mainRule={id:9,target:"branch",source_type:"Repository",source:repository,enforcement:"active",conditions:{ref_name:{include:["refs/heads/main"],exclude:[]}},bypass_actors:[],
   rules:[{type:"deletion"},{type:"non_fast_forward"},{type:"pull_request"},{type:"required_status_checks",parameters:{strict_required_status_checks_policy:true,do_not_enforce_on_create:false,
   required_status_checks:[{context:"validate"},{context:"Build, boot, migrate and verify persistent PostgreSQL"}]}}]};
  if(path.startsWith("/rules/branches/"))return (path.includes("/main?")?[mainRule]:[access,safety]).flatMap(r=>r.rules.map(x=>({...x,ruleset_id:r.id,ruleset_source_type:"Repository",ruleset_source:repository})));
  if(path==="/rulesets/7?includes_parents=true")return safety;
  if(path==="/rulesets/8?includes_parents=true")return access;
  if(path==="/rulesets/9?includes_parents=true")return mainRule;
  if(path==="/git/ref/heads/coordination/sadiaaf-agent-state")return created?{ref,object:{type:"commit",sha:root}}:null;
  if(path==="/contents/agent-claims.json?ref="+root)return {encoding:"base64",content:Buffer.from(JSON.stringify(emptyState())).toString("base64")};
  if(method==="POST"&&path==="/rulesets"){rule=true;return {id:7};}
  if(method==="POST"&&path==="/git/trees")return {sha:tree};
  if(method==="POST"&&path==="/git/commits")return {sha:root};
  if(method==="POST"&&path==="/git/refs"){created=true;return {ref,object:{type:"commit",sha:root}};}
  throw Error("unexpected "+method+" "+path);
 };
 const appCalls:{path:string;body:unknown}[]=[];
 const actor="github-app:123:installation:456";
 const writer={appId,now:()=>1000,identity:{actor,async issue(){return {actor,expiresAt:3601000,token:"test-app-token"};}},
  fetcher:async(input:RequestInfo|URL,init?:RequestInit)=>{
   const path=String(input).split(repository)[1]!,body=JSON.parse(String(init?.body));appCalls.push({path,body});
   assert.equal(new Headers(init?.headers).get("authorization"),"Bearer test-app-token");
   if(path==="/git/trees")return Response.json({sha:tree});
   if(path==="/git/commits")return Response.json({sha:root});
   if(path==="/git/refs"){created=true;return Response.json({ref,object:{type:"commit",sha:root}});}
   throw Error("unexpected app mutation");
  }};
 return {calls,request,appCalls,writer};
}
test("bootstrap check is read-only and detects missing protection/ref",async()=>{
 const f=fixture();assert.equal((await bootstrapCoordination(f.request)).status,"setup-required");
 assert.ok(f.calls.every(x=>x.method==="GET"));
});
test("apply requires dedicated app and both pre-existing protections before any mutation",async()=>{
 const absent=fixture();await assert.rejects(bootstrapCoordination(absent.request,true),/DEDICATED_APP_REQUIRED/);
 await assert.rejects(bootstrapCoordination(absent.request,true,absent.writer),/INSTALL_PROTECTIONS_FIRST/);
 assert.ok(absent.calls.every(x=>x.method==="GET"));assert.equal(absent.appCalls.length,0);
 const f=fixture(true);const result=await bootstrapCoordination(f.request,true,f.writer);
 assert.equal(result.status,"initialized");assert.equal(result.writerIsolationAttested,false);
 assert.ok(f.calls.every(x=>x.method==="GET"));
 assert.deepEqual(f.appCalls.map(x=>x.path),["/git/trees","/git/commits","/git/refs"]);
 assert.deepEqual(f.appCalls[1]?.body,{message:"coordination: initialize SADIAAF-CONTINUITY-20261124-01",tree,parents:[]});
 assert.deepEqual(f.appCalls[2]?.body,{ref,sha:root});
 assert.equal((await bootstrapCoordination(f.request,true,f.writer)).status,"existing");assert.equal(f.appCalls.length,3);
});
test("effective writer audit missing or wrong prevents even unreferenced object writes",async()=>{
 const f=fixture(true);const request:BootstrapRequest=async(method,path,body)=>path.startsWith("/rules/branches/")?[]:f.request(method,path,body);
 await assert.rejects(bootstrapCoordination(request,true,f.writer));assert.equal(f.appCalls.length,0);
});
test("existing unprotected ref is not overwritten or silently adopted",async()=>{
 const f=fixture(false,true);
 await assert.rejects(bootstrapCoordination(f.request,true),/EXISTING_REF_WITHOUT_VERIFIED_RULE/);
 assert.ok(f.calls.every(x=>x.method==="GET"));
});
test("invalid protection refuses all mutations",async()=>{
 const f=fixture(true,false);
 const request:BootstrapRequest=async(method,path,body)=>path==="/rulesets/7"?{name,rules:[{type:"deletion"},{type:"deletion"}]}:f.request(method,path,body);
 await assert.rejects(bootstrapCoordination(request,true));
 assert.ok(f.calls.every(x=>x.method==="GET"));
});
