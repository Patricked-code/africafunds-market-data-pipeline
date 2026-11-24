import {z} from "zod";
import {stateSchema,type GitHubRequest} from "./agentClaims.js";
import {assertCoordinationRuleset} from "./githubDirector.js";
const root="https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline";
const readRef="/git/ref/heads/coordination/sadiaaf-agent-state";
const writeRef="/git/refs/heads/coordination/sadiaaf-agent-state";
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const readPath=/^\/(?:actions\/runs\/[1-9][0-9]*|pulls\/[1-9][0-9]*|rulesets\/[1-9][0-9]*|compare\/[a-f0-9]{40}\.\.\.main|contents\/agent-claims\.json\?ref=[a-f0-9]{40})$/;
const selectorReadPath=/^\/(?:branches\/main|issues\/[1-9][0-9]*|git\/ref\/heads\/work\/sadiaaf-issue-[1-9][0-9]*-[a-z0-9-]+)$/;
const treeBody=z.object({tree:z.array(z.object({path:z.literal("agent-claims.json"),mode:z.literal("100644"),type:z.literal("blob"),content:z.string().max(8000000)}).strict()).length(1)}).strict();
const commitBody=z.object({message:z.string().regex(/^coordination: [a-z-]+ [A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),tree:sha,parents:z.array(sha).length(1)}).strict();
const updateBody=z.object({sha,force:z.literal(false)}).strict();
export interface GitHubTransportConfig {
  token:string; // Runtime credential, never serialize.
  coordinationRulesetId?:number;
  timeoutMs?:number;
  fetcher?:typeof fetch;
}
// Trusted runtime transport, not a general API proxy or a model client.
export function createGitHubRequest(config:GitHubTransportConfig):GitHubRequest {
  const token=z.string().min(1).max(4096).regex(/^[A-Za-z0-9_.-]+$/).safeParse(config.token);
  if(!token.success)throw Error("GITHUB_RUNTIME_CREDENTIAL_INVALID");
  const timeout=config.timeoutMs??15000;
  if(!Number.isSafeInteger(timeout)||timeout<100||timeout>60000)throw Error("GITHUB_TIMEOUT_INVALID");
  const rule=config.coordinationRulesetId;
  if(rule!==undefined)z.number().int().positive().safe().parse(rule);
  const fetcher=config.fetcher??fetch;
  const send:GitHubRequest=async(method,path,body)=>{
    if(method==="GET"){
      if((path!==readRef&&!readPath.test(path)&&!selectorReadPath.test(path))||body!==undefined)throw Error("GITHUB_PATH_NOT_ALLOWED");
    }else{
      if(rule===undefined)throw Error("GITHUB_COORDINATION_WRITES_DISABLED");
      if(method==="POST"&&path==="/git/trees"){
        const parsed=treeBody.parse(body);
        stateSchema.parse(JSON.parse(parsed.tree[0]!.content));
        body=parsed;
      }else if(method==="POST"&&path==="/git/commits")body=commitBody.parse(body);
      else if(method==="PATCH"&&path===writeRef)body=updateBody.parse(body);
      else throw Error("GITHUB_PATH_NOT_ALLOWED");
      // Fail closed on missing protection; does not certify writer ACLs.
      await assertCoordinationRuleset(p=>send("GET",p),rule);
    }
    let response:Response;
    try{
      response=await fetcher(root+path,{method,redirect:"error",signal:AbortSignal.timeout(timeout),
        headers:{Authorization:"Bearer "+token.data,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(body===undefined?{}:{"Content-Type":"application/json"})},
        ...(body===undefined?{}:{body:JSON.stringify(body)})});
    }catch{throw Error("GITHUB_TRANSPORT_UNCONFIRMED");}
    if(!response.ok)throw Error("GITHUB_HTTP_"+response.status);
    try{return await response.json();}catch{throw Error("GITHUB_RESPONSE_UNCONFIRMED");}
  };
  return send;
}
