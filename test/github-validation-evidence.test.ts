import assert from "node:assert/strict";
import test from "node:test";
import {createGitHubValidationEvidence} from "../src/coordination/githubValidationEvidence.js";
import {codingSubject,type CodingResult} from "../src/coordination/modelCoder.js";
import type {ValidationRecord} from "../src/coordination/isolatedValidation.js";
const root="https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline";
const head="a".repeat(40),suite="b".repeat(64),date="2026-11-24T06:30:00Z";
const ids=["valid-leap","valid-date","timezone","date-object","invalid-text","invalid-object","days-between","bucket-365","bucket-366","invalid-feb30","invalid-leap","invalid-apr31","invalid-month13","invalid-month00","invalid-day00","century-leap","century-nonleap","year-0001"];
const changes=[{path:"src/utils/dates.ts",originalSha256:"c".repeat(64),content:"candidate"}];
function sample(pass:boolean):ValidationRecord{return {head,suite,subject:codingSubject(head,pass?changes:[]),status:pass?"pass":"fail",diagnostics:pass?[]:["invalid-feb30"],observed:ids.map(id=>({id,kind:"throw"}))};}
function fixture(){
 const comments=new Map<number,Record<string,unknown>>();let writes=0;
 const fetcher:typeof fetch=async(url,options)=>{
  const path=String(url).slice(root.length);assert.ok(String(url).startsWith(root));assert.equal(options?.redirect,"error");
  if(options?.method==="POST"){assert.equal(path,"/issues/9/comments");const id=++writes;
   const value={id,issue_url:root+"/issues/9",body:JSON.parse(String(options.body)).body,created_at:date,updated_at:date,user:{id:20,type:"Bot"},performed_via_github_app:{id:10}};comments.set(id,value);return new Response(JSON.stringify(value));}
  assert.equal(options?.method,"GET");return new Response(JSON.stringify(comments.get(Number(path.split("/").at(-1)))));
 };
 return {comments,port:createGitHubValidationEvidence({token:"test-token",appId:10,botUserId:20,expectedSuite:suite,fetcher})};
}
async function pair(f=fixture()){
 const red=sample(false),green=sample(true);
 const redRef=await f.port.persistEvidence(red),greenRef=await f.port.persistEvidence(green);
 const candidate:Extract<CodingResult,{outcome:"validated"}>={outcome:"validated",workId:"w",branch:"work/a",head,changes,
 red:{status:"fail",subject:red.subject,suite,evidence:redRef,diagnostics:red.diagnostics},
 green:{status:"pass",subject:green.subject,suite,evidence:greenRef,diagnostics:[]}};
 return {f,candidate};
}
test("persists exact evidence in existing issue, then independently verifies both records",async()=>{
 const {f,candidate}=await pair();assert.equal(f.comments.size,2);assert.equal(await f.port.verifyEvidence(candidate),true);
 assert.equal(await f.port.verifyEvidence({...candidate,changes:[{...changes[0]!,content:"different"}]}),false);
});
test("rejects altered authors and edited evidence",async()=>{
 const {f,candidate}=await pair();const c=f.comments.get(2)!;
 c.performed_via_github_app={id:999};await assert.rejects(f.port.verifyEvidence(candidate),/AUTHOR/);
 c.performed_via_github_app={id:10};c.updated_at="2026-11-24T06:31:00Z";await assert.rejects(f.port.verifyEvidence(candidate),/VERSION/);
});
test("rejects altered encoded payload and wrong suite",async()=>{
 const {f,candidate}=await pair();const c=f.comments.get(2)!;
 const e=JSON.parse(String(c.body).split("\n")[1]!);e.recordHash="d".repeat(64);c.body="SADIAAF_VALIDATION_EVIDENCE_V1\n"+JSON.stringify(e);
 await assert.rejects(f.port.verifyEvidence(candidate),/HASH/);
 await assert.rejects(f.port.persistEvidence({...sample(true),suite:"d".repeat(64)}),/SUITE/);
});
test("rejects duplicate observed cases and incomplete records before writes",async()=>{
 const f=fixture(),r=sample(false);
 await assert.rejects(f.port.persistEvidence({...r,observed:r.observed.slice(1)}));
 await assert.rejects(f.port.persistEvidence({...r,observed:Array.from({length:18},()=>r.observed[0]!)}));
 assert.equal(f.comments.size,0);
});
