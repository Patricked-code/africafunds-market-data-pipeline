import assert from "node:assert/strict";
import test from "node:test";
import {createCanonicalAdmissionLoader} from "../src/coordination/githubAdmissions.js";
import {createGitHubWorkSelector,type CanonicalWorkAdmission} from "../src/coordination/githubSelector.js";
import {CONTINUITY_ID,emptyState} from "../src/coordination/agentClaims.js";
const main="a".repeat(40),other="b".repeat(40),date="2026-11-24T06:00:00Z";
const path="/issues/9/comments?per_page=100&page=1";
const item:CanonicalWorkAdmission={continuity:CONTINUITY_ID,workId:"task-a",issue:9,lot:11,priority:1,mainSha:main,branch:"work/sadiaaf-issue-9-a",head:main,pr:null,dependsOnPr:[],scopes:["file:src/a.ts"],nextAction:"Repair",acceptance:"Pass tests"};
function entry(id:number,payload:unknown,extra:Record<string,unknown>={}){
 return {id,issue_url:"https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline/issues/9",user:{id:270385782,login:"Patricked-code"},author_association:"OWNER",created_at:date,updated_at:date,body:"SADIAAF_WORK_AUTHORIZATION_V1\n"+JSON.stringify(payload),...extra};
}
const admit=(a=item)=>({kind:"admit",continuity:CONTINUITY_ID,admission:a});
const revoke={kind:"revoke",continuity:CONTINUITY_ID,workId:"task-a"};
test("only strict owner-issued records, not free text or external users, are admitted",async()=>{
 const entries=[entry(1,admit(),{body:"Please do everything"}),entry(2,admit(),{user:{id:1,login:"other"}}),entry(3,admit())];
 const load=createCanonicalAdmissionLoader(async p=>{assert.equal(p,path);return entries;});
 assert.deepEqual(await load(main),[item]);
});
test("revocation and superseding stale admission never revive older authorization",async()=>{
 assert.deepEqual(await createCanonicalAdmissionLoader(async()=>[entry(2,revoke),entry(1,admit())])(main),[]);
 assert.deepEqual(await createCanonicalAdmissionLoader(async()=>[entry(1,admit()),entry(2,admit({...item,head:other,mainSha:other}))])(main),[]);
});
test("rejects edited, malformed or concurrently changed owner authorization",async()=>{
 await assert.rejects(createCanonicalAdmissionLoader(async()=>[entry(1,admit(),{updated_at:"2026-11-24T06:01:00Z"})])(main),/EDITED/);
 await assert.rejects(createCanonicalAdmissionLoader(async()=>[entry(1,admit(),{body:"SADIAAF_WORK_AUTHORIZATION_V1\nnot-json"})])(main),/INVALID_CANONICAL/);
 let calls=0;await assert.rejects(createCanonicalAdmissionLoader(async()=>++calls===1?[entry(1,admit())]:[])(main),/SNAPSHOT_CHANGED/);
});
test("paginates without accepting duplicate comment identifiers",async()=>{
 const full=Array.from({length:100},(_,i)=>entry(i+1,admit(),{body:"ordinary history"}));
 const load=createCanonicalAdmissionLoader(async p=>p===path?full:[entry(101,admit())]);
 assert.deepEqual(await load(main),[item]);
 await assert.rejects(createCanonicalAdmissionLoader(async p=>p===path?full:[full[0]])(main),/PAGINATION_CHANGED/);
});
test("existing selector consumes actual loader output without second task list",async()=>{
 const read=async(p:string)=>{
  if(p===path)return [entry(1,admit())];
  if(p==="/branches/main")return {name:"main",protected:true,commit:{sha:main}};
  if(p==="/issues/9")return {number:9,state:"open"};
  if(p==="/git/ref/heads/"+item.branch)throw Error("GITHUB_HTTP_404");
  throw Error("unexpected path");
 };
 const select=createGitHubWorkSelector({readGitHub:read,readCanonicalAdmissions:createCanonicalAdmissionLoader(read),store:{async read(){return {version:"1",state:emptyState()};},async compareAndSwap(){throw Error("unexpected write");}},actor:"agent-a",session:"session-a",now:()=>1000,leaseMs:1000});
 assert.equal((await select([]))?.workId,item.workId);
 assert.equal(await select([item.workId]),null);
});
