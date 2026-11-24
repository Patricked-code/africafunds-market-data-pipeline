import {z} from "zod";
import {CONTINUITY_ID} from "./agentClaims.js";
import {canonicalWorkAdmissionSchema,type CanonicalWorkAdmission} from "./githubSelector.js";
import type {GitHubDirectorRead} from "./githubDirector.js";

const MARKER="SADIAAF_WORK_AUTHORIZATION_V1";
const OWNER_ID=270385782;
const ISSUE_URL="https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline/issues/9";
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const id=z.number().int().positive().safe();
const workId=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
const comment=z.object({
  id,issue_url:z.literal(ISSUE_URL),body:z.string().max(65536),
  user:z.object({id,login:z.string()}).nullable(),
  author_association:z.string(),created_at:z.string().datetime(),updated_at:z.string().datetime()
});
const authorization=z.discriminatedUnion("kind",[
  z.object({kind:z.literal("admit"),continuity:z.literal(CONTINUITY_ID),admission:canonicalWorkAdmissionSchema}).strict(),
  z.object({kind:z.literal("revoke"),continuity:z.literal(CONTINUITY_ID),workId}).strict(),
]);
type RecordEntry={commentId:number;body:string;createdAt:string;updatedAt:string};
async function snapshot(read:GitHubDirectorRead):Promise<RecordEntry[]>{
  const out:RecordEntry[]=[];
  const seen=new Set<number>();
  for(let page=1;page<=20;page++){
    const comments=z.array(comment).max(100).parse(await read("/issues/9/comments?per_page=100&page="+page));
    for(const c of comments){
      if(seen.has(c.id))throw Error("ADMISSION_PAGINATION_CHANGED");
      seen.add(c.id);
      if(c.user?.id!==OWNER_ID||c.user.login!=="Patricked-code"||c.author_association!=="OWNER")continue;
      if(!c.body.startsWith(MARKER+"\n"))continue;
      if(c.created_at!==c.updated_at)throw Error("EDITED_AUTHORIZATION_REQUIRES_RECONCILIATION");
      if(c.body.length>16000)throw Error("AUTHORIZATION_TOO_LARGE");
      out.push({commentId:c.id,body:c.body,createdAt:c.created_at,updatedAt:c.updated_at});
    }
    if(comments.length<100)return out.sort((a,b)=>a.commentId-b.commentId);
  }
  throw Error("ADMISSION_HISTORY_LIMIT_REACHED");
}
// Read the existing canonical issue, never a second queue. Owner identity is
// GitHub provenance, not proof that an actual human typed a comment: all
// credentials sharing that identity must remain outside model control.
// Deletion of a record is not detectable by this stateless reader. Runtime
// activation requires trusted writer/revocation policy and durable evidence.
export function createCanonicalAdmissionLoader(read:GitHubDirectorRead){
  return async(mainSha:string):Promise<CanonicalWorkAdmission[]>=>{
    sha.parse(mainSha);
    const first=await snapshot(read),second=await snapshot(read);
    if(JSON.stringify(first)!==JSON.stringify(second))throw Error("AUTHORIZATION_SNAPSHOT_CHANGED");
    const active=new Map<string,CanonicalWorkAdmission>();
    for(const c of first){
      let parsed:unknown;
      try{parsed=JSON.parse(c.body.slice(MARKER.length+1));}
      catch{throw Error("INVALID_CANONICAL_AUTHORIZATION_JSON");}
      const record=authorization.parse(parsed);
      if(record.kind==="revoke")active.delete(record.workId);
      else active.set(record.admission.workId,record.admission);
    }
    // Never revive an older admission after a newer stale admission/revocation.
    const result=[...active.values()].filter(a=>a.mainSha===mainSha);
    if(result.length>100)throw Error("ADMISSION_LIMIT_REACHED");
    return result;
  };
}
