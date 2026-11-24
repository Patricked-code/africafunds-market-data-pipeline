import assert from "node:assert/strict";
import test from "node:test";
import {deriveGitHubWake,runGitHubDirectorWake,assertCoordinationRuleset,type GitHubDirectorRead} from "../src/coordination/githubDirector.js";
import {emptyState,type ClaimStore} from "../src/coordination/agentClaims.js";
const repo={id:1315731572},headSha="a".repeat(40),mergeSha="b".repeat(40);
const head={repo,sha:headSha},base={repo,ref:"main"};
const event={kind:"workflow-completed" as const,runId:123,attempt:2,head:headSha};
const run={id:123,run_attempt:2,workflow_id:409761758,event:"pull_request",status:"completed",conclusion:"success",
  head_sha:headSha,repository:repo,head_repository:repo,pull_requests:[{number:42,base,head}]};
const open={number:42,state:"open",merged:false,base,head,merge_commit_sha:null};
const merged={...open,state:"closed",merged:true,merge_commit_sha:mergeSha};
function reader(values:Record<string,unknown>):GitHubDirectorRead{return async(path)=>{if(!(path in values))throw Error("unexpected "+path);return values[path];};}
test("derive exact CI semantic key from live workflow and PR",async()=>{
  const read=reader({"/actions/runs/123":run,"/pulls/42":open});
  assert.deepEqual(await deriveGitHubWake(event,read),{kind:"ci-completed",key:"ci:123:2",head:headSha,evidence:"ci:123"});
  assert.equal((await deriveGitHubWake(event,reader({"/actions/runs/123":{...run,conclusion:"failure"},"/pulls/42":open}))).kind,"ci-completed");
});
test("reject forged workflow, foreign repo, stale attempt, changed PR and ambiguous association",async()=>{
  for(const wrong of [{...run,workflow_id:1},{...run,head_repository:{id:1}},{...run,run_attempt:1},{...run,pull_requests:[]}]){
    await assert.rejects(deriveGitHubWake(event,reader({"/actions/runs/123":wrong,"/pulls/42":open})));
  }
  await assert.rejects(deriveGitHubWake(event,reader({"/actions/runs/123":run,"/pulls/42":{...open,head:{...head,sha:mergeSha}}})),/STALE/);
});
test("merge wake requires actual merged PR and ancestor of main",async()=>{
  const e={kind:"pr-merged" as const,number:42,mergeSha};
  const compare="/compare/"+mergeSha+"...main";
  assert.deepEqual(await deriveGitHubWake(e,reader({"/pulls/42":merged,[compare]:{status:"ahead",merge_base_commit:{sha:mergeSha}}})),
    {kind:"pr-merged",key:"pr:42:"+mergeSha,head:mergeSha,evidence:"pr:42"});
  await assert.rejects(deriveGitHubWake(e,reader({"/pulls/42":open})),/UNVERIFIED_MERGE/);
  await assert.rejects(deriveGitHubWake(e,reader({"/pulls/42":merged,[compare]:{status:"ahead",merge_base_commit:{sha:headSha}}})),/MERGE_NOT_ON_MAIN/);
});
test("authenticated transport calls existing director and persists receipt; untrusted delivery cannot dispatch",async()=>{
  let state=emptyState(),version="0",selections=0,reads=0;
  const store:ClaimStore={async read(){return {version,state:structuredClone(state)};},
    async compareAndSwap(v,s){if(v!==version)throw Error("CAS");state=structuredClone(s);version=String(s.revision);return version;}};
  const read=reader({"/actions/runs/123":run,"/pulls/42":open});
  const ports={store,actor:"agent-a",session:"event-a",now:()=>1000,leaseMs:1000,maxUnits:1,
    async readGitHub(path:string){reads++;return read(path);},
    async authenticateDelivery(){return true;},
    async selectNext(){selections++;return null;},async execute(){throw Error("unexpected");}};
  await assert.rejects(runGitHubDirectorWake(event,{...ports,async authenticateDelivery(){return false;}}),/UNAUTHENTICATED/);
  assert.equal(reads,0);assert.equal(selections,0);
  assert.deepEqual(await runGitHubDirectorWake(event,ports),{status:"executed",stop:"no-work",finished:[]});
  assert.equal(state.wakeReceipts?.[0]?.outcome,"no-work");
  assert.deepEqual(await runGitHubDirectorWake(event,ports),{status:"duplicate",finished:[]});
  assert.equal(selections,1);
});
test("coordination ref preflight refuses main-only ruleset, bypass, and missing force/delete protections",async()=>{
  const rule={id:1,target:"branch",enforcement:"active",source:"Patricked-code/africafunds-market-data-pipeline",
    conditions:{ref_name:{include:["refs/heads/coordination/sadiaaf-agent-state"],exclude:[]}},
    bypass_actors:[],current_user_can_bypass:"never",rules:[{type:"deletion"},{type:"non_fast_forward"}]};
  await assert.doesNotReject(assertCoordinationRuleset(reader({"/rulesets/1":rule}),1));
  for(const wrong of [{...rule,conditions:{ref_name:{include:["refs/heads/main"],exclude:[]}}},
    {...rule,bypass_actors:[{}]},{...rule,rules:[{type:"deletion"}]}]){
    await assert.rejects(assertCoordinationRuleset(reader({"/rulesets/1":wrong}),1));
  }
});
