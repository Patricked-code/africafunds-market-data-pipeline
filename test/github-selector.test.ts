import test from "node:test";
import assert from "node:assert/strict";
import {inspectGitHubSelection,createGitHubWorkSelector,type CanonicalWorkAdmission,type GitHubSelectorPorts} from "../src/coordination/githubSelector.js";
import {CONTINUITY_ID,emptyState,transition,type State} from "../src/coordination/agentClaims.js";
const main="a".repeat(40),head="b".repeat(40),merge="c".repeat(40),repo={id:1315731572};
const a:CanonicalWorkAdmission={continuity:CONTINUITY_ID,workId:"task-a",issue:9,lot:11,priority:1,mainSha:main,branch:"work/sadiaaf-issue-9-a",head:main,pr:null,dependsOnPr:[],scopes:["file:src/a.ts"],nextAction:"Repair a",acceptance:"Tests pass"};
const b:CanonicalWorkAdmission={...a,workId:"task-b",priority:2,branch:"work/sadiaaf-issue-9-b",scopes:["file:src/b.ts"]};
const p={number:37,state:"closed",merged:true,merge_commit_sha:merge,base:{ref:"main",repo},head:{sha:head,ref:"feat/existing",repo}};
function fixture(admissions:unknown=[b,a],values:Record<string,unknown>={},state:State=emptyState()):GitHubSelectorPorts{
 const data:Record<string,unknown>={"/branches/main":{name:"main",protected:true,commit:{sha:main}},"/issues/9":{number:9,state:"open"},"/pulls/37":p,["/compare/"+merge+"...main"]:{status:"ahead",merge_base_commit:{sha:merge}},...values};
 return {actor:"agent-a",session:"session-a",now:()=>1000,leaseMs:1000,
  async readGitHub(path){if(path in data)return data[path];if(path.startsWith("/git/ref/heads/work/"))throw Error("GITHUB_HTTP_404");throw Error("unexpected "+path);},
  async readCanonicalAdmissions(){return admissions;},store:{async read(){return {version:"1",state};},async compareAndSwap(){throw Error("selector must not write");}}};
}
test("selects deterministic priority and next work without writing",async()=>{
 const select=createGitHubWorkSelector(fixture());
 assert.equal((await select([]))?.workId,"task-a");
 assert.equal((await select(["task-a"]))?.workId,"task-b");
 assert.equal(await select(["task-a","task-b"]),null);
});
test("requires live merged dependency on main",async()=>{
 const item={...a,dependsOnPr:[37]};
 assert.equal((await inspectGitHubSelection(fixture([item,b]),[])).candidate?.workId,"task-a");
 const r=await inspectGitHubSelection(fixture([item,b],{"/pulls/37":{...p,merged:false,state:"open",merge_commit_sha:null}}),[]);
 assert.equal(r.candidate?.workId,"task-b");assert.equal(r.blocked[0]?.reason,"DEPENDENCY_NOT_PROVEN_ON_MAIN");
});
test("skips occupied and expired claims until explicitly recovered",async()=>{
 const state=transition(emptyState(),{kind:"claim",workId:"other",lot:11,branch:"other",base:main,scopes:["file:src/a.ts"],actor:"other",session:"other",leaseMs:1000,trace:{head:main,nextAction:"occupied",evidence:["issue:9"]}},0);
 const r=await inspectGitHubSelection(fixture([a,b],{},state),[]);
 assert.equal(r.candidate?.workId,"task-b");assert.equal(r.blocked[0]?.reason,"SCOPE_OCCUPIED");
});
test("rejects stale or duplicate authorization and existing new branch",async()=>{
 const stale={...a,mainSha:head,head};
 assert.equal((await inspectGitHubSelection(fixture([stale,b]),[])).candidate?.workId,"task-b");
 await assert.rejects(inspectGitHubSelection(fixture([a,a]),[]),/DUPLICATE/);
 const r=await inspectGitHubSelection(fixture([a,b],{["/git/ref/heads/"+a.branch]:{object:{sha:main}}}),[]);
 assert.equal(r.candidate?.workId,"task-b");assert.equal(r.blocked[0]?.reason,"BRANCH_RECONCILIATION_REQUIRED");
});
test("requires exact existing PR head and same repo",async()=>{
 const item={...a,pr:42,head,branch:"feat/existing"};
 const live={...p,number:42,state:"open",merged:false,merge_commit_sha:null};
 assert.equal((await inspectGitHubSelection(fixture([item],{"/pulls/42":live}),[])).candidate?.base,head);
 assert.equal((await inspectGitHubSelection(fixture([item],{"/pulls/42":{...live,head:{...live.head,sha:main}}}),[])).candidate,null);
 await assert.rejects(inspectGitHubSelection(fixture([item],{"/pulls/42":{...live,head:{...live.head,repo:{id:1}}}}),[]));
});
