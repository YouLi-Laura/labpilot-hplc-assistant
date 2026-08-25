import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseHplcIssue } from "../../src/engine/diagnoseHplcIssue.js";

test("returns a structured diagnostic result with user input summary", () => {
  const result = diagnoseHplcIssue({
    anomalyTypes: ["peak_tailing"],
    systemSuitabilityPassed: "unknown",
    blankHasUnknownPeak: false,
    mobilePhaseRemadeRecently: false,
    retentionTimeChangedAfterRemake: false,
    resolutionChangedAfterRemake: false,
    affectedScope: "sample_only",
    affectedPeaks: ["主峰"],
    observedSymptoms: ["主峰拖尾因子升高"],
    freeTextNotes: "演示输入"
  });

  assert.equal(result.riskLevel, "中");
  assert.deepEqual(result.inputSummary.anomalyLabels, ["峰拖尾"]);
  assert.equal(result.inputSummary.systemSuitabilityStatus, "未确认");
  assert.equal(result.inputSummary.blankStatus, "Blank 未见未知峰");
  assert.equal(result.inputSummary.retentionTimeChangedAfterRemake, "未变化");
  assert.equal(result.inputSummary.resolutionChangedAfterRemake, "未变化");
  assert.equal(result.inputSummary.freeTextNotes, "演示输入");
  assert.equal(result.inputSummary.affectedScope, "仅样品受影响");
  assert.ok(result.probableCauses.some((cause) => cause.includes("可能")));
  assert.ok(result.troubleshootingSteps.length >= 3);
  assert.ok(result.troubleshootingSteps.every((step) => step.action && step.rationale));
  assert.ok(result.stopConditions.length >= 1);
  assert.ok(result.disclaimer.includes("不替代 GMP 调查结论"));
});

test("escalates risk and blocks direct sample reporting when System suitability fails", () => {
  const result = diagnoseHplcIssue({
    anomalyTypes: ["resolution_loss"],
    systemSuitabilityPassed: false,
    blankHasUnknownPeak: false,
    mobilePhaseRemadeRecently: false,
    retentionTimeChangedAfterRemake: false,
    resolutionChangedAfterRemake: false,
    affectedScope: "all",
    affectedPeaks: ["相邻杂质峰"],
    observedSymptoms: ["分离度低于系统适用性限度"]
  });

  assert.equal(result.riskLevel, "高");
  assert.ok(result.stopConditions.some((text) => text.includes("停止直接报告样品结果")));
  assert.ok(result.troubleshootingSteps.every((step) => !step.action.includes("继续报告样品结果")));
});

test("prioritizes contamination checks when Blank has an unknown peak", () => {
  const result = diagnoseHplcIssue({
    anomalyTypes: ["unknown_impurity_peak"],
    systemSuitabilityPassed: "unknown",
    blankHasUnknownPeak: true,
    mobilePhaseRemadeRecently: false,
    retentionTimeChangedAfterRemake: false,
    resolutionChangedAfterRemake: false,
    affectedScope: "blank_standard_sample",
    affectedPeaks: ["未知峰 RT 约 4.2 min"],
    observedSymptoms: ["Blank、标准、样品均见未知峰"]
  });

  assert.equal(result.riskLevel, "高");
  assert.deepEqual(result.troubleshootingSteps.slice(0, 5).map((step) => step.id), [
    "check_mobile_phase_contamination",
    "check_injection_system",
    "check_needle_wash",
    "check_solvents",
    "check_carryover"
  ]);
  assert.ok(result.probableCauses[0].includes("流动相"));
});

test("prioritizes mobile-phase remake checks when retention time and resolution both change", () => {
  const result = diagnoseHplcIssue({
    anomalyTypes: ["retention_time_drift", "resolution_loss"],
    systemSuitabilityPassed: "unknown",
    blankHasUnknownPeak: false,
    mobilePhaseRemadeRecently: true,
    retentionTimeChangedAfterRemake: true,
    resolutionChangedAfterRemake: true,
    affectedScope: "all",
    affectedPeaks: ["主峰", "相邻杂质峰"],
    observedSymptoms: ["重新配制流动相后 RT 和分离度均变化"]
  });

  assert.equal(result.riskLevel, "高");
  assert.deepEqual(result.troubleshootingSteps.slice(0, 5).map((step) => step.id), [
    "verify_mobile_phase_ratio",
    "verify_additives",
    "verify_ph",
    "verify_solvent_lot",
    "verify_degas_equilibration"
  ]);
});
