import {createHash} from "node:crypto";
import {z} from "zod";
import {canonicalWorkAdmissionSchema} from "./githubSelector.js";
import {codingSubject,type CodingResult} from "./modelCoder.js";
import type {PreparedMutation} from "./mutationGateway.js";

const sha=z.string().regex(/^[a-f0-9]{40}$/);
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const num=z.number().int().positive().safe();
const file=z.string().max(240).regex(/^src\/[A-Za-z0-9_.\/-]+\.ts$/)
 .refine(p=>!p.split("/").some(x=>["",".",".."].includes(x)))
 .refine(p=>!/^src\/(auth|identity|security|config|coordination)\//i.test(p))
 .refine(p=>!/(secret|credential|token|private[-_]?key)/i.test(p));
const proof=z.object({status:z.enum(["pass","fail"]),subject:digest,suite:digest,
 evidence:z.string().regex(/^issue:[1-9][0-9]{0,15}$/),
 diagnostics:z.array(z.string().min(1).max(300)).max(12)}).strict();
export const promotionReceiptSchema=z.object({
 workId:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
 issue:num,lot:z.number().int().min(0).max(13),branch:z.string().regex(/^work\/sadiaaf-issue-[1-9][0-9]*-[a-z0-9-]+$/),
 mainSha:sha,base:sha,head:sha,prNumber:num,acceptance:z.string().min(1).max(4000),
 scopes:z.array(z.string()).min(1).max(5),paths:z.array(file).min(1).max(5),red:proof,green:proof
}).strict();
export type PromotionReceipt=z.infer<typeof promotionReceiptSchema>;
type Validated=Extract<CodingResult,{outcome:"validated"}>;
export interface PromotionEvidencePorts{
 readSource(head:string,path:string):Promise<string>;
 readAdmission(workId:string):Promise<unknown>;
 // Read exact PR/HEAD/repository, protected main and the existing durable
 // receipt from trusted storage. Model output is not a receipt or authority.
 verifyCurrent(receipt:PromotionReceipt):Promise<boolean>;
 verifyEvidence(result:Validated):Promise<boolean>;
 // Reuse the publication verifier (exact immutable parent and exhaustive
 // diff) plus independent semantic policy. Never use a simple CI success.
 verifyPrepared(candidate:PreparedMutation,result:Validated):Promise<boolean>;
}
const hash=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
export async function reconstructPromotionCandidate(raw:unknown,ports:PromotionEvidencePorts){
 const r=promotionReceiptSchema.parse(raw);
 const paths=[...r.paths].sort(),scopes=[...r.scopes].sort();
 if(r.base===r.head||new Set(paths).size!==paths.length||new Set(scopes).size!==scopes.length||
   paths.some(p=>!scopes.includes("file:"+p))||!r.branch.startsWith("work/sadiaaf-issue-"+r.issue+"-"))
  throw Error("PROMOTION_RECEIPT_SCOPE");
 const admission=canonicalWorkAdmissionSchema.parse(await ports.readAdmission(r.workId));
 if(admission.workId!==r.workId||admission.issue!==r.issue||admission.lot!==r.lot||
   admission.branch!==r.branch||admission.pr!==r.prNumber||admission.head!==r.head||
   admission.mainSha!==r.mainSha||admission.acceptance!==r.acceptance||
   JSON.stringify([...admission.scopes].sort())!==JSON.stringify(scopes))
  throw Error("PROMOTION_RENEWED_ADMISSION_REQUIRED");
 if(await ports.verifyCurrent(r)!==true)throw Error("PROMOTION_CURRENT_RECEIPT_DENIED");
 const changes=[];
 for(const path of paths){
  const original=await ports.readSource(r.base,path),content=await ports.readSource(r.head,path);
  if(!original||!content||original===content||original.length>24000||content.length>24000||
   original.includes("\0")||content.includes("\0"))throw Error("PROMOTION_SOURCE_MISMATCH");
  changes.push({path,originalSha256:hash(original),content});
 }
 const result:Validated={outcome:"validated",workId:r.workId,branch:r.branch,head:r.base,changes,red:r.red,green:r.green};
 if(r.red.status!=="fail"||!r.red.diagnostics.length||r.green.status!=="pass"||r.green.diagnostics.length||
  r.red.evidence===r.green.evidence||r.red.suite!==r.green.suite||
  r.red.subject!==codingSubject(r.base,[])||r.green.subject!==codingSubject(r.base,changes))
  throw Error("PROMOTION_PROOF_BINDING");
 const candidate:PreparedMutation={branch:r.branch,expectedHead:r.base,candidateHead:r.head,paths};
 if(await ports.verifyEvidence(result)!==true||await ports.verifyPrepared(candidate,result)!==true)
  throw Error("PROMOTION_CANDIDATE_DENIED");
 const current=canonicalWorkAdmissionSchema.parse(await ports.readAdmission(r.workId));
 if(JSON.stringify(current)!==JSON.stringify(admission)||await ports.verifyCurrent(r)!==true)
  throw Error("PROMOTION_AUTHORIZATION_CHANGED");
 return {candidate,result,receipt:r};
}
// Read-only reconstruction. No new inference, claim, PR mutation, merge or
// authorization issuance. The protected registry and promotion gateway
// remain authoritative for effectful operations.
