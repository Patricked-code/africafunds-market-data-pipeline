#!/usr/bin/env python3
"""Offline checks of the fixed pilot diagnostic protocol."""
import importlib.util
from pathlib import Path
import unittest
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
if __name__=="__main__":
    unittest.main()
