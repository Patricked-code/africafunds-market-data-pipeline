import {z} from "zod";
import {CONTINUITY_ID,transition,stateSchema,type ClaimStore,type WorkCandidate} from "./agentClaims.js";
import type {GitHubDirectorRead} from "./githubDirector.js";

const repo=z.object({id:z.literal(1315731572)});
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const num=z.number().int().positive().safe();
const branch=z.string().min(1).max(200).regex(/^[A-Za-z0-9._/-]+$/)
  .refine(x=>x!=="main"&&!x.includes("..")&&!x.startsWith("coordination/"));
const fileScope=z.string().max(300).regex(/^file:[A-Za-z0-9_.\/-]+$/)
  .refine(x=>!x.slice(5).split("/").some(p=>p==="."||p===".."||p===""));
const admission=z.object({
  continuity:z.literal(CONTINUITY_ID),
  workId:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
  issue:num,lot:z.number().int().min(0).max(13),priority:z.number().int().min(0).max(1000),
  mainSha:sha,branch,head:sha,
  pr:num.nullable(),
  dependsOnPr:z.array(num).max(30),
  scopes:z.array(fileScope).min(1).max(100),
  nextAction:z.string().min(1).max(500),
  acceptance:z.string().min(1).max(4000),
}).strict().superRefine((x,ctx)=>{
  if(new Set(x.scopes).size!==x.scopes.length||
     new Set(x.dependsOnPr).size!==x.dependsOnPr.length||
     (x.pr!==null&&x.dependsOnPr.includes(x.pr))||
     (x.pr===null&&(x.head!==x.mainSha||!x.branch.startsWith("work/sadiaaf-issue-"+x.issue+"-")||
       !/^work\/sadiaaf-issue-[1-9][0-9]*-[a-z0-9-]+$/.test(x.branch))))
    ctx.addIssue({code:"custom",message:"INVALID_ADMISSION_SCOPE_OR_DEPENDENCY"});
});
export type CanonicalWorkAdmission=z.infer<typeof admission>;
const mainSchema=z.object({name:z.literal("main"),protected:z.literal(true),commit:z.object({sha})});
const issueSchema=z.object({number:num,state:z.enum(["open","closed"]),pull_request:z.unknown().optional()});
const prSchema=z.object({
  number:num,state:z.enum(["open","closed"]),merged:z.boolean(),merge_commit_sha:sha.nullable(),
  base:z.object({ref:z.literal("main"),repo}),head:z.object({sha,ref:branch,repo})
});
const compare=z.object({status:z.enum(["ahead","identical"]),merge_base_commit:z.object({sha})});
export interface GitHubSelectorPorts {
  readGitHub:GitHubDirectorRead;
  // Must be supplied by a trusted, authenticated loader of canonical work
  // authorizations. An issue's free-form text, model output or unverified
  // comment is never sufficient. No local queue is persisted by this selector.
  readCanonicalAdmissions(mainSha:string):Promise<unknown>;
  store:ClaimStore;
  actor:string;
  session:string;
  now():number;
  leaseMs:number;
}
export interface Selection {
  candidate:WorkCandidate|null;
  blocked:{workId:string;reason:string}[];
}
export async function inspectGitHubSelection(ports:GitHubSelectorPorts,finished:readonly string[]):Promise<Selection>{
  const main=mainSchema.parse(await ports.readGitHub("/branches/main")).commit.sha;
  const admissions=z.array(admission).max(100).parse(await ports.readCanonicalAdmissions(main));
  if(new Set(admissions.map(a=>a.workId)).size!==admissions.length)throw Error("DUPLICATE_CANONICAL_WORK");
  const blocked:Selection["blocked"]=[];
  for(const a of [...admissions].sort((x,y)=>x.priority-y.priority||(x.workId<y.workId?-1:x.workId>y.workId?1:0))){
    const skip=(reason:string)=>blocked.push({workId:a.workId,reason});
    if(finished.includes(a.workId)){skip("ALREADY_ATTEMPTED_IN_PASS");continue;}
    if(a.mainSha!==main){skip("STALE_CANONICAL_ADMISSION");continue;}
    const issue=issueSchema.parse(await ports.readGitHub("/issues/"+a.issue));
    if(issue.number!==a.issue||issue.pull_request!==undefined)throw Error("ISSUE_IDENTITY_MISMATCH");
    if(issue.state!=="open"){skip("ISSUE_CLOSED");continue;}
    let ready=true;
    for(const dep of a.dependsOnPr){
      const p=prSchema.parse(await ports.readGitHub("/pulls/"+dep));
      if(p.number!==dep)throw Error("DEPENDENCY_IDENTITY_MISMATCH");
      if(!p.merged||p.state!=="closed"||!p.merge_commit_sha){ready=false;break;}
      const ancestor=compare.safeParse(await ports.readGitHub("/compare/"+p.merge_commit_sha+"...main"));
      if(!ancestor.success||ancestor.data.merge_base_commit.sha!==p.merge_commit_sha){ready=false;break;}
    }
    if(!ready){skip("DEPENDENCY_NOT_PROVEN_ON_MAIN");continue;}
    if(a.pr!==null){
      const p=prSchema.parse(await ports.readGitHub("/pulls/"+a.pr));
      if(p.number!==a.pr)throw Error("PR_IDENTITY_MISMATCH");
      if(p.state!=="open"||p.merged||p.head.sha!==a.head||p.head.ref!==a.branch){
        skip("PR_NOT_CURRENT");continue;
      }
    }else{
      let exists=false;
      try{await ports.readGitHub("/git/ref/heads/"+a.branch);exists=true;}
      catch(error){if(!(error instanceof Error)||error.message!=="GITHUB_HTTP_404")throw error;}
      if(exists){skip("BRANCH_RECONCILIATION_REQUIRED");continue;}
    }
    const candidate:WorkCandidate={
      workId:a.workId,lot:a.lot,branch:a.branch,base:a.head,scopes:a.scopes,
      trace:{head:a.head,nextAction:a.nextAction,evidence:["issue:"+a.issue,...(a.pr===null?[]:["pr:"+a.pr]),"commit:"+a.mainSha]}
    };
    const current=stateSchema.parse((await ports.store.read()).state);
    try{
      // Reuse the real claim transition for admissibility; this is NOT a lock.
      // runClaimedWorkPass still performs the authoritative CAS on dispatch.
      transition(current,{...candidate,kind:"claim",actor:ports.actor,session:ports.session,leaseMs:ports.leaseMs},ports.now());
    }catch(error){
      if(error instanceof Error&&["SCOPE_OCCUPIED","ALREADY_CLAIMED"].includes(error.message)){skip(error.message);continue;}
      throw error;
    }
    if(mainSchema.parse(await ports.readGitHub("/branches/main")).commit.sha!==main)
      throw Error("MAIN_CHANGED_DURING_SELECTION");
    return {candidate,blocked};
  }
  return {candidate:null,blocked};
}
export function createGitHubWorkSelector(ports:GitHubSelectorPorts): (finished:readonly string[])=>Promise<WorkCandidate|null>{
  return async finished=>(await inspectGitHubSelection(ports,finished)).candidate;
}
