import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {createGitHubSourceReader} from "../src/coordination/githubSource.js";
const head="a".repeat(40),root="b".repeat(40),src="c".repeat(40),utils="d".repeat(40);
const content="export const x = 1;\n",bytes=Buffer.from(content),blob=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
const prefix="https://api.github.com/repos/Patricked-code/africafunds-market-data-pipeline";
function fixtures(){return new Map<string,unknown>([
 ["",{id:1315731572}],["/git/commits/"+head,{sha:head,tree:{sha:root}}],
 ["/git/trees/"+root,{sha:root,truncated:false,tree:[{path:"src",mode:"040000",type:"tree",sha:src}]}],
 ["/git/trees/"+src,{sha:src,truncated:false,tree:[{path:"utils",mode:"040000",type:"tree",sha:utils}]}],
 ["/git/trees/"+utils,{sha:utils,truncated:false,tree:[{path:"a.ts",mode:"100644",type:"blob",sha:blob}]}],
 ["/git/blobs/"+blob,{sha:blob,encoding:"base64",size:bytes.length,content:bytes.toString("base64")}]
 ]);}
function reader(data=fixtures()){
 const fetcher:typeof fetch=async(url,options)=>{
  assert.equal(options?.method,"GET");assert.equal(options?.redirect,"error");
  const address=String(url);assert.ok(address.startsWith(prefix));
  return new Response(JSON.stringify(data.get(address.slice(prefix.length))));
 };
 return createGitHubSourceReader({token:"test-token",fetcher});
}
test("read immutable exact ordinary source and validate Git blob bytes",async()=>assert.equal(await reader()(head,"src/utils/a.ts"),content));
test("reject mutable ref, traversal and sensitive path before transport",async()=>{
 const r=createGitHubSourceReader({token:"test-token",fetcher:async()=>{throw Error("unexpected fetch");}});
 await assert.rejects(r("main","src/utils/a.ts"));
 await assert.rejects(r(head,"src/../a.ts"));
 await assert.rejects(r(head,"src/security/a.ts"));
});
test("reject symlink, truncated tree and duplicate entry",async()=>{
 for(const tree of [
 {sha:utils,truncated:false,tree:[{path:"a.ts",mode:"120000",type:"blob",sha:blob}]},
 {sha:utils,truncated:true,tree:[]},
 {sha:utils,truncated:false,tree:[{path:"a.ts",mode:"100644",type:"blob",sha:blob},{path:"a.ts",mode:"100644",type:"blob",sha:blob}]}
 ]){const f=fixtures();f.set("/git/trees/"+utils,tree);await assert.rejects(reader(f)(head,"src/utils/a.ts"));}
});
test("reject different bytes returned for requested blob",async()=>{
 const f=fixtures(),other=Buffer.from("export const x = 2;\n");
 f.set("/git/blobs/"+blob,{sha:blob,encoding:"base64",size:other.length,content:other.toString("base64")});
 await assert.rejects(reader(f)(head,"src/utils/a.ts"),/HASH_MISMATCH/);
});
test("reject wrong repository and wrong immutable commit identity",async()=>{
 const f=fixtures();f.set("",{id:1});await assert.rejects(reader(f)(head,"src/utils/a.ts"));
 const g=fixtures();g.set("/git/commits/"+head,{sha:src,tree:{sha:root}});await assert.rejects(reader(g)(head,"src/utils/a.ts"),/COMMIT_MISMATCH/);
});
