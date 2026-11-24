#!/usr/bin/env python3
"""One bounded, read-only real model qualification. Not a production agent."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
import urllib.request

MODEL = "Qwen/Qwen2.5-Coder-7B-Instruct-GGUF"
MODEL_REV = "9fd1a59"
PARTS = [
    ("qwen2.5-coder-7b-instruct-q4_k_m-00001-of-00002.gguf",
     "89f120544682078148c5a86117de9af3a65c339111262f2d3ff01d80d48b14be"),
    ("qwen2.5-coder-7b-instruct-q4_k_m-00002-of-00002.gguf",
     "0183b3c850cfa96c31082c3af0123115300d3f62798c4448fa8f57bd0eac05e0"),
]
ENGINE = "https://github.com/ggml-org/llama.cpp/releases/download/b12658/llama-b12658-bin-ubuntu-x64.tar.gz"
ENGINE_SHA = "4829683e55fb9b2e800bc5d3db034efb0668e217c1c196ac76546ef6b4ce98ce"
SOURCE = Path("src/utils/dates.ts")
# Candidate execution never inherits the host environment or sees the repository.
# Only a temporary directory with this public module and fixed tests is mounted.
# Each trusted test has a stable identifier. Run all cases and report only
# fixed identifiers, never arbitrary candidate output to the model.
TEST = """import assert from 'node:assert/strict';
import { toIsoDate, daysBetween, maturityBucket } from './dates.ts';
const tests = [
 ['valid-leap',()=>assert.equal(toIsoDate('2024-02-29'),'2024-02-29')],
 ['valid-date',()=>assert.equal(toIsoDate('2026-11-24'),'2026-11-24')],
 ['timezone',()=>assert.equal(toIsoDate('2026-11-24T23:45:00-02:00'),'2026-11-25')],
 ['date-object',()=>assert.equal(toIsoDate(new Date('2020-01-01T00:00:00Z')),'2020-01-01')],
 ['invalid-text',()=>assert.throws(()=>toIsoDate('not-a-date'))],
 ['invalid-object',()=>assert.throws(()=>toIsoDate(new Date(NaN)))],
 ['days-between',()=>assert.equal(daysBetween('2024-02-28','2024-03-01'),2)],
 ['bucket-365',()=>assert.equal(maturityBucket(365),'MONEY_MARKET')],
 ['bucket-366',()=>assert.equal(maturityBucket(366),'BOND_CT')],
 ['invalid-feb30',()=>assert.throws(()=>toIsoDate('2026-02-30'))],
 ['invalid-leap',()=>assert.throws(()=>toIsoDate('2025-02-29'))],
 ['invalid-apr31',()=>assert.throws(()=>toIsoDate('2026-04-31'))],
 ['invalid-month13',()=>assert.throws(()=>toIsoDate('2026-13-01'))],
 ['invalid-month00',()=>assert.throws(()=>toIsoDate('2026-00-01'))],
 ['invalid-day00',()=>assert.throws(()=>toIsoDate('2026-01-00'))],
 ['century-leap',()=>assert.equal(toIsoDate('2000-02-29'),'2000-02-29')],
 ['century-nonleap',()=>assert.throws(()=>toIsoDate('1900-02-29'))],
 ['year-0001',()=>assert.equal(toIsoDate('0001-01-01'),'0001-01-01')],
];
let failed=0;
for(const [id,fn] of tests){
  try{fn();console.log('CASE_PASS:'+id);}
  catch{failed++;console.log('CASE_FAIL:'+id);}
}
console.log('TRUSTED_TEST_END');
process.exitCode=failed?1:0;
"""
CASE_IDS = ("valid-leap","valid-date","timezone","date-object","invalid-text",
    "invalid-object","days-between","bucket-365","bucket-366","invalid-feb30",
    "invalid-leap","invalid-apr31","invalid-month13","invalid-month00",
    "invalid-day00","century-leap","century-nonleap","year-0001")
REQUIRED_BASELINE_FAILURES = {"invalid-feb30","invalid-leap","invalid-apr31","century-nonleap"}

def classify_result(returncode, output):
    # Require complete unique reports, reject early exits and contradictory output.
    lines=output.splitlines()
    if lines.count("TRUSTED_TEST_END") != 1:
        return False, ["test-process-incomplete"]
    cases={}
    for line in lines:
        match=re.fullmatch(r"CASE_(PASS|FAIL):([a-z0-9-]+)",line)
        if match:
            state, name=match.groups()
            if name not in CASE_IDS or name in cases:
                return False, ["test-process-invalid-report"]
            cases[name]=state
    if set(cases)!=set(CASE_IDS):
        return False, ["test-process-incomplete"]
    failed=[name for name in CASE_IDS if cases[name]=="FAIL"]
    if returncode not in (0,1) or (returncode==0)!= (not failed):
        return False, ["test-process-invalid-exit"]
    return not failed, failed

def sha256(path):
    with open(path, "rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()

def download(url, destination, expected, deadline):
    # Retain partial bytes across bounded transfers. Never execute or unpack
    # any asset until the complete pinned SHA256 matches.
    for attempt in range(1, 7):
        remaining = int(deadline - time.monotonic())
        if remaining < 5:
            break
        if destination.exists() and sha256(destination) == expected:
            return
        seconds = min(240, remaining - 2)
        resume = destination.exists() and destination.stat().st_size > 0
        command = ["curl", "--fail", "--silent", "--show-error", "--location",
                   "--proto", "=https", "--proto-redir", "=https",
                   "--connect-timeout", "20", "--max-time", str(seconds)]
        if resume:
            command += ["--continue-at", "-"]
        command += ["-o", str(destination), url]
        try:
            result = subprocess.run(command, check=False, timeout=seconds + 1)
        except subprocess.TimeoutExpired:
            print("ASSET_TRANSFER_TIMEOUT attempt="+str(attempt), flush=True)
            continue
        if destination.exists() and sha256(destination) == expected:
            return
        if result.returncode == 0:
            raise RuntimeError("PINNED_ASSET_HASH_MISMATCH")
        if result.returncode in (33, 36) and resume:
            # Server rejected resume. Restart only within the same deadline.
            destination.unlink(missing_ok=True)
        elif result.returncode not in (18, 28, 33, 36, 52, 55, 56):
            raise RuntimeError("PINNED_ASSET_TRANSFER_FAILED:"+str(result.returncode))
        print("ASSET_TRANSFER_INCOMPLETE attempt="+str(attempt)+
              " bytes="+str(destination.stat().st_size if destination.exists() else 0), flush=True)
    raise RuntimeError("PINNED_ASSET_DOWNLOAD_BUDGET_EXHAUSTED")

def check_candidate(work):
    cmd = ["docker", "run", "--rm", "--network", "none", "--read-only",
           "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
           "--pids-limit", "64", "--memory", "256m", "--cpus", "1",
           "--user", "65534:65534", "-v", str(work)+":/work:ro", "-w", "/work",
           "node:22-bookworm-slim", "node", "--experimental-strip-types", "test.mjs"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
    except subprocess.TimeoutExpired:
        return False, ["test-process-timeout"]
    return classify_result(result.returncode,result.stdout)

FAILURE_DETAILS = {
    "timezone": "toIsoDate('2026-11-24T23:45:00-02:00') MUST return '2026-11-25'.",
    "invalid-feb30": "toIsoDate('2026-02-30') MUST throw, not normalize to March.",
    "invalid-leap": "toIsoDate('2025-02-29') MUST throw.",
    "invalid-apr31": "toIsoDate('2026-04-31') MUST throw.",
    "century-nonleap": "toIsoDate('1900-02-29') MUST throw.",
    "century-leap": "toIsoDate('2000-02-29') MUST return '2000-02-29'.",
    "year-0001": "toIsoDate('0001-01-01') MUST preserve that exact date.",
}
def retry_prompt(original, candidate, failures, repeat):
    details="\n".join(FAILURE_DETAILS.get(name, "Preserve fixed test: "+name)
                      for name in failures if name in CASE_IDS)
    if not details:
        details="The test process did not produce a complete valid report. Return only the pure guard statements."
    if repeat:
        return (original+"\nDiscard the repeated proposal. Start from the ORIGINAL function. "
                "Use a minimal guard only for exact date-only strings. Do not change timestamp handling.\n"+details)
    return (original+"\nPrevious proposal (code data):\n"+candidate+
            "\nThese exact fixed assertions failed:\n"+details+
            "\nUse the smallest possible change to the ORIGINAL function, not a rewrite.")

# An edit is data, never a command. Preserve the original parsing, invalid-Date
# check and return statement byte-for-byte. This is a narrow repair recipe, not
# a general-purpose code execution or a proof of autonomous development.
RETURN_ANCHOR = "  return date.toISOString().slice(0, 10);"
def parse_guard(value):
    value=value.strip()
    match=re.fullmatch(r"```(?:typescript|ts)?\s*\n(.*?)\n```",value,re.S)
    if match:
        value=match.group(1).strip()
    if (not value or len(value)>1200 or len(value.splitlines())>12 or
        not re.search(r"\bif\s*\(",value) or not re.search(r"\bthrow\b",value) or
        re.search(r"\b(?:return|function|import|export|class|process|globalThis|require|eval|fetch|console|await|async)\b",value)):
        raise ValueError("MODEL_GUARD_REJECTED")
    return value

def compose_guard(original, guard):
    if original.count(RETURN_ANCHOR)!=1:
        raise RuntimeError("EDIT_ANCHOR_CHANGED")
    guard=parse_guard(guard)
    addition="".join("  "+line+"\n" for line in guard.splitlines())
    candidate=original.replace(RETURN_ANCHOR,addition+RETURN_ANCHOR,1)
    if candidate.replace(addition,"",1)!=original:
        raise RuntimeError("EDIT_SCOPE_CHANGED")
    return candidate

def parse_model_response(raw):
    if not isinstance(raw,str) or len(raw)>8000:
        raise ValueError("MODEL_RESPONSE_LIMIT")
    try:
        obj=json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("MODEL_JSON_INVALID") from exc
    if not isinstance(obj,dict) or set(obj)!={"guard"} or not isinstance(obj["guard"],str):
        raise ValueError("MODEL_JSON_SCHEMA_INVALID")
    return parse_guard(obj["guard"])

# The trusted boundary excludes timestamps and Date instances. The model
# must invent the invalid-calendar predicate; no fallback repair.
def parse_model_condition(raw):
    if not isinstance(raw,str) or len(raw)>8000:
        raise ValueError("MODEL_RESPONSE_LIMIT")
    try:
        obj=json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("MODEL_JSON_INVALID") from exc
    if not isinstance(obj,dict) or set(obj)!={"condition"} or not isinstance(obj["condition"],str):
        raise ValueError("MODEL_CONDITION_SCHEMA_INVALID")
    condition=obj["condition"].strip()
    if not condition or len(condition)>500 or not re.fullmatch(r"[A-Za-z0-9_.(), !<>=&|+\-*: ?]+",condition):
        raise ValueError("MODEL_CONDITION_SYNTAX")
    identifiers=set(re.findall(r"[A-Za-z_][A-Za-z0-9_]*",condition))
    allowed={"value","date","toISOString","slice","substring","getUTCFullYear","getUTCMonth","getUTCDate","length","Number","parseInt","true","false"}
    if not identifiers<=allowed or not {"value","date"}<=identifiers or re.search(r"(?<![=!<>])=(?!=)|\+\+|--",condition):
        raise ValueError("MODEL_CONDITION_SCOPE")
    depth=0
    for char in condition:
        if char=="(": depth+=1
        if char==")": depth-=1
        if depth<0: raise ValueError("MODEL_CONDITION_PARENS")
    if depth: raise ValueError("MODEL_CONDITION_PARENS")
    return condition

def compose_date_only_condition(original,condition):
    condition=parse_model_condition(json.dumps({"condition":condition}))
    if original.count(RETURN_ANCHOR)!=1:
        raise RuntimeError("EDIT_ANCHOR_CHANGED")
    addition=(
        r'  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {'+'\n'
        '    if ('+condition+') throw new Error("Invalid calendar date");\n'
        '  }\n'
    )
    candidate=original.replace(RETURN_ANCHOR,addition+RETURN_ANCHOR,1)
    if candidate.replace(addition,"",1)!=original:
        raise RuntimeError("EDIT_SCOPE_CHANGED")
    return candidate

def generate(prompt, attempt=1):
    request = urllib.request.Request("http://127.0.0.1:18081/v1/chat/completions",
        data=json.dumps({"model": "local", "messages": [{"role":"system","content":
          "Return one JSON object with exactly one string field named condition: a TypeScript boolean expression true for an invalid exact calendar day. No statements, assignments, braces, tools or explanation."},
          {"role":"user","content":prompt}], "temperature":0.0 if attempt == 1 else 0.25, "max_tokens":1200, "response_format":{"type":"json_object"}}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(request, timeout=300) as response:
        result=json.load(response)
    choice=result["choices"][0]
    raw=choice["message"]["content"]
    if isinstance(raw,str):
        # Bounded encoded output for diagnosing rejected protocol responses.
        # Model has only the public source and allowed test identifiers.
        print("MODEL_RAW_OUTPUT_BASE64="+base64.b64encode(raw[:8000].encode()).decode(),flush=True)
    if choice.get("finish_reason") != "stop":
        raise ValueError("MODEL_OUTPUT_NOT_COMPLETE")
    return parse_model_condition(raw)

def main():
    source=SOURCE.read_text()
    delimiter="\nexport function daysBetween("
    if source.count(delimiter)!=1:
        raise RuntimeError("CANONICAL_SOURCE_CHANGED")
    before, after=source.split(delimiter,1)
    # Pin the task to an actual existing source. No fabricated baseline.
    with tempfile.TemporaryDirectory(prefix="sadiaaf-model-") as tmp:
        root=Path(tmp)
        work=root/"candidate"
        work.mkdir(mode=0o755)
        (work/"dates.ts").write_text(source)
        (work/"test.mjs").write_text(TEST)
        subprocess.run(["docker","pull","node:22-bookworm-slim"],check=True,timeout=180)
        baseline_ok, baseline_failures=check_candidate(work)
        print("BASELINE_FAILURE_IDS="+json.dumps(baseline_failures),flush=True)
        if baseline_ok or set(baseline_failures)!=REQUIRED_BASELINE_FAILURES:
            raise RuntimeError("REAL_RED_NOT_REPRODUCED")
        print("RED_CONFIRMED: real existing calendar rollover",flush=True)
        archive=root/"llama.tar.gz"
        asset_deadline=time.monotonic()+1200
        download(ENGINE,archive,ENGINE_SHA,asset_deadline)
        subprocess.run(["tar","-xzf",str(archive),"-C",str(root)],check=True,timeout=60)
        binaries=list(root.rglob("llama-server"))
        if len(binaries)!=1:
            raise RuntimeError("PINNED_ENGINE_LAYOUT_UNEXPECTED")
        binary=binaries[0]
        for filename,digest in PARTS:
            download("https://huggingface.co/"+MODEL+"/resolve/"+MODEL_REV+"/"+filename,
                     root/filename,digest,asset_deadline)
        print("PINNED_ENGINE_AND_MODEL_SHA256_VERIFIED",flush=True)
        # Do not propagate a GitHub/API token, secrets, or arbitrary env to model.
        env={"PATH":os.defpath,"HOME":str(root),"LD_LIBRARY_PATH":str(binary.parent)}
        with (root/"server.log").open("wb") as log:
            process=subprocess.Popen([str(binary),"-m",str(root/PARTS[0][0]),"--host",
                "127.0.0.1","--port","18081","-c","4096","-t","4","-ngl","0"],
                env=env, stdout=log,stderr=log,cwd=root)
            try:
                for _ in range(90):
                    if process.poll() is not None:
                        raise RuntimeError("MODEL_SERVER_EXITED")
                    try:
                        with urllib.request.urlopen("http://127.0.0.1:18081/health",timeout=2) as health:
                            if health.status==200:
                                break
                    except OSError:
                        pass
                    time.sleep(2)
                else:
                    raise RuntimeError("MODEL_START_TIMEOUT")
                prompt=("Generate a boolean predicate true only when an exact YYYY-MM-DD "
                        "input has an impossible calendar day. The trusted harness already checks "
                        "that value is an exact date-only string, so do not test its type or format. "
                        "The original string is value and its parsed Date is date. Use both. "
                        "Preserve valid leap days, dates in year 0001, and all original statements. "
                        "Use only side-effect-free expressions using value, date, toISOString, slice, "
                        "substring, getUTCFullYear, getUTCMonth, getUTCDate, length, Number or parseInt. "
                        "Return JSON with one field condition. No code statements, quotes inside the "
                        "expression, or additional fields. Original function:\n"+before)
                original_prompt=prompt
                seen_candidates=set()
                for attempt in range(1,4):
                    try:
                        condition=generate(prompt,attempt)
                        candidate=compose_date_only_condition(before,condition)
                    except (ValueError,KeyError) as error:
                        print("MODEL_OUTPUT_FORMAT_REJECTED",attempt,type(error).__name__,str(error)[:120],flush=True)
                        prompt=original_prompt+"\nReturn one JSON object containing only the condition expression."
                        continue
                    digest=hashlib.sha256(candidate.encode()).hexdigest()
                    repeat=digest in seen_candidates
                    seen_candidates.add(digest)
                    print("PROPOSAL_SHA256="+digest+" REPEAT="+str(repeat),flush=True)
                    print("PROPOSAL_BASE64="+base64.b64encode(candidate.encode()).decode(),flush=True)
                    (work/"dates.ts").write_text(candidate+delimiter+after)
                    # Output is untrusted, never run it on host, never publish to Git.
                    passed, failures=check_candidate(work)
                    print("CANDIDATE_ATTEMPT="+str(attempt)+" SHA256="+sha256(work/"dates.ts")+
                          " FAILED_CASE_IDS="+json.dumps(failures),flush=True)
                    if passed:
                        print("REAL_MODEL_GREEN attempt="+str(attempt),flush=True)
                        print("CANDIDATE_SHA256="+sha256(work/"dates.ts"),flush=True)
                        print("CANDIDATE_FUNCTION_BASE64="+base64.b64encode(candidate.encode()).decode(),flush=True)
                        return
                    print("MODEL_CANDIDATE_REJECTED_BY_TESTS",attempt,flush=True)
                    # Only allowlisted test identifiers and the previous generated
                    # source as data; never feed arbitrary runtime logs/instructions.
                    prompt=original_prompt+"\nPrevious predicate rejected: "+condition+"\nFixed assertions failed: "+json.dumps([x for x in failures if x in CASE_IDS])+"\nGenerate a different correct predicate."
                raise RuntimeError("MODEL_DID_NOT_PASS_REAL_TASK")
            finally:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
if __name__=="__main__":
    main()
