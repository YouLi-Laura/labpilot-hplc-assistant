import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DISCLAIMER,
  complianceModifiers,
  globalStopConditions,
  hplcDiagnosticRules
} from "../../src/rules/hplcDiagnosticRules.js";

const expectedRuleIds = [
  "retention_time_drift",
  "resolution_loss",
  "peak_tailing",
  "area_abnormal",
  "baseline_abnormal",
  "unknown_impurity_peak"
];

test("exports one readable rule for each supported abnormality", () => {
  assert.deepEqual(hplcDiagnosticRules.map((rule) => rule.id).sort(), expectedRuleIds.sort());
  for (const rule of hplcDiagnosticRules) {
    assert.match(rule.version, /^v\d+\.\d+\.\d+$/);
    assert.equal(rule.lastReviewedAt, "2026-07-11");
    assert.ok(["低", "中", "高"].includes(rule.baseRiskLevel));
    assert.ok(rule.causeCandidates.length >= 3, `${rule.id} has cause candidates`);
    assert.ok(rule.stepTemplates.length >= 3, `${rule.id} has troubleshooting steps`);
    assert.ok(rule.stopConditions.length >= 1, `${rule.id} has stop conditions`);
  }
});

test("uses cautious wording instead of deterministic root-cause claims", () => {
  const forbidden = /(确定|证明|必然|一定是|根因是)/;
  for (const rule of hplcDiagnosticRules) {
    for (const cause of rule.causeCandidates) {
      assert.match(cause.text, /(可能|建议优先检查|可考虑)/);
      assert.doesNotMatch(cause.text, forbidden);
    }
    for (const step of rule.stepTemplates) {
      assert.doesNotMatch(step.action, forbidden);
      assert.doesNotMatch(step.rationale, forbidden);
    }
  }
});

test("defines GMP guardrail modifiers and global stop conditions", () => {
  assert.ok(DEFAULT_DISCLAIMER.includes("不替代 GMP 调查结论"));
  assert.ok(globalStopConditions.some((condition) => condition.id === "stop_sst_failed"));
  assert.ok(globalStopConditions.some((condition) => condition.id === "stop_blank_unknown_peak"));
  assert.ok(complianceModifiers.some((modifier) => modifier.id === "sst_failed_blocks_reporting"));
  assert.ok(complianceModifiers.some((modifier) => modifier.id === "blank_unknown_peak_contamination_first"));
  assert.ok(complianceModifiers.some((modifier) => modifier.id === "mobile_phase_remake_rt_resolution_changed"));
});
