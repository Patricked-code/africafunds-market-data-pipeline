import assert from "node:assert/strict";
import test from "node:test";
import {createHmac} from "node:crypto";
import {createGitHubWebhookAuthenticator} from "../src/coordination/githubWebhook.js";
const secret=Buffer.alloc(32,7),head="a".repeat(40);
const repo={id:1315731572,full_name:"Patricked-code/africafunds-market-data-pipeline"};
const base={repository:repo,installation:{id:1234}};
const run={...base,action:"completed",workflow_run:{id:17,run_attempt:2,head_sha:head,event:"pull_request",status:"completed",workflow_id:409761758,conclusion:"success"}};
const pr={...base,action:"closed",number:42,pull_request:{number:42,merged:true,state:"closed",merge_commit_sha:head,base:{ref:"main",repo},head:{repo}}};
const auth=createGitHubWebhookAuthenticator({secret,installationId:1234});
function input(payload:unknown,eventName="workflow_run"){
 const rawBody=Buffer.from(JSON.stringify(payload));
 return {rawBody,eventName,deliveryId:"01234567-abcd-4321-abcd-0123456789ab",signature:"sha256="+createHmac("sha256",secret).update(rawBody).digest("hex")};
}
test("raw signed workflow event binds the exact semantic wake",async()=>{
 const signed=auth(input(run));
 assert.deepEqual(signed.event,{kind:"workflow-completed",runId:17,attempt:2,head});
 assert.equal(await signed.authenticateDelivery(signed.event),true);
 assert.equal(await signed.authenticateDelivery({kind:"workflow-completed",runId:17,attempt:3,head}),false);
 assert.equal(await signed.authenticateDelivery({kind:"pr-merged",number:42,mergeSha:head}),false);
});
test("signed PR merge is accepted only for the same repository and main",async()=>{
 const signed=auth(input(pr,"pull_request"));
 assert.deepEqual(signed.event,{kind:"pr-merged",number:42,mergeSha:head});
 assert.equal(await signed.authenticateDelivery(signed.event),true);
 assert.throws(()=>auth(input({...pr,pull_request:{...pr.pull_request,merged:false}},"pull_request")));
 assert.throws(()=>auth(input({...pr,pull_request:{...pr.pull_request,base:{ref:"other",repo}}},"pull_request")));
});
test("tampering, missing signatures and altered raw serialization fail closed",()=>{
 const signed=input(run);
 assert.throws(()=>auth({...signed,rawBody:Buffer.concat([signed.rawBody,Buffer.from(" ")])}),/SIGNATURE_INVALID/);
 assert.throws(()=>auth({...signed,signature:"sha256="+"0".repeat(64)}),/SIGNATURE_INVALID/);
 assert.throws(()=>auth({...signed,signature:""}),/SIGNATURE_INVALID/);
});
test("foreign repository, installation, unsupported workflow and event are rejected even when signed",()=>{
 assert.throws(()=>auth(input({...run,repository:{...repo,id:99}})));
 assert.throws(()=>auth(input({...run,installation:{id:99}})),/INSTALLATION_MISMATCH/);
 assert.throws(()=>auth(input({...run,workflow_run:{...run.workflow_run,workflow_id:99}})));
 assert.throws(()=>auth(input(run,"issues")),/EVENT_NOT_ADMITTED/);
 assert.throws(()=>auth(input({...pr,number:43},"pull_request")),/PR_IDENTITY_MISMATCH/);
});
test("bounds, invalid secret and invalid delivery cannot authorize",()=>{
 assert.throws(()=>createGitHubWebhookAuthenticator({secret:Buffer.alloc(4),installationId:1234}),/SECRET_INVALID/);
 assert.throws(()=>auth({...input(run),rawBody:Buffer.alloc(2097153)}),/BODY_LIMIT/);
 assert.throws(()=>auth({...input(run),deliveryId:"bad"}));
});
