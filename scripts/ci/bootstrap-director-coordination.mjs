#!/usr/bin/env node
// Run from a reviewed, trusted checkout only, never from untrusted PR code.
// Uses an already authorized gh CLI identity; never prints a token.
import {execFileSync} from "node:child_process";
import {bootstrapCoordination,COORDINATION_REPOSITORY} from "../../dist/src/coordination/bootstrap.js";
const args=process.argv.slice(2);
if(args.length>1||(args.length===1&&!["--check","--apply"].includes(args[0])))throw Error("USAGE: node scripts/ci/bootstrap-director-coordination.mjs [--check|--apply]");
const apply=args[0]==="--apply";
async function request(method,path,body){
  const cmd=["api","--hostname","github.com","--method",method,"repos/"+COORDINATION_REPOSITORY+path];
  if(body!==undefined)cmd.push("--input","-");
  try{
    const data=execFileSync("gh",cmd,{encoding:"utf8",input:body===undefined?undefined:JSON.stringify(body),stdio:["pipe","pipe","pipe"],timeout:30000,maxBuffer:16*1024*1024});
    return JSON.parse(data);
  }catch(error){
    const stderr=String(error?.stderr??"");
    if(method==="GET"&&path==="/git/ref/heads/coordination/sadiaaf-agent-state"&&/HTTP 404\b/.test(stderr))return null;
    throw Error("GITHUB_ADMIN_REQUEST_FAILED:"+method+":"+path.split("?")[0]);
  }
}
try{
  console.log(JSON.stringify(await bootstrapCoordination(request,apply)));
}catch(error){
  console.error("BOOTSTRAP_STOPPED:",error instanceof Error?error.message:"UNKNOWN");
  process.exitCode=1;
}
