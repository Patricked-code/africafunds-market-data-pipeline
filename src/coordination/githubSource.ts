import {z} from "zod";
import {createHash} from "node:crypto";
const root="https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline";
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const ordinary=z.string().max(240).regex(/^src\/[A-Za-z0-9_.\/-]+\.ts$/)
 .refine(p=>!p.split("/").some(s=>["",".",".."].includes(s)))
 .refine(p=>!/^src\/(auth|identity|security|config|coordination)\//i.test(p))
 .refine(p=>!/(secret|credential|token|private[-_]?key)/i.test(p));
const treeEntry=z.object({path:z.string(),mode:z.string(),type:z.string(),sha});
const tree=z.object({sha,truncated:z.literal(false),tree:z.array(treeEntry).max(10000)});
export interface GitHubSourceConfig{token:string;fetcher?:typeof fetch;timeoutMs?:number;}
// Only immutable Git objects from the canonical repository. No branch names,
// symlink traversal, submodule access, arbitrary URLs or credential delivery.
export function createGitHubSourceReader(config:GitHubSourceConfig){
 const token=z.string().min(1).max(4096).regex(/^[A-Za-z0-9_.-]+$/).parse(config.token);
 const timeout=config.timeoutMs??15000;
 if(!Number.isSafeInteger(timeout)||timeout<100||timeout>60000)throw Error("SOURCE_TIMEOUT_INVALID");
 const send=config.fetcher??fetch;
 async function read(path:string,max=2000000):Promise<unknown>{
  const r=await send(root+path,{method:"GET",redirect:"error",signal:AbortSignal.timeout(timeout),
   headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"}});
  if(!r.ok||!r.body)throw Error("GITHUB_SOURCE_HTTP_"+r.status);
  const reader=r.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true});let data="",bytes=0;
  try{while(true){const x=await reader.read();if(x.done)break;bytes+=x.value.byteLength;if(bytes>max){await reader.cancel();throw Error("SOURCE_RESPONSE_LIMIT");}data+=decoder.decode(x.value,{stream:true});}data+=decoder.decode();}
  finally{reader.releaseLock();}
  return JSON.parse(data);
 }
 return async(head:string,path:string):Promise<string>=>{
  sha.parse(head);ordinary.parse(path);
  z.object({id:z.literal(1315731572)}).parse(await read(""));
  const commit=z.object({sha,tree:z.object({sha})}).parse(await read("/git/commits/"+head));
  if(commit.sha!==head)throw Error("SOURCE_COMMIT_MISMATCH");
  let current=commit.tree.sha;const parts=path.split("/");
  for(let i=0;i<parts.length;i++){
   const t=tree.parse(await read("/git/trees/"+current));
   if(t.sha!==current)throw Error("SOURCE_TREE_MISMATCH");
   const matches=t.tree.filter(e=>e.path===parts[i]);
   if(matches.length!==1)throw Error("SOURCE_PATH_NOT_UNIQUE");
   const e=matches[0]!;
   if(i<parts.length-1){if(e.type!=="tree"||e.mode!=="040000")throw Error("SOURCE_UNSAFE_TREE_ENTRY");current=e.sha;continue;}
   if(e.type!=="blob"||e.mode!=="100644")throw Error("SOURCE_UNSAFE_BLOB_MODE");
   const b=z.object({sha,encoding:z.literal("base64"),size:z.number().int().min(1).max(24000),content:z.string().max(40000)}).parse(await read("/git/blobs/"+e.sha,65536));
   if(b.sha!==e.sha)throw Error("SOURCE_BLOB_MISMATCH");
   const encoded=b.content.replace(/\r?\n/g,"");
   const bytes=Buffer.from(encoded,"base64");
   if(bytes.toString("base64")!==encoded||bytes.length!==b.size)throw Error("SOURCE_ENCODING_MISMATCH");
   const gitHash=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
   if(gitHash!==e.sha)throw Error("SOURCE_BLOB_HASH_MISMATCH");
   const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
   if(text.includes("\0")||text.charCodeAt(0)===0xfeff)throw Error("SOURCE_BINARY_OR_BOM");
   return text;
  }
  throw Error("SOURCE_PATH_INVALID");
 };
}
