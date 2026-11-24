import {createHash,randomUUID} from "node:crypto";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {mkdtemp,writeFile,chmod,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {z} from "zod";
import {codingSubject,type CodingChange,type CodingProof} from "./modelCoder.js";

const sha256=(value:string)=>createHash("sha256").update(value).digest("hex");
const sourcePath="src/utils/dates.ts";
export const DATES_ACCEPTANCE="SADIAAF-DATES-CALENDAR-V1";
type Input={id:string;fn:"iso"|"days"|"bucket";args:(string|number)[];dateObject?:boolean};
type Result={id:string;kind:"value";value:string|number}|{id:string;kind:"throw"};
// Same 18 historical pilot cases; expected outputs never mounted in Docker.
const cases:readonly {input:Input;expected:Result}[]=[
 ...([
 ["valid-leap","2024-02-29","2024-02-29"],
 ["valid-date","2026-11-24","2026-11-24"],
 ["timezone","2026-11-24T23:45:00-02:00","2026-11-25"],
 ["century-leap","2000-02-29","2000-02-29"],
 ["year-0001","0001-01-01","0001-01-01"]
 ] as const).map(([id,arg,value])=>({input:{id,fn:"iso" as const,args:[arg]},expected:{id,kind:"value" as const,value}})),
 ...([
 ["invalid-text","not-a-date"],["invalid-feb30","2026-02-30"],["invalid-leap","2025-02-29"],
 ["invalid-apr31","2026-04-31"],["invalid-month13","2026-13-01"],["invalid-month00","2026-00-01"],
 ["invalid-day00","2026-01-00"],["century-nonleap","1900-02-29"]
 ] as const).map(([id,arg])=>({input:{id,fn:"iso" as const,args:[arg]},expected:{id,kind:"throw" as const}})),
 {input:{id:"date-object",fn:"iso",args:["2020-01-01T00:00:00Z"],dateObject:true},expected:{id:"date-object",kind:"value",value:"2020-01-01"}},
 {input:{id:"invalid-object",fn:"iso",args:["invalid"],dateObject:true},expected:{id:"invalid-object",kind:"throw"}},
 {input:{id:"days-between",fn:"days",args:["2024-02-28","2024-03-01"]},expected:{id:"days-between",kind:"value",value:2}},
 {input:{id:"bucket-365",fn:"bucket",args:[365]},expected:{id:"bucket-365",kind:"value",value:"MONEY_MARKET"}},
 {input:{id:"bucket-366",fn:"bucket",args:[366]},expected:{id:"bucket-366",kind:"value",value:"BOND_CT"}}
];
const driver=`import {readFileSync} from "node:fs";
import {toIsoDate,daysBetween,maturityBucket} from "./dates.ts";
const inputs=JSON.parse(readFileSync("/work/inputs.json","utf8"));
const results=inputs.map(c=>{
 try{
 const a=c.args;const value=c.fn==="iso"?toIsoDate(c.dateObject?new Date(a[0]):a[0]):c.fn==="days"?daysBetween(...a):maturityBucket(...a);
 return {id:c.id,kind:"value",value};
 }catch{return {id:c.id,kind:"throw"};}
});
process.stdout.write(JSON.stringify(results));`;
const resultSchema=z.discriminatedUnion("kind",[
 z.object({id:z.string(),kind:z.literal("value"),value:z.union([z.string().max(300),z.number().finite()])}).strict(),
 z.object({id:z.string(),kind:z.literal("throw")}).strict()
]);
const imageSchema=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const exec=promisify(execFile);
export type IsolatedRunner=(source:string,inputs:readonly Input[])=>Promise<unknown>;
// The caller supplies an already installed, reviewed Node 22 image ID, not a
// mutable tag. No pull, network, host environment, Docker socket or repo mount
// is made available inside the candidate container.
export function createDockerDatesRunner(imageId:string):IsolatedRunner{
 imageSchema.parse(imageId);
 return async(source,inputs)=>{
  const dir=await mkdtemp(join(tmpdir(),"sadiaaf-validate-")),name="sadiaaf-validation-"+randomUUID();
  const env={PATH:"/usr/bin:/bin",HOME:dir};
  try{
   await chmod(dir,0o755);
   await writeFile(join(dir,"dates.ts"),source,{mode:0o644,flag:"wx"});
   await writeFile(join(dir,"inputs.json"),JSON.stringify(inputs),{mode:0o644,flag:"wx"});
   await writeFile(join(dir,"driver.mjs"),driver,{mode:0o644,flag:"wx"});
   const r=await exec("docker",["--host","unix:///var/run/docker.sock","run","--name",name,"--rm","--pull=never",
    "--network","none","--read-only","--cap-drop","ALL","--security-opt","no-new-privileges",
    "--pids-limit","64","--memory","256m","--cpus","1","--user","65534:65534","--log-driver","none",
    "--mount","type=bind,src="+dir+",dst=/work,readonly","--workdir","/work","--entrypoint","node",imageId,
    "--experimental-strip-types","driver.mjs"],{env,timeout:45000,maxBuffer:65536});
   return JSON.parse(r.stdout);
  }catch{throw Error("ISOLATED_VALIDATION_EXECUTION_UNCONFIRMED");}
  finally{
   // Explicitly attempt removal even if the CLI timed out; do not silently
   // mark a possibly still running candidate as safely terminated.
   try{await exec("docker",["--host","unix:///var/run/docker.sock","rm","-f",name],{env,timeout:10000,maxBuffer:8192});}
   catch{
    let list:string;
    try{list=(await exec("docker",["--host","unix:///var/run/docker.sock","ps","-a","--filter","name=^/"+name+"$","--format","{{.Names}}"],{env,timeout:10000,maxBuffer:8192})).stdout.trim();}
    catch{throw Error("ISOLATED_CLEANUP_UNCONFIRMED");}
    if(list)throw Error("ISOLATED_CLEANUP_UNCONFIRMED");
   }
   await rm(dir,{recursive:true,force:true});
  }
 };
}
export interface ValidationRecord{
 head:string;subject:string;suite:string;status:"pass"|"fail";diagnostics:string[];observed:Result[];
}
export interface DatesValidationConfig{
 imageId:string;
 readSource(head:string,path:string):Promise<string>;
 // Must persist exact results in the canonical evidence store; returns its
 // verified reference. No synthetic ci IDs or model-supplied proof allowed.
 persistEvidence(record:ValidationRecord):Promise<string>;
 runner?:IsolatedRunner;
}
export function createDatesValidationPort(config:DatesValidationConfig){
 const image=imageSchema.parse(config.imageId),run=config.runner??createDockerDatesRunner(image);
 const suite=sha256(JSON.stringify({acceptance:DATES_ACCEPTANCE,image,driver,cases}));
 return async(head:string,changes:readonly CodingChange[],acceptance:string):Promise<CodingProof>=>{
  if(!/^[a-f0-9]{40}$/.test(head)||acceptance!==DATES_ACCEPTANCE)throw Error("VALIDATION_CONTRACT_NOT_ADMITTED");
  if(changes.length>1||changes.some(c=>c.path!==sourcePath))throw Error("VALIDATION_SCOPE_MISMATCH");
  const original=await config.readSource(head,sourcePath),change=changes[0];
  if(change&&change.originalSha256!==sha256(original))throw Error("VALIDATION_ORIGINAL_MISMATCH");
  const source=change?.content??original;
  if(!source||source.length>24000||source.includes("\0"))throw Error("VALIDATION_SOURCE_LIMIT");
  const observed=z.array(resultSchema).length(cases.length).parse(await run(source,cases.map(c=>c.input)));
  const byId=new Map(observed.map(x=>[x.id,x]));
  if(byId.size!==cases.length||cases.some(c=>!byId.has(c.input.id)))throw Error("VALIDATION_RESULT_INCOMPLETE");
  const diagnostics=cases.filter(c=>{
   const got=byId.get(c.input.id)!;
   return got.kind!==c.expected.kind||(got.kind==="value"&&c.expected.kind==="value"&&got.value!==c.expected.value);
  }).map(c=>c.input.id);
  const record:ValidationRecord={head,subject:codingSubject(head,changes),suite,status:diagnostics.length?"fail":"pass",diagnostics,observed};
  const evidence=z.string().regex(/^(commit:[a-f0-9]{40}|(?:ci|issue|pr):[1-9][0-9]{0,19})$/).parse(await config.persistEvidence(record));
  return {status:record.status,subject:record.subject,suite,evidence,diagnostics:diagnostics.slice(0,12)};
 };
}
