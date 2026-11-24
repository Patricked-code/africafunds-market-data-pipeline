import {createHmac,timingSafeEqual} from "node:crypto";
import {z} from "zod";
import type {GitHubDirectorEvent} from "./githubDirector.js";

const positive=z.number().int().positive().safe();
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const repo=z.object({id:z.literal(1315731572),full_name:z.literal("Patricked-code/africafunds-market-data-pipeline")});
const envelope=z.object({repository:repo,installation:z.object({id:positive})});
const workflow=envelope.extend({action:z.literal("completed"),workflow_run:z.object({
 id:positive,run_attempt:positive,head_sha:sha,event:z.literal("pull_request"),status:z.literal("completed"),
 workflow_id:z.union([z.literal(409761758),z.literal(410494947)]),conclusion:z.enum(["success","failure"])
})});
const merged=envelope.extend({action:z.literal("closed"),number:positive,pull_request:z.object({
 number:positive,merged:z.literal(true),state:z.literal("closed"),merge_commit_sha:sha,
 base:z.object({ref:z.literal("main"),repo}),head:z.object({repo})
})});
const delivery=z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
export interface WebhookInput {
 rawBody:Uint8Array;
 signature:string;
 eventName:string;
 deliveryId:string;
}
export interface WebhookConfig {
 secret:Uint8Array;
 installationId:number;
}
export interface AuthenticatedDirectorDelivery {
 readonly deliveryId:string;
 readonly event:Readonly<GitHubDirectorEvent>;
 // Bound to this authenticated invocation. The semantic wake receipt is
 // persisted by the existing director; this is not a second replay registry.
 authenticateDelivery(event:GitHubDirectorEvent):Promise<boolean>;
}
// Call only from a trusted HTTP adapter that supplies the exact, unmodified
// body and rejects duplicate/ambiguous signature headers. No network listener
// or privileged mutation is performed by this module.
export function createGitHubWebhookAuthenticator(config:WebhookConfig){
 const id=positive.parse(config.installationId);
 if(config.secret.byteLength<32||config.secret.byteLength>1024)throw Error("WEBHOOK_SECRET_INVALID");
 const secret=Buffer.from(config.secret);
 return (input:WebhookInput):AuthenticatedDirectorDelivery=>{
  if(input.rawBody.byteLength<1||input.rawBody.byteLength>2097152)throw Error("WEBHOOK_BODY_LIMIT");
  if(!/^sha256=[a-f0-9]{64}$/.test(input.signature))throw Error("WEBHOOK_SIGNATURE_INVALID");
  const body=Buffer.from(input.rawBody);
  const actual=createHmac("sha256",secret).update(body).digest();
  const claimed=Buffer.from(input.signature.slice(7),"hex");
  if(!timingSafeEqual(actual,claimed))throw Error("WEBHOOK_SIGNATURE_INVALID");
  const deliveryId=delivery.parse(input.deliveryId);
  let payload:unknown;
  try{payload=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(body));}
  catch{throw Error("WEBHOOK_PAYLOAD_INVALID");}
  const base=envelope.parse(payload);
  if(base.installation.id!==id)throw Error("WEBHOOK_INSTALLATION_MISMATCH");
  let event:GitHubDirectorEvent;
  if(input.eventName==="workflow_run"){
   const p=workflow.parse(payload).workflow_run;
   event={kind:"workflow-completed",runId:p.id,attempt:p.run_attempt,head:p.head_sha};
  }else if(input.eventName==="pull_request"){
   const p=merged.parse(payload);
   if(p.number!==p.pull_request.number)throw Error("WEBHOOK_PR_IDENTITY_MISMATCH");
   event={kind:"pr-merged",number:p.number,mergeSha:p.pull_request.merge_commit_sha};
  }else throw Error("WEBHOOK_EVENT_NOT_ADMITTED");
  const frozen=Object.freeze(event);
  return Object.freeze({deliveryId,event:frozen,async authenticateDelivery(candidate:GitHubDirectorEvent){
   if(frozen.kind==="workflow-completed"&&candidate.kind==="workflow-completed")
    return candidate.runId===frozen.runId&&candidate.attempt===frozen.attempt&&candidate.head===frozen.head;
   if(frozen.kind==="pr-merged"&&candidate.kind==="pr-merged")
    return candidate.number===frozen.number&&candidate.mergeSha===frozen.mergeSha;
   return false;
  }});
 };
}
