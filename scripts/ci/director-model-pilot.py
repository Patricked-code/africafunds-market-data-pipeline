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

def download(url, destination, expected):
    subprocess.run(["curl", "--fail", "--silent", "--show-error", "--location",
                    "--proto", "=https", "--proto-redir", "=https", "--retry", "1",
                    "--connect-timeout", "20", "--max-time", "480", "-o",
                    str(destination), url], check=True, timeout=500)
    if sha256(destination) != expected:
        raise RuntimeError("PINNED_ASSET_HASH_MISMATCH")

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

def generate(prompt):
    request = urllib.request.Request("http://127.0.0.1:18081/v1/chat/completions",
        data=json.dumps({"model": "local", "messages": [{"role":"system","content":
          "Return only the requested TypeScript function. No tool calls, no explanation."},
          {"role":"user","content":prompt}], "temperature":0.0, "max_tokens":1000}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(request, timeout=300) as response:
        result=json.load(response)
    choice=result["choices"][0]
    if choice.get("finish_reason") == "length":
        raise ValueError("MODEL_OUTPUT_TRUNCATED")
    value=choice["message"]["content"].strip()
    match=re.fullmatch(r"```(?:typescript|ts)?\s*\n(.*?)\n```",value,re.S)
    if match:
        value=match.group(1).strip()
    if len(value)>5000 or not value.startswith("export function toIsoDate(") or not value.endswith("}"):
        raise ValueError("MODEL_OUTPUT_REJECTED")
    return value+"\n"

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
        download(ENGINE,archive,ENGINE_SHA)
        subprocess.run(["tar","-xzf",str(archive),"-C",str(root)],check=True,timeout=60)
        binaries=list(root.rglob("llama-server"))
        if len(binaries)!=1:
            raise RuntimeError("PINNED_ENGINE_LAYOUT_UNEXPECTED")
        binary=binaries[0]
        for filename,digest in PARTS:
            download("https://huggingface.co/"+MODEL+"/resolve/"+MODEL_REV+"/"+filename,
                     root/filename,digest)
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
                prompt=("Fix the actual TypeScript toIsoDate function below: reject invalid calendar "
                        "days for exact YYYY-MM-DD strings instead of accepting JS Date rollover. "
                        "Preserve behavior for valid date-only strings, Date objects, timezone-qualified "
                        "timestamps and invalid inputs. Preserve the exported signature. Return ONLY "
                        "the full replacement function, no imports, no new dependencies. "
                        "Requirements: exact YYYY-MM-DD strings must round-trip to the same calendar "
                        "date in UTC; invalid dates must throw. Preserve years 0001-0099 and Gregorian "
                        "leap-year rules; preserve timezone-qualified timestamp conversion. "
                        "Do not use local time, mutate other functions, log or access process, network "
                        "or filesystem. The tests are fixed.\n"+before)
                original_prompt=prompt
                for attempt in range(1,4):
                    try:
                        candidate=generate(prompt)
                    except (ValueError,KeyError):
                        print("MODEL_OUTPUT_FORMAT_REJECTED",attempt,flush=True)
                        prompt=original_prompt+"\nReturn only the complete requested function, no prose."
                        continue
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
                    prompt=original_prompt+"\nPrevious proposal (code data):\n"+candidate+(
                        "\nFixed validation failures: "+", ".join(failures)+
                        ". Correct these cases while preserving all other cases.")
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
