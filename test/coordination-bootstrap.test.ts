import assert from "node:assert/strict";
import test from "node:test";
import {bootstrapCoordination,type BootstrapRequest} from "../src/coordination/bootstrap.js";
import {emptyState} from "../src/coordination/agentClaims.js";
const ref="refs/heads/coordination/sadiaaf-agent-state",name="SadiaAF - Coordination transactionnelle - protection";
const main="a".repeat(40),tree="b".repeat(40),root="c".repeat(40);
function fixture(initialRule=false,initialRef=false){
 let rule=initialRule,created=initialRef;
 const calls:{method:string;path:string;body:unknown}[]=[];
 const request:BootstrapRequest=async(method,path,body)=>{
  calls.push({method,path,body});
  if(method==="GET"&&path==="")return {id:1315731572,full_name:"Patricked-code/africafunds-market-data-pipeline",private:false};
  if(path==="/branches/main")return {name:"main",protected:true,commit:{sha:main}};
  if(path.startsWith("/rulesets?"))return rule?[{id:7,name}]:[];
  if(path==="/rulesets/7"&&rule)return {id:7,name,target:"branch",source:"Patricked-code/africafunds-market-data-pipeline",enforcement:"active",conditions:{ref_name:{include:[ref],exclude:[]}},bypass_actors:[],current_user_can_bypass:"never",rules:[{type:"deletion"},{type:"non_fast_forward"}]};
  if(path==="/git/ref/heads/coordination/sadiaaf-agent-state")return created?{ref,object:{type:"commit",sha:root}}:null;
  if(path==="/contents/agent-claims.json?ref="+root)return {encoding:"base64",content:Buffer.from(JSON.stringify(emptyState())).toString("base64")};
  if(method==="POST"&&path==="/rulesets"){rule=true;return {id:7};}
  if(method==="POST"&&path==="/git/trees")return {sha:tree};
  if(method==="POST"&&path==="/git/commits")return {sha:root};
  if(method==="POST"&&path==="/git/refs"){created=true;return {ref,object:{type:"commit",sha:root}};}
  throw Error("unexpected "+method+" "+path);
 };
 return {calls,request};
}
test("bootstrap check is read-only and detects missing protection/ref",async()=>{
 const f=fixture();assert.equal((await bootstrapCoordination(f.request)).status,"setup-required");
 assert.ok(f.calls.every(x=>x.method==="GET"));
});
test("apply verifies dedicated protection before creating isolated parentless state and never rewrites main",async()=>{
 const f=fixture();const result=await bootstrapCoordination(f.request,true);
 assert.equal(result.status,"initialized");assert.equal(result.writerIsolationAttested,false);
 const writes=f.calls.filter(x=>x.method==="POST");
 assert.deepEqual(writes.map(x=>x.path),["/rulesets","/git/trees","/git/commits","/git/refs"]);
 assert.deepEqual(writes[0]?.body,{name,target:"branch",enforcement:"active",conditions:{ref_name:{include:[ref],exclude:[]}},bypass_actors:[],rules:[{type:"deletion"},{type:"non_fast_forward"}]});
 assert.deepEqual(writes[2]?.body,{message:"coordination: initialize SADIAAF-CONTINUITY-20261124-01",tree,parents:[]});
 assert.deepEqual(writes[3]?.body,{ref,sha:root});
 assert.ok(f.calls.findIndex(x=>x.path==="/rulesets/7")<f.calls.findIndex(x=>x.path==="/git/trees"));
 const count=f.calls.filter(x=>x.method==="POST").length;
 assert.equal((await bootstrapCoordination(f.request,true)).status,"existing");
 assert.equal(f.calls.filter(x=>x.method==="POST").length,count);
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
