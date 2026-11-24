import assert from "node:assert/strict";
import test from "node:test";
import {createHmac} from "node:crypto";
import {createGitHubWebhookAuthenticator} from "../src/coordination/githubWebhook.js";
import {createGitHubWebhookHttpHandler,admitGitHubDelivery} from "../src/coordination/githubWebhookHttp.js";
import {emptyState,type ClaimStore,type State} from "../src/coordination/agentClaims.js";
const secret=Buffer.alloc(32,5),head="a".repeat(40);
const repo={id:1315731572,full_name:"Patricked-code/africafunds-market-data-pipeline"};
const payload={repository:repo,installation:{id:7},action:"closed",number:42,pull_request:{number:42,merged:true,state:"closed",merge_commit_sha:head,base:{ref:"main",repo},head:{repo}}};
const authenticate=createGitHubWebhookAuthenticator({secret,installationId:7});
function req(options:{path?:string;signature?:string;body?:string;method?:string;type?:string}={}){
 const body=options.body??JSON.stringify(payload),signature=options.signature??"sha256="+createHmac("sha256",secret).update(body).digest("hex");
 const method=options.method??"POST";
 return new Request("https://example.invalid"+(options.path??"/webhooks/sadiaaf/github"),{method,headers:{"content-type":options.type??"application/json",
 "x-hub-signature-256":signature,"x-github-event":"pull_request","x-github-delivery":"01234567-abcd-4321-abcd-0123456789ab"},...(method==="GET"?{}:{body})});
}
test("HTTP acknowledges only durable canonical receipt; no coding pass during callback",async()=>{
 let state:State=emptyState(),version=0;
 const store:ClaimStore={async read(){return {state,version:String(version)};},async compareAndSwap(v,s){assert.equal(v,String(version));state=s;return String(++version);}};
 const handler=createGitHubWebhookHttpHandler({authenticate,admit:d=>admitGitHubDelivery(d,{store,actor:"app",session:"receive",now:()=>1000+version,
  async readGitHub(path){if(path==="/pulls/42")return {number:42,state:"closed",merged:true,merge_commit_sha:head,base:{ref:"main",repo},head:{sha:head,repo}};
   if(path==="/compare/"+head+"...main")return {status:"ahead",merge_base_commit:{sha:head}};throw Error("unexpected path");}})});
 assert.equal((await handler(req())).status,202);assert.equal(state.wakeReceipts?.[0]?.outcome,"accepted");
 assert.equal((await handler(req())).status,200);assert.equal(version,1);
});
test("bad signatures, routes, methods and media do not admit",async()=>{
 let calls=0;const handler=createGitHubWebhookHttpHandler({authenticate,async admit(){calls++;throw Error("unexpected");}});
 assert.equal((await handler(req({signature:"sha256:"+"a".repeat(64)}))).status,401);
 assert.equal((await handler(req({signature:"sha256="+"a".repeat(64)}))).status,401);
 assert.equal((await handler(req({path:"/other"}))).status,404);
 assert.equal((await handler(req({method:"GET"}))).status,405);
 assert.equal((await handler(req({type:"text/plain"}))).status,415);assert.equal(calls,0);
});
test("storage uncertainty is not acknowledged; pending receipt requires reconciliation",async()=>{
 const bad=createGitHubWebhookHttpHandler({authenticate,async admit(){throw Error("CAS");}});
 assert.equal((await bad(req())).status,503);
 const pending=createGitHubWebhookHttpHandler({authenticate,async admit(){return {status:"reconciliation-required",key:"pr:42:"+head};}});
 assert.equal((await pending(req())).status,409);
});
test("oversize payload and malformed signed input fail before admission",async()=>{
 const handler=createGitHubWebhookHttpHandler({authenticate,async admit(){throw Error("unexpected");}});
 assert.equal((await handler(req({body:"x".repeat(2097153)}))).status,400);
 assert.equal((await handler(req({body:"bad json"}))).status,401);
});
