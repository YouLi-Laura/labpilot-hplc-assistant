import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseHplcIssueV2 } from "../../src/engine/diagnoseHplcIssue.js";
import { demoCaseA, demoCases } from "../../src/demo/demoCases.js";

test("marks the demo case as fictional and free of real company data", () => {
  assert.equal(demoCases.length, 1);
  assert.equal(demoCaseA.isFictional, true);
  assert.equal(demoCaseA.companyDataUsed, false);
  assert.match(demoCaseA.title, /虚构演示案例/);
});

test("demo case exercises SST failure, Blank unknown peak, and solvent batch change", () => {
  assert.equal(demoCaseA.primaryAnomaly, "unknown_impurity_peak");
  assert.equal(demoCaseA.step3Answers.systemSuitabilityPassed, "failed");
  assert.ok(demoCaseA.step2Answers.peakLocations.includes("Blank"));
  assert.equal(demoCaseA.step3Answers.solventOrReagentBatchChanged, "yes");

  const result = diagnoseHplcIssueV2({
    primaryAnomaly: demoCaseA.primaryAnomaly,
    step2Answers: demoCaseA.step2Answers,
    step3Answers: demoCaseA.step3Answers
  });

  assert.equal(result.riskLevel, "高");
  assert.ok(result.complianceBanner !== null);
  assert.ok(result.complianceBanner.message.includes("暂停样品结果报告"));
  assert.equal(result.topDirections.length, 3);
  assert.ok(result.topDirections.some((d) => d.evidence.length > 0));
  assert.ok(result.otherDirections.length >= 1);
});
