import {z} from "zod";
import type {MutationGatewayPorts,PreparedMutation} from "./mutationGateway.js";
const root="https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline";
const repoId=1315731572;
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const file=z.string().max(295).regex(/^[A-Za-z0-9_.\/-]+$/)
  .refine(x=>!x.split("/").some(p=>p===""||p==="."||p===".."));
const branch=z.string().max(200).regex(/^(?:work|feat|fix|docs|test|audit)\/[A-Za-z0-9._/-]+$/)
  .refine(x=>!x.includes("..")&&!x.split("/").some(p=>p===""||p==="."||p.startsWith(".")||p.endsWith(".lock")||p.endsWith(".")));
const refSchema=z.object({ref:z.string(),object:z.object({sha,type:z.literal("commit")})});
const commitSchema=z.object({sha,parents:z.array(z.object({sha})).length(1),
  files:z.array(z.object({filename:file,status:z.enum(["added","modified","removed","renamed"]),
    previous_filename:file.optional()})).min(1).max(99)});
const candidateSchema=z.object({branch,expectedHead:sha,candidateHead:sha,paths:z.array(file).min(1).max(100)}).strict()
  .refine(x=>x.expectedHead!==x.candidateHead&&new Set(x.paths).size===x.paths.length);
export interface GitHubPublicationConfig {
  token:string; // Dedicated trusted-runtime credential; never model-visible.
  timeoutMs?:number;
  fetcher?:typeof fetch;
  // Must verify actual effective protections and exclusive trusted writers
  // (including deletion/force-push, not only the coordination ref).
  verifyWriterIsolation(branch:string):Promise<boolean>;
  // Verify independently generated tests, complete Git tree and allowed modes,
  // semantic effects, policy and admission of this immutable candidate.
  // Do not use a model-supplied test result or a mere success flag as proof.
  verifyCandidatePolicy(candidate:PreparedMutation):Promise<boolean>;
}
export type GitHubPublicationPort=Pick<MutationGatewayPorts,"verifyPrepared"|"readHead"|"publishNonForce">;
// Narrow transport for prepared commits only. It cannot create branches,
// commits, PRs, labels, merge, touch main, or change repository administration.
export function createGitHubPublicationPort(config:GitHubPublicationConfig):GitHubPublicationPort {
  const token=z.string().min(1).max(4096).regex(/^[A-Za-z0-9_.-]+$/).safeParse(config.token);
  if(!token.success)throw Error("GITHUB_PUBLICATION_CREDENTIAL_INVALID");
  const timeout=config.timeoutMs??15000;
  if(!Number.isSafeInteger(timeout)||timeout<100||timeout>60000)throw Error("GITHUB_PUBLICATION_TIMEOUT_INVALID");
  const send=config.fetcher??fetch;
  const refPath=(b:string,plural=false)=>"/git/ref"+(plural?"s":"")+"/heads/"+branch.parse(b).split("/").map(encodeURIComponent).join("/");
  async function request(method:"GET"|"PATCH",path:string,body?:unknown){
    let response:Response;
    try{
      response=await send(root+path,{method,redirect:"error",signal:AbortSignal.timeout(timeout),
        headers:{Authorization:"Bearer "+token.data,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",
          ...(body===undefined?{}:{"Content-Type":"application/json"})},
        ...(body===undefined?{}:{body:JSON.stringify(body)})});
    }catch{throw Error("GITHUB_PUBLICATION_TRANSPORT_UNCONFIRMED");}
    if(!response.ok)throw Error("GITHUB_PUBLICATION_HTTP_"+response.status);
    // No silent truncation, no following untrusted pagination URLs.
    if(response.headers.get("link")?.includes('rel="next"'))throw Error("GITHUB_PUBLICATION_PAGINATED");
    try{return await response.json();}catch{throw Error("GITHUB_PUBLICATION_RESPONSE_UNCONFIRMED");}
  }
  async function readHead(b:string):Promise<string>{
    const result=refSchema.parse(await request("GET",refPath(b)));
    if(result.ref!=="refs/heads/"+b)throw Error("GITHUB_PUBLICATION_REF_MISMATCH");
    return result.object.sha;
  }
  async function verifyPrepared(raw:PreparedMutation):Promise<boolean>{
    const candidate=candidateSchema.parse(raw);
    const repository=z.object({id:z.literal(repoId)}).parse(await request("GET",""));
    if(repository.id!==repoId)throw Error("GITHUB_PUBLICATION_REPO_MISMATCH");
    const commit=commitSchema.parse(await request("GET","/commits/"+candidate.candidateHead+"?per_page=100&page=1"));
    if(commit.sha!==candidate.candidateHead||commit.parents[0]?.sha!==candidate.expectedHead)
      throw Error("GITHUB_PUBLICATION_PARENT_MISMATCH");
    const paths=new Set<string>();
    for(const f of commit.files){
      if((f.status==="renamed")!==(f.previous_filename!==undefined))throw Error("GITHUB_PUBLICATION_RENAME_UNVERIFIED");
      paths.add(f.filename);if(f.previous_filename)paths.add(f.previous_filename);
    }
    if(paths.size!==candidate.paths.length||candidate.paths.some(p=>!paths.has(p)))
      throw Error("GITHUB_PUBLICATION_DIFF_MISMATCH");
    return (await config.verifyCandidatePolicy(candidate))===true;
  }
  return {readHead,verifyPrepared,async publishNonForce(raw){
    const candidate=candidateSchema.parse(raw);
    if(await verifyPrepared(candidate)!==true)throw Error("GITHUB_PUBLICATION_POLICY_DENIED");
    if(await config.verifyWriterIsolation(candidate.branch)!==true)throw Error("GITHUB_PUBLICATION_WRITER_ISOLATION_REQUIRED");
    if(await readHead(candidate.branch)!==candidate.expectedHead)throw Error("GITHUB_PUBLICATION_STALE_HEAD");
    // Immutable single-parent candidate + non-force update + effective
    // writer protections prevent silently overwriting competing histories.
    const result=refSchema.parse(await request("PATCH",refPath(candidate.branch,true),
      {sha:candidate.candidateHead,force:false}));
    if(result.ref!=="refs/heads/"+candidate.branch||result.object.sha!==candidate.candidateHead)
      throw Error("GITHUB_PUBLICATION_REF_UNCONFIRMED");
  }};
}
