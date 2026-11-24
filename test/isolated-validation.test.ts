import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {createDatesValidationPort,DATES_ACCEPTANCE,type DatesValidationConfig,type ValidationRecord} from "../src/coordination/isolatedValidation.js";
import {codingSubject} from "../src/coordination/modelCoder.js";
const head="a".repeat(40),imageId="sha256:"+"b".repeat(64),source="original";
const change={path:"src/utils/dates.ts",originalSha256:createHash("sha256").update(source).digest("hex"),content:"candidate"};
function fixture(){
 const records:ValidationRecord[]=[];
 const config:DatesValidationConfig={imageId,async readSource(h,p){assert.equal(h,head);assert.equal(p,change.path);return source;},
 async persistEvidence(r){records.push(r);return "issue:"+records.length;},
 async runner(s,inputs){return inputs.map(c=>{
  if(c.id==="invalid-feb30"&&s===source)return {id:c.id,kind:"value",value:"2026-03-02"};
  if(c.id.startsWith("invalid")||c.id==="century-nonleap")return {id:c.id,kind:"throw"};
  const values:Record<string,string|number>={"valid-leap":"2024-02-29","valid-date":"2026-11-24",timezone:"2026-11-25","century-leap":"2000-02-29","year-0001":"0001-01-01","date-object":"2020-01-01","days-between":2,"bucket-365":"MONEY_MARKET","bucket-366":"BOND_CT"};
  return {id:c.id,kind:"value",value:values[c.id]};
 });}};
 return {records,config};
}
test("same suite and exact candidate subject, results compared outside runner",async()=>{
 const f=fixture(),validate=createDatesValidationPort(f.config);
 const red=await validate(head,[],DATES_ACCEPTANCE),green=await validate(head,[change],DATES_ACCEPTANCE);
 assert.equal(red.status,"fail");assert.deepEqual(red.diagnostics,["invalid-feb30"]);
 assert.equal(green.status,"pass");assert.equal(red.suite,green.suite);
 assert.equal(green.subject,codingSubject(head,[change]));assert.equal(f.records[0]?.observed.length,18);
 assert.notEqual(red.evidence,green.evidence);
});
test("reject unauthorized contract, mutable base, foreign change and mismatched original",async()=>{
 const f=fixture(),v=createDatesValidationPort(f.config);
 await assert.rejects(v(head,[],"arbitrary command"),/CONTRACT/);
 await assert.rejects(v("main",[],DATES_ACCEPTANCE),/CONTRACT/);
 await assert.rejects(v(head,[{...change,path:"src/security/a.ts"}],DATES_ACCEPTANCE),/SCOPE/);
 await assert.rejects(v(head,[{...change,originalSha256:"0".repeat(64)}],DATES_ACCEPTANCE),/ORIGINAL/);
 assert.equal(f.records.length,0);
});
test("reject candidate-provided PASS marker and truncated results",async()=>{
 const f=fixture();
 for(const output of ["PASS",[{id:"valid-date",kind:"value",value:"2026-11-24"}]]){
  await assert.rejects(createDatesValidationPort({...f.config,runner:async()=>output})(head,[],DATES_ACCEPTANCE));
 }
 assert.equal(f.records.length,0);
});
test("requires immutable image and persistence success",async()=>{
 const f=fixture();assert.throws(()=>createDatesValidationPort({...f.config,imageId:"node:22"}));
 await assert.rejects(createDatesValidationPort({...f.config,persistEvidence:async()=>{throw Error("not persisted");}})(head,[],DATES_ACCEPTANCE),/not persisted/);
});
