#!/usr/bin/env node
// Reviewed trusted checkout only. Administrator reads, dedicated App writes.
// No token or key is printed; no ruleset mutation through this CLI.
import {execFileSync} from "node:child_process";
import {openSync,closeSync,fstatSync,readFileSync,realpathSync,constants} from "node:fs";
import {isAbsolute,relative} from "node:path";
import {bootstrapCoordination,COORDINATION_REPOSITORY} from "../../dist/src/coordination/bootstrap.js";
import {createGitHubAppIdentity} from "../../dist/src/coordination/githubIdentity.js";
const args=process.argv.slice(2);
if(args.length>1||(args.length===1&&!["--check","--apply"].includes(args[0])))throw Error("USAGE: node scripts/ci/bootstrap-director-coordination.mjs [--check|--apply]");
const apply=args[0]==="--apply";
async function request(method,path){
 if(method!=="GET")throw Error("BOOTSTRAP_ADMIN_READ_ONLY");
 const cmd=["api","--hostname","github.com","--method","GET","--include","repos/"+COORDINATION_REPOSITORY+path];
 try{
  const raw=execFileSync("gh",cmd,{encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,maxBuffer:16*1024*1024});
  const split=/\r?\n\r?\n/.exec(raw);
  if(!split||split.index===undefined)throw Error("BOOTSTRAP_ADMIN_HEADERS_MISSING");
  const headers=raw.slice(0,split.index);
  if(!/^HTTP\/\S+ 200\b/.test(headers)||/^link:.*rel="next"/im.test(headers))throw Error("BOOTSTRAP_ADMIN_INCOMPLETE");
  return JSON.parse(raw.slice(split.index+split[0].length));
 }catch(error){
  const stderr=String(error?.stderr??"");
  if(path==="/git/ref/heads/coordination/sadiaaf-agent-state"&&/HTTP 404\b/.test(stderr))return null;
  throw Error("GITHUB_ADMIN_READ_FAILED:"+path.split("?")[0]);
 }
}
function writer(){
 const appId=Number(process.env.SADIAAF_GITHUB_APP_ID),installationId=Number(process.env.SADIAAF_GITHUB_APP_INSTALLATION_ID);
 const appSlug=process.env.SADIAAF_GITHUB_APP_SLUG,filename=process.env.SADIAAF_GITHUB_APP_PRIVATE_KEY_FILE;
 if(!Number.isSafeInteger(appId)||appId<1||!Number.isSafeInteger(installationId)||installationId<1||!appSlug||!filename||!isAbsolute(filename))
  throw Error("BOOTSTRAP_APP_CONFIGURATION_REQUIRED");
 const real=realpathSync(filename),rel=relative(realpathSync(process.cwd()),real);
 if(rel===""||(!rel.startsWith("..")&&!isAbsolute(rel)))throw Error("BOOTSTRAP_KEY_MUST_BE_OUTSIDE_CHECKOUT");
 const fd=openSync(filename,constants.O_RDONLY|constants.O_NOFOLLOW);
 let privateKey;
 try{
  const st=fstatSync(fd);
  if(!st.isFile()||st.size<1||st.size>32768||(st.mode&0o077)!==0||typeof process.getuid!=="function"||st.uid!==process.getuid())
   throw Error("BOOTSTRAP_KEY_FILE_UNSAFE");
  privateKey=readFileSync(fd,"utf8");
 }finally{closeSync(fd);}
 return {appId,identity:createGitHubAppIdentity({appId,installationId,appSlug,privateKey,now:Date.now}),now:Date.now};
}
try{console.log(JSON.stringify(await bootstrapCoordination(request,apply,apply?writer():undefined)));}
catch(error){console.error("BOOTSTRAP_STOPPED:",error instanceof Error?error.message.split("\n")[0]?.slice(0,200):"UNKNOWN");process.exitCode=1;}
