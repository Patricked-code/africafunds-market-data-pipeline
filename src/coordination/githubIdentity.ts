import {createPrivateKey,sign,type KeyObject} from "node:crypto";
import {z} from "zod";

const root="https://api.github.com";
const repo="Patricked-code/africafunds-market-data-pipeline";
const repoId=1315731572, ownerId=270385782;
const positive=z.number().int().positive().safe();
const slug=z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/);
const app=z.object({id:positive,slug});
const installation=z.object({id:positive,app_id:positive,account:z.object({id:positive,login:z.literal("Patricked-code")}),suspended_at:z.null()});
const repository=z.object({id:z.literal(repoId),full_name:z.literal(repo)});
const permissionSchema=z.object({contents:z.enum(["read","write"]),metadata:z.literal("read"),issues:z.enum(["read","write"]),pull_requests:z.literal("read")}).strict();
const tokenResponse=z.object({token:z.string().min(20).max(4096).regex(/^[A-Za-z0-9_.-]+$/),expires_at:z.string().datetime(),permissions:permissionSchema,repositories:z.array(repository).length(1)});
const visibleRepos=z.object({total_count:z.literal(1),repositories:z.array(repository).length(1)});
export type RuntimeCredentialMode="read"|"publish"|"evidence";
export interface GitHubAppIdentityConfig {
  appId:number;appSlug:string;installationId:number;
  // Supplied by a trusted secret store, not by GitHub issue text or model.
  privateKey:string|KeyObject;
  now():number;
  fetcher?:typeof fetch;
  timeoutMs?:number;
}
export interface RuntimeCredential {
  actor:string;
  expiresAt:number;
  // Trusted transport construction only. Never return from an API or log.
  token:string;
}
function jwt(key:KeyObject,appId:number,now:number):string{
  const iat=Math.floor(now/1000)-30;
  const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const data=encode({alg:"RS256",typ:"JWT"})+"."+encode({iat,exp:iat+540,iss:String(appId)});
  return data+"."+sign("RSA-SHA256",Buffer.from(data),key).toString("base64url");
}
// The broker owns the App key and temporary installation token. Neither is
// passed to the model or included in durable state. This verifies credential
// scope, not branch rulesets, exclusive writers or a running service.
export function createGitHubAppIdentity(config:GitHubAppIdentityConfig){
  const appId=positive.parse(config.appId),appSlug=slug.parse(config.appSlug),installationId=positive.parse(config.installationId);
  const timeout=config.timeoutMs??15000;
  if(!Number.isSafeInteger(timeout)||timeout<100||timeout>60000)throw Error("APP_IDENTITY_TIMEOUT_INVALID");
  let key:KeyObject;
  try{key=typeof config.privateKey==="string"?createPrivateKey(config.privateKey):config.privateKey;}
  catch{throw Error("APP_PRIVATE_KEY_INVALID");}
  if(key.type!=="private"||key.asymmetricKeyType!=="rsa"||(key.asymmetricKeyDetails?.modulusLength??0)<2048)
    throw Error("APP_PRIVATE_KEY_INVALID");
  const now=()=>{const n=config.now();if(!Number.isSafeInteger(n)||n<60000)throw Error("APP_CLOCK_INVALID");return n;};
  const fetcher=config.fetcher??fetch;
  async function request(method:"GET"|"POST",path:string,credential:string,body?:unknown):Promise<unknown>{
    let response:Response;
    try{response=await fetcher(root+path,{method,redirect:"error",signal:AbortSignal.timeout(timeout),
      headers:{Authorization:"Bearer "+credential,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",
      ...(body===undefined?{}:{"Content-Type":"application/json"})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
    catch{throw Error("APP_IDENTITY_TRANSPORT_UNCONFIRMED");}
    if(!response.ok)throw Error("APP_IDENTITY_HTTP_"+response.status);
    if(response.headers.get("link")?.includes('rel="next"'))throw Error("APP_IDENTITY_SCOPE_PAGINATED");
    try{return await response.json();}catch{throw Error("APP_IDENTITY_RESPONSE_INVALID");}
  }
  const actor="github-app:"+appId+":installation:"+installationId;
  return {actor,async issue(mode:RuntimeCredentialMode):Promise<RuntimeCredential>{
    if(mode!=="read"&&mode!=="publish"&&mode!=="evidence")throw Error("APP_CREDENTIAL_MODE_INVALID");
    const auth=jwt(key,appId,now());
    const identity=app.safeParse(await request("GET","/app",auth));
    if(!identity.success||identity.data.id!==appId||identity.data.slug!==appSlug)
      throw Error("APP_IDENTITY_MISMATCH");
    const bound=installation.safeParse(await request("GET","/repos/"+repo+"/installation",auth));
    if(!bound.success||bound.data.id!==installationId||bound.data.app_id!==appId||bound.data.account.id!==ownerId)
      throw Error("APP_INSTALLATION_MISMATCH");
    const contents=mode==="publish"?"write":"read";
    const issues=mode==="evidence"?"write":"read";
    // GitHub grants metadata:read automatically. Never request administrative,
    // workflow or secret permissions. Evidence-only tokens cannot publish
    // contents; publish tokens cannot write issue comments. The key itself
    // remains in the trusted broker, never in either consuming worker.
    const issued=tokenResponse.safeParse(await request("POST","/app/installations/"+installationId+"/access_tokens",auth,
      {repository_ids:[repoId],permissions:{contents,issues,pull_requests:"read"}}));
    if(!issued.success||issued.data.permissions.contents!==contents||issued.data.permissions.issues!==issues)throw Error("APP_TOKEN_SCOPE_INVALID");
    const expiresAt=Date.parse(issued.data.expires_at),remaining=expiresAt-now();
    if(!Number.isFinite(expiresAt)||remaining<120000||remaining>3700000)throw Error("APP_TOKEN_EXPIRY_INVALID");
    const visible=visibleRepos.safeParse(await request("GET","/installation/repositories?per_page=100",issued.data.token));
    if(!visible.success)throw Error("APP_TOKEN_REPOSITORY_SCOPE_INVALID");
    return {actor,expiresAt,token:issued.data.token};
  }};
}
