#!/usr/bin/env node
// Trusted reviewed checkout only. Administrative observer, GET exclusively.
// No token printed, no configuration change, no bypass grant.
import {execFileSync} from "node:child_process";
import {auditGitHubWriterPolicy} from "../../dist/src/coordination/githubWriterAudit.js";
const [branch,app,...extra]=process.argv.slice(2);
if(!branch||!app||!/^\d+$/.test(app)||extra.length)throw Error("USAGE: node scripts/ci/audit-director-writers.mjs <branch> <app-id>");
async function read(path){
 const result=execFileSync("gh",["api","--hostname","github.com","--method","GET","--include","repos/Patricked-code/africafunds-market-data-pipeline"+path],
  {encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:20000,maxBuffer:2*1024*1024});
 const split=/\r?\n\r?\n/.exec(result);
 if(!split||split.index===undefined)throw Error("AUDIT_HTTP_HEADERS_MISSING");
 const headers=result.slice(0,split.index);
 if(!/^HTTP\/\S+ 200\b/.test(headers)||/^link:.*rel="next"/im.test(headers))throw Error("AUDIT_HTTP_INCOMPLETE");
 return JSON.parse(result.slice(split.index+split[0].length));
}
try{console.log(JSON.stringify(await auditGitHubWriterPolicy(read,branch,Number(app))));}
catch{console.error("WRITER_AUDIT_STOPPED: policy not verified; review administrator read-only access and protections");process.exitCode=1;}
