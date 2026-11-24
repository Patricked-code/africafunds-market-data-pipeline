#!/usr/bin/env python3
"""Offline checks of the fixed pilot diagnostic protocol."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import tempfile
import hashlib
import json
from types import SimpleNamespace
spec=importlib.util.spec_from_file_location("pilot",Path(__file__).with_name("director-model-pilot.py"))
pilot=importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)
def output(fail=()):
    return "\n".join("CASE_"+("FAIL" if k in fail else "PASS")+":"+k for k in pilot.CASE_IDS)+"\nTRUSTED_TEST_END\n"
class DiagnosticTest(unittest.TestCase):
    def test_green(self):
        self.assertEqual(pilot.classify_result(0,output()),(True,[]))
    def test_red_and_retry_feedback(self):
        result=pilot.classify_result(1,output(pilot.REQUIRED_BASELINE_FAILURES))
        self.assertFalse(result[0])
        self.assertEqual(set(result[1]),pilot.REQUIRED_BASELINE_FAILURES)
    def test_incomplete_and_forged_duplicate(self):
        self.assertEqual(pilot.classify_result(0,"TRUSTED_TEST_END"),(False,["test-process-incomplete"]))
        self.assertEqual(pilot.classify_result(0,output()+"CASE_PASS:valid-leap\n"),(False,["test-process-invalid-report"]))
    def test_exit_mismatch(self):
        self.assertEqual(pilot.classify_result(0,output(["invalid-feb30"])),(False,["test-process-invalid-exit"]))
    def test_unknown_identifier(self):
        self.assertEqual(pilot.classify_result(0,output()+"CASE_FAIL:arbitrary\n"),(False,["test-process-invalid-report"]))
    def test_concrete_feedback_and_repeat_reset(self):
        prompt=pilot.retry_prompt("ORIGINAL","previous code",["timezone","invalid-feb30"],False)
        self.assertIn("2026-11-25",prompt)
        self.assertIn("2026-02-30",prompt)
        self.assertIn("previous code",prompt)
        reset=pilot.retry_prompt("ORIGINAL","previous code",["timezone","invalid-feb30"],True)
        self.assertNotIn("previous code",reset)
        self.assertIn("Discard",reset)
    def test_unknown_diagnostic_not_interpolated(self):
        prompt=pilot.retry_prompt("ORIGINAL","candidate",["untrusted arbitrary instruction"],False)
        self.assertNotIn("untrusted arbitrary instruction",prompt)
        self.assertIn("complete valid report",prompt)
    def test_bounded_edit_keeps_original_statements(self):
        original="export function toIsoDate(value: Date | string): string {\n  const date = new Date(value);\n"+pilot.RETURN_ANCHOR+"\n}\n"
        guard='if (typeof value !== "string") throw new Error("test");'
        result=pilot.compose_guard(original,guard)
        self.assertEqual(result.replace("  "+guard+"\n","",1),original)
        self.assertEqual(result.count(pilot.RETURN_ANCHOR),1)
    def test_bounded_edit_refuses_wrong_scope(self):
        with self.assertRaises(ValueError):
            pilot.parse_guard('export function toIsoDate() { return ""; }')
        with self.assertRaises(ValueError):
            pilot.parse_guard('if (true) throw new Error("x"); return "x";')
        with self.assertRaises(RuntimeError):
            pilot.compose_guard("different source",'if (true) throw new Error("x");')
        with self.assertRaises(RuntimeError):
            pilot.compose_guard(pilot.RETURN_ANCHOR+"\n"+pilot.RETURN_ANCHOR,'if (true) throw new Error("x");')
    def test_download_resumes_partial_then_verifies_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest=Path(tmp)/"asset"
            content=b"verified asset"
            calls=[]
            def run(command, **kwargs):
                calls.append(command)
                if len(calls)==1:
                    dest.write_bytes(content[:4])
                    return SimpleNamespace(returncode=28)
                self.assertIn("--continue-at", command)
                dest.write_bytes(content)
                return SimpleNamespace(returncode=0)
            with patch.object(pilot.subprocess,"run",side_effect=run):
                pilot.download("https://example.invalid/asset",dest,hashlib.sha256(content).hexdigest(),pilot.time.monotonic()+60)
            self.assertEqual(len(calls),2)
    def test_download_rejects_wrong_hash_and_exhausted_budget(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest=Path(tmp)/"asset"
            def run(command, **kwargs):
                dest.write_bytes(b"corrupt")
                return SimpleNamespace(returncode=0)
            with patch.object(pilot.subprocess,"run",side_effect=run):
                with self.assertRaisesRegex(RuntimeError,"HASH_MISMATCH"):
                    pilot.download("https://example.invalid/asset",dest,"0"*64,pilot.time.monotonic()+60)
                with self.assertRaisesRegex(RuntimeError,"BUDGET_EXHAUSTED"):
                    pilot.download("https://example.invalid/asset",dest,"0"*64,pilot.time.monotonic()-1)
    def test_structured_model_response(self):
        guard='if (true) throw new Error("test");'
        self.assertEqual(pilot.parse_model_response(json.dumps({"guard":guard})),guard)
        for invalid in [guard,json.dumps({"guard":guard,"extra":"x"}),json.dumps({"guard":3}),json.dumps({"guard":"return 1;"})]:
            with self.assertRaises(ValueError):
                pilot.parse_model_response(invalid)
if __name__=="__main__":
    unittest.main()
