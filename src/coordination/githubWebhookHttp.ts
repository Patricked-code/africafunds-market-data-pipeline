import {admitDeferredDirectorWake,type DeferredWakeAdmissionPorts} from "./agentClaims.js";
import {deriveGitHubWake,type GitHubDirectorRead} from "./githubDirector.js";
import type {AuthenticatedDirectorDelivery,createGitHubWebhookAuthenticator} from "./githubWebhook.js";

const limit=2097152;
type Receipt=Awaited<ReturnType<typeof admitDeferredDirectorWake>>;
export interface WebhookAdmissionPorts extends Omit<DeferredWakeAdmissionPorts,"verifySignal">{
 readGitHub:GitHubDirectorRead;
}
// The HTTP receiver uses the same authenticated event and live-object check
// as the director. It must acknowledge only a durable receipt, not run a
// potentially minutes-long model request in a GitHub HTTP callback.
export async function admitGitHubDelivery(d:AuthenticatedDirectorDelivery,ports:WebhookAdmissionPorts):Promise<Receipt>{
 if(await d.authenticateDelivery(d.event)!==true)throw Error("UNAUTHENTICATED_DELIVERY");
 const signal=await deriveGitHubWake(d.event,ports.readGitHub);
 return admitDeferredDirectorWake(signal,{...ports,async verifySignal(s){
  const live=await deriveGitHubWake(d.event,ports.readGitHub);
  return live.kind===s.kind&&live.key===s.key&&live.head===s.head&&live.evidence===s.evidence;
 }});
}
export interface WebhookHttpConfig {
 authenticate:ReturnType<typeof createGitHubWebhookAuthenticator>;
 admit(delivery:AuthenticatedDirectorDelivery):Promise<Receipt>;
 bodyTimeoutMs?:number;
}
async function readBounded(request:Request,timeout:number){
 if(!request.body)throw Error("WEBHOOK_BODY_REQUIRED");
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const expired=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error("WEBHOOK_BODY_TIMEOUT")),timeout);});
 try{
  while(true){
   const part=await Promise.race([reader.read(),expired]);
   if(part.done)break;
   size+=part.value.byteLength;if(size>limit)throw Error("WEBHOOK_BODY_LIMIT");
   chunks.push(part.value);
  }
  if(size<1)throw Error("WEBHOOK_BODY_REQUIRED");
  return Buffer.concat(chunks,size);
 }finally{
  if(timer!==undefined)clearTimeout(timer);
  void reader.cancel().catch(()=>undefined);
  reader.releaseLock();
 }
}
// Use behind an explicitly authorized trusted HTTPS server with request
// concurrency/rate limits. No network listener or secret provision here.
export function createGitHubWebhookHttpHandler(config:WebhookHttpConfig){
 const timeout=config.bodyTimeoutMs??3000;
 if(!Number.isSafeInteger(timeout)||timeout<100||timeout>5000)throw Error("WEBHOOK_HTTP_TIMEOUT_INVALID");
 const reply=(status:number,code:string)=>Response.json({status:code},{status,headers:{"Cache-Control":"no-store"}});
 return async(request:Request):Promise<Response>=>{
  const url=new URL(request.url);
  if(url.pathname!=="/webhooks/sadiaaf/github"||url.search)return reply(404,"not-found");
  if(request.method!=="POST")return reply(405,"method-not-allowed");
  const type=request.headers.get("content-type")??"";
  const encoding=request.headers.get("content-encoding");
  if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(type)||(encoding!==null&&encoding!=="identity"))
   return reply(415,"unsupported-media");
  const len=request.headers.get("content-length");
  if(len!==null&&(!/^\d{1,7}$/.test(len)||Number(len)>limit))return reply(413,"body-limit");
  const signature=request.headers.get("x-hub-signature-256")??"";
  const eventName=request.headers.get("x-github-event")??"";
  const deliveryId=request.headers.get("x-github-delivery")??"";
  if(!/^sha256=[a-f0-9]{64}$/.test(signature))return reply(401,"signature-required");
  if(!/^(workflow_run|pull_request)$/.test(eventName)||!/^[a-f0-9-]{36}$/i.test(deliveryId))return reply(400,"event-invalid");
  let body:Uint8Array;
  try{body=await readBounded(request,timeout);}catch{return reply(400,"body-invalid");}
  if(len!==null&&Number(len)!==body.byteLength)return reply(400,"body-length-mismatch");
  let d:AuthenticatedDirectorDelivery;
  try{d=config.authenticate({rawBody:body,signature,eventName,deliveryId});}catch{return reply(401,"delivery-rejected");}
  try{
   const receipt=await config.admit(d);
   if(receipt.status==="accepted")return reply(202,"accepted");
   if(receipt.status==="duplicate")return reply(200,"duplicate");
   return reply(409,"reconciliation-required");
  }catch{return reply(503,"admission-unconfirmed");}
 };
}
