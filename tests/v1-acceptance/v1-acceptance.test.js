/**
 * V1 Acceptance Test Suite — HPLC Diagnostic Rule Engine
 *
 * Covers 4 standard scenarios + 6 guardrail checks.
 * Run: npm test -- tests/v1-acceptance/v1-acceptance.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseHplcIssueV2 } from "../../src/engine/diagnoseHplcIssue.js";
import { generateDirections } from "../../src/ui/diagnosticDirections.js";
import { getAutoSyncBlankFields, validateStep2Answers } from "../../src/ui/stepQuestions.js";

// =============================================================================
// Helper: check if text appears in any top direction's evidence labels
// =============================================================================
function evidenceContainsAny(topDirections, text) {
  return topDirections.some((d) => d.evidence.some((e) => e.label.includes(text)));
}

function rationaleContainsAny(topDirections, text) {
  return topDirections.some((d) => (d.rationale || "").includes(text));
}

function topDirectionTitleContains(topDirections, n, text) {
  return topDirections.length >= n && topDirections[n - 1].title.includes(text);
}

function topDirectionContains(topDirections, text) {
  return topDirections.some((d) => d.title.includes(text));
}

function topDirectionNotContains(topDirections, text) {
  return !topDirectionContains(topDirections, text);
}

// =============================================================================
// Scenario A: External mobile phase / reagent / container contamination
// =============================================================================

test("Scenario A: External mobile phase / reagent / container contamination", async (t) => {
  const input = {
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: {
      peakLocations: ["Blank", "Standard", "Sample"],
      hasFixedRT: "yes",
      repeatInjectionAreaStable: "yes",
      variesWithConc: "no",
      relatedToPrevHighConc: "noRelation",
      firstBlankAppears: "appearObvious",
      blankAfterHighConcFirst: "similarToFirst",
      blankTrend: "stable",
      repeatedInjection: "everyTime",
      sampleOccurrenceScope: "allSamples",
      areaChangesWithTime: "notTested",
    },
    step3Answers: {
      mobilePhaseRemadeRecently: "yes",
      columnRecentlyReplaced: "no",
      solventOrReagentBatchChanged: "yes",
      injectorRecentlyServiced: "no",
      systemPressureAbnormal: "no",
      systemSuitabilityPassed: "failed",
    },
  };

  const result = diagnoseHplcIssueV2(input);

  await t.test("A1: Top 1 is mobile phase / container contamination", () => {
    assert.ok(
      topDirectionTitleContains(result.topDirections, 1, "流动相"),
      "Expected mobile phase / container direction at #1, got: " + result.topDirections[0]?.title
    );
  });

  await t.test("A2: Solvent batch direction in Top 3", () => {
    assert.ok(
      topDirectionContains(result.topDirections, "批次变化"),
      "Expected solvent batch direction in top 3"
    );
  });

  await t.test("A3: Carryover NOT in Top 3 (firstBlank=obvious, blankAfter=similar)", () => {
    assert.ok(
      topDirectionNotContains(result.topDirections, "Carryover"),
      "Carryover should NOT be in top 3 for this input pattern"
    );
  });

  await t.test("A4: Evidence '连续 Blank 中峰面积稳定' present (blankTrend=stable)", () => {
    assert.ok(
      evidenceContainsAny(result.topDirections, "连续 Blank 中峰面积稳定"),
      "Expected evidence for stable blank trend"
    );
  });

  await t.test("A5: Evidence '近期更换了溶剂或试剂批次' present (solventChanged=yes)", () => {
    assert.ok(
      evidenceContainsAny(result.topDirections, "更换了溶剂或试剂批次"),
      "Expected evidence for solvent batch change"
    );
  });

  await t.test("A6: No false evidence from notTested fields", () => {
    assert.ok(
      !evidenceContainsAny(result.topDirections, "首针 Blank 未出现"),
      "Should not claim firstBlank did not appear"
    );
  });

  await t.test("A7: Compliance banner present (SST=failed)", () => {
    assert.ok(result.complianceBanner !== null, "Expected compliance banner");
    assert.ok(
      result.complianceBanner.message.includes("暂停样品结果报告"),
      "Expected stop-reporting message"
    );
  });

  await t.test("A8: Risk level is high (SST=failed)", () => {
    assert.equal(result.riskLevel, "高");
  });

  await t.test("A9: Risk reasons include SST failed", () => {
    assert.ok(
      result.riskReasons.some((r) => r.includes("未通过")),
      "Expected SST failed risk reason"
    );
  });
});

// =============================================================================
// Scenario B: Typical carryover
// =============================================================================

test("Scenario B: Typical carryover", async (t) => {
  const input = {
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: {
      peakLocations: ["Blank", "Sample"],
      hasFixedRT: "yes",
      repeatInjectionAreaStable: "yes",
      variesWithConc: "no",
      relatedToPrevHighConc: "blankElevated",
      firstBlankAppears: "notAppear",
      blankAfterHighConcFirst: "higherThanFirst",
      blankTrend: "declining",
      repeatedInjection: "occasionally",
      sampleOccurrenceScope: "allSamples",
      areaChangesWithTime: "notTested",
    },
    step3Answers: {
      mobilePhaseRemadeRecently: "no",
      columnRecentlyReplaced: "no",
      solventOrReagentBatchChanged: "no",
      injectorRecentlyServiced: "no",
      systemPressureAbnormal: "no",
      systemSuitabilityPassed: "passed",
    },
  };

  const result = diagnoseHplcIssueV2(input);

  await t.test("B1: Top 1 is carryover / injection system", () => {
    assert.ok(
      topDirectionTitleContains(result.topDirections, 1, "进样系统") ||
        topDirectionTitleContains(result.topDirections, 1, "Carryover"),
      "Expected carryover direction at #1, got: " + result.topDirections[0]?.title
    );
  });

  await t.test("B2: Mobile phase NOT at #1 (carryover pattern should outrank)", () => {
    assert.ok(
      !topDirectionTitleContains(result.topDirections, 1, "流动相"),
      "Mobile phase should NOT be #1 for carryover pattern"
    );
  });

  await t.test("B3: Evidence '首针 Blank 未出现' present", () => {
    assert.ok(
      evidenceContainsAny(result.topDirections, "首针 Blank 未出现"),
      "Expected evidence for firstBlank not appeared"
    );
  });

  await t.test("B4: Evidence '连续 Blank 中未知峰逐针下降' present", () => {
    assert.ok(
      evidenceContainsAny(result.topDirections, "逐针下降"),
      "Expected evidence for declining blank trend"
    );
  });

  await t.test("B5: Evidence '高浓度样品后' present", () => {
    assert.ok(
      evidenceContainsAny(result.topDirections, "高浓度样品后"),
      "Expected evidence for blank after high conc"
    );
  });

  await t.test("B6: No '首针 Blank 即出现' claim (firstBlank=notAppear)", () => {
    assert.ok(
      !evidenceContainsAny(result.topDirections, "首针 Blank 即出现") &&
        !evidenceContainsAny(result.topDirections, "首针 Blank 出现且"),
      "Should not claim firstBlank appeared when answer is notAppear"
    );
  });

  await t.test("B7: Solvent batch NOT in Top 3 (solventChanged=no)", () => {
    assert.ok(
      topDirectionNotContains(result.topDirections, "批次变化"),
      "Solvent batch direction should NOT be in top 3"
    );
  });

  await t.test("B8: No compliance banner (SST=passed)", () => {
    assert.equal(result.complianceBanner, null, "Should not have compliance banner");
  });
});

// =============================================================================
// Scenario C: Sample-related factors
// =============================================================================

test("Scenario C: Sample-related factors", async (t) => {
  const input = {
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: {
      peakLocations: ["Sample"],
      hasFixedRT: "no",
      repeatInjectionAreaStable: "yes",
      variesWithConc: "positive",
      relatedToPrevHighConc: "noRelation",
      firstBlankAppears: "notAppear",
      blankAfterHighConcFirst: "notTested",
      blankTrend: "notTested",
      repeatedInjection: "everyTime",
      sampleOccurrenceScope: "specificSampleOnly",
      areaChangesWithTime: "increase",
    },
    step3Answers: {
      mobilePhaseRemadeRecently: "no",
      columnRecentlyReplaced: "no",
      solventOrReagentBatchChanged: "no",
      injectorRecentlyServiced: "no",
      systemPressureAbnormal: "no",
      systemSuitabilityPassed: "passed",
    },
  };

  const result = diagnoseHplcIssueV2(input);

  await t.test("C1: Top 1 is peak identity (hasFixedRT=no)", () => {
    assert.ok(
      topDirectionTitleContains(result.topDirections, 1, "同一峰"),
      "Expected peak identity direction at #1, got: " + result.topDirections[0]?.title
    );
  });

  await t.test("C2: Sample-specific direction in Top 3", () => {
    assert.ok(
      topDirectionContains(result.topDirections, "样品"),
      "Expected sample-specific direction in top 3"
    );
  });

  await t.test("C3: Evidence '仅特定样品出现' or '仅在特定样品中出现' present", () => {
    assert.ok(
      evidenceContainsAny(result.topDirections, "特定样品"),
      "Expected evidence for specific sample only"
    );
  });

  await t.test("C4: Evidence '峰面积随浓度正相关' present", () => {
    assert.ok(
      evidenceContainsAny(result.topDirections, "正相关"),
      "Expected evidence for varies with concentration"
    );
  });

  await t.test("C5: Evidence '样品放置后' present (areaChangesWithTime=increase)", () => {
    assert.ok(
      evidenceContainsAny(result.topDirections, "样品放置后"),
      "Expected evidence for area changes with time"
    );
  });

  await t.test("C6: Evidence '首针 Blank 未出现' present (firstBlank=notAppear)", () => {
    const found = evidenceContainsAny(result.topDirections, "首针 Blank 未出现");
    assert.ok(found, "Expected evidence for firstBlank not appeared in blank");
  });

  await t.test("C7: Mobile phase NOT at #1 (only Sample, not Blank)", () => {
    const firstReal = result.topDirections.find((d) => !d.isMetaDirection);
    assert.ok(
      firstReal && !firstReal.title.includes("流动相"),
      "Mobile phase should NOT be #1 when peak only in Sample, got: " + (firstReal?.title || "none")
    );
  });

  await t.test("C8: Solvent batch NOT in Top 3", () => {
    assert.ok(
      topDirectionNotContains(result.topDirections, "批次变化"),
      "Solvent batch direction should NOT be in top 3"
    );
  });
});

// =============================================================================
// Scenario D: Insufficient key information
// =============================================================================

test("Scenario D: Insufficient key information", async (t) => {
  const input = {
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: {
      peakLocations: ["Blank"],
      hasFixedRT: "yes",
      repeatInjectionAreaStable: "yes",
      variesWithConc: "unknown",
      relatedToPrevHighConc: "unknown",
      firstBlankAppears: "notTested",
      blankAfterHighConcFirst: "notTested",
      blankTrend: "notTested",
      repeatedInjection: "everyTime",
      sampleOccurrenceScope: "unknown",
      areaChangesWithTime: "notTested",
    },
    step3Answers: {
      mobilePhaseRemadeRecently: "no",
      columnRecentlyReplaced: "no",
      solventOrReagentBatchChanged: "no",
      injectorRecentlyServiced: "no",
      systemPressureAbnormal: "no",
      systemSuitabilityPassed: "passed",
    },
  };

  const result = diagnoseHplcIssueV2(input);

  await t.test("D1: Evidence-gap direction present in Top 3", () => {
    assert.ok(
      topDirectionContains(result.topDirections, "补充连续"),
      "Expected evidence-collection direction"
    );
  });

  await t.test("D2: Evidence-gap direction at #1 (all 3 blank fields notTested)", () => {
    // When all 3 blank sequence fields are notTested, gap must be #1
    const gapIndex = result.topDirections.findIndex((d) => d.title.includes("补充连续"));
    assert.ok(gapIndex === 0, "Expected gap at #1 (all 3 blank fields notTested), got #" + (gapIndex + 1));
  });

  await t.test("D3: No specific root-cause claim (firstBlank=notTested)", () => {
    const realDirs = result.topDirections.filter((d) => !d.isMetaDirection);
    for (const d of realDirs) {
      assert.ok(
        !(d.rationale || "").includes("首针 Blank 即出现"),
        d.title + " should not claim firstBlank when notTested"
      );
      assert.ok(
        !(d.rationale || "").includes("首针 Blank 出现且"),
        d.title + " should not claim firstBlank when notTested"
      );
    }
  });

  await t.test("D4: No false blankTrend evidence (blankTrend=notTested)", () => {
    assert.ok(
      !evidenceContainsAny(result.topDirections, "连续 Blank 稳定"),
      "Should not have stable blank trend evidence"
    );
    assert.ok(
      !evidenceContainsAny(result.topDirections, "逐针下降"),
      "Should not have declining blank trend evidence"
    );
  });

  await t.test("D5: No '近期更换' batch evidence (solventChanged=no)", () => {
    assert.ok(
      !evidenceContainsAny(result.topDirections, "更换了溶剂或试剂"),
      "Should not claim batch change when answer is no"
    );
  });

  await t.test("D6: Solvent batch direction NOT in Top 3", () => {
    assert.ok(
      topDirectionNotContains(result.topDirections, "批次变化"),
      "Solvent batch direction should NOT be in top 3"
    );
  });

  await t.test("D7: Every evidence item traceable to an input field", () => {
    const validFields = [
      "peakLocations", "hasFixedRT", "repeatInjectionAreaStable",
      "variesWithConc", "relatedToPrevHighConc", "firstBlankAppears",
      "blankAfterHighConcFirst", "blankTrend", "repeatedInjection",
      "sampleOccurrenceScope", "areaChangesWithTime",
      "mobilePhaseRemadeRecently", "columnRecentlyReplaced",
      "solventOrReagentBatchChanged", "injectorRecentlyServiced",
      "systemPressureAbnormal", "systemSuitabilityPassed",
    ];
    for (const d of result.topDirections) {
      for (const e of d.evidence) {
        assert.ok(
          validFields.includes(e.field),
          "Untraceable evidence field '" + e.field + "' in " + d.title
        );
      }
    }
    // Also check otherDirections
    for (const d of result.otherDirections) {
      for (const e of d.evidence) {
        assert.ok(
          validFields.includes(e.field),
          "Untraceable evidence field '" + e.field + "' in other: " + d.title
        );
      }
    }
  });
});

// =============================================================================
// Guardrail Tests
// =============================================================================

test("Guardrail 1: solventOrReagentBatchChanged=no → no batch change claims", async (t) => {
  const input = {
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: {
      peakLocations: ["Blank"],
      hasFixedRT: "yes",
      firstBlankAppears: "appearObvious",
      blankTrend: "stable",
      blankAfterHighConcFirst: "similarToFirst",
      repeatedInjection: "everyTime",
    },
    step3Answers: {
      solventOrReagentBatchChanged: "no",
      mobilePhaseRemadeRecently: "no",
      systemSuitabilityPassed: "passed",
    },
  };

  const result = diagnoseHplcIssueV2(input);

  await t.test("No batch change evidence in any direction", () => {
    const allDirs = [...result.topDirections, ...result.otherDirections];
    for (const d of allDirs) {
      for (const e of d.evidence) {
        assert.ok(
          !e.label.includes("更换了溶剂或试剂") && !e.label.includes("近期更换"),
          d.title + " has false batch evidence: " + e.label
        );
      }
    }
  });

  await t.test("Solvent batch direction not in Top 3", () => {
    assert.ok(
      topDirectionNotContains(result.topDirections, "批次变化"),
      "Solvent batch should not be in top 3 when both related fields are no"
    );
  });
});

test("Guardrail 2: blankTrend=notTested → no stable/declining claims", async (t) => {
  const input = {
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: {
      peakLocations: ["Blank"],
      hasFixedRT: "yes",
      firstBlankAppears: "appearObvious",
      blankAfterHighConcFirst: "notTested",
      blankTrend: "notTested",
      repeatedInjection: "everyTime",
    },
    step3Answers: {
      systemSuitabilityPassed: "passed",
    },
  };

  const result = diagnoseHplcIssueV2(input);
  const realDirs = result.topDirections.filter((d) => !d.isMetaDirection);

  await t.test("No '连续 Blank 稳定' in evidence or rationale", () => {
    for (const d of realDirs) {
      assert.ok(
        !evidenceContainsAny([d], "连续 Blank 稳定") &&
          !evidenceContainsAny([d], "连续 Blank 中峰面积稳定"),
        d.title + " has false stable blank trend"
      );
      assert.ok(
        !(d.rationale || "").includes("连续 Blank 稳定") &&
          !(d.rationale || "").includes("连续 Blank 峰面积稳定"),
        d.title + " rationale has false stable blank trend"
      );
    }
  });

  await t.test("No '连续 Blank 逐针下降' in evidence or rationale", () => {
    for (const d of realDirs) {
      assert.ok(
        !evidenceContainsAny([d], "逐针下降") && !(d.rationale || "").includes("逐针下降"),
        d.title + " has false declining claim"
      );
    }
  });
});

test("Guardrail 3: firstBlankAppears=appearObvious → peakLocations must contain Blank", async (t) => {
  await t.test("Auto-sync function adds Blank", () => {
    const sync = getAutoSyncBlankFields({
      peakLocations: ["Sample"],
      firstBlankAppears: "appearObvious",
    });
    assert.ok(sync !== null, "Expected auto-sync to trigger");
    assert.ok(sync.newValue.includes("Blank"), "Expected Blank in auto-synced locations");
  });

  await t.test("Validation catches un-fixed conflict", () => {
    const conflicts = validateStep2Answers({
      peakLocations: ["Sample"],
      firstBlankAppears: "appearObvious",
    });
    assert.ok(conflicts.length > 0, "Expected validation conflict");
    assert.ok(
      conflicts.some((c) => c.fields.includes("firstBlankAppears")),
      "Expected conflict about firstBlankAppears"
    );
  });

  await t.test("No conflict when already synced (with sampleOccurrenceScope to avoid missing-field conflict)", () => {
    const conflicts = validateStep2Answers({
      peakLocations: ["Sample", "Blank"],
      firstBlankAppears: "appearObvious",
      sampleOccurrenceScope: "allSamples",
    });
    assert.equal(conflicts.length, 0, "Should have no conflicts when fully synced: " + conflicts.map(c => c.message).join("; "));
  });
});

test("Guardrail 4: hasFixedRT=no → peak identity direction in Top 3", async (t) => {
  const input = {
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: {
      peakLocations: ["Blank"],
      hasFixedRT: "no",
      firstBlankAppears: "appearObvious",
      blankTrend: "notTested",
      blankAfterHighConcFirst: "notTested",
      repeatedInjection: "everyTime",
    },
    step3Answers: {
      systemSuitabilityPassed: "passed",
    },
  };

  const result = diagnoseHplcIssueV2(input);

  await t.test("Peak identity direction in Top 3", () => {
    assert.ok(
      topDirectionContains(result.topDirections, "同一峰"),
      "Expected peak identity direction"
    );
  });

  await t.test("Peak identity direction at #1", () => {
    assert.ok(
      topDirectionTitleContains(result.topDirections, 1, "同一峰"),
      "Expected peak identity at #1, got: " + result.topDirections[0]?.title
    );
  });

  await t.test("Confidence of real directions downgraded", () => {
    const realDirs = result.topDirections.filter((d) => !d.isMetaDirection);
    // With hasFixedRT=no, all real directions should be '较低' or at most '中等'
    for (const d of realDirs) {
      assert.ok(
        d.confidence === "较低" || d.confidence === "中等",
        d.title + " confidence should be downgraded, got: " + d.confidence
      );
    }
  });
});

test("Guardrail 5: systemSuitabilityPassed=failed → stop-reporting banner", async (t) => {
  const input = {
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: {
      peakLocations: ["Blank"],
      hasFixedRT: "yes",
      firstBlankAppears: "appearObvious",
      blankTrend: "stable",
      blankAfterHighConcFirst: "similarToFirst",
      repeatedInjection: "everyTime",
    },
    step3Answers: {
      systemSuitabilityPassed: "failed",
    },
  };

  const result = diagnoseHplcIssueV2(input);

  await t.test("Compliance banner is present", () => {
    assert.ok(result.complianceBanner !== null);
  });

  await t.test("Banner contains stop-reporting message", () => {
    assert.ok(result.complianceBanner.message.includes("暂停样品结果报告"));
  });

  await t.test("Risk level is high", () => {
    assert.equal(result.riskLevel, "高");
  });

  await t.test("Risk reasons include SST failed", () => {
    assert.ok(result.riskReasons.some((r) => r.includes("未通过")));
  });
});

test("Guardrail 6: modified inputs → stale result", async (t) => {
  // Verify that different inputs produce meaningfully different results.
  // The UI isResultDirty flag is tested via app state; this tests engine-level differentiation.

  const input1 = {
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: {
      peakLocations: ["Blank"],
      hasFixedRT: "yes",
      firstBlankAppears: "appearObvious",
      blankTrend: "stable",
      blankAfterHighConcFirst: "similarToFirst",
      repeatedInjection: "everyTime",
    },
    step3Answers: {
      systemSuitabilityPassed: "passed",
      injectorRecentlyServiced: "no",
    },
  };

  const result1 = diagnoseHplcIssueV2(input1);

  // Modify: change injectorRecentlyServiced to yes
  const input2 = {
    ...input1,
    step3Answers: { ...input1.step3Answers, injectorRecentlyServiced: "yes" },
  };
  const result2 = diagnoseHplcIssueV2(input2);

  await t.test("Different inputs produce detectably different results", () => {
    // When injectorRecentlyServiced changes from no to yes, carryover gets boost
    // Verify at minimum that results have valid structure after modification
    assert.ok(result1.topDirections.length > 0);
    assert.ok(result2.topDirections.length > 0);
    // Verify the results are different object references (fresh generation)
    assert.notEqual(result1, result2, "Results should be distinct objects");
    assert.notDeepEqual(
      result1.topDirections.map((d) => d.title),
      result2.topDirections.map((d) => d.title),
      "Top direction titles should differ when input changes"
    );
  });

  await t.test("Confirm generates fresh result every time", () => {
    // Each call to diagnoseHplcIssueV2 returns a fresh object
    assert.notEqual(result1, result2, "Results should be different object references");
    assert.ok(result1.topDirections.length > 0);
    assert.ok(result2.topDirections.length > 0);
  });
});



// =============================================================================
// Cross-cutting validation
// =============================================================================

test("Cross-cutting: every scenario produces valid DiagnosticResult structure", async (t) => {
  const scenarios = [
    {
      name: "A-mobile",
      step2: {
        peakLocations: ["Blank"], hasFixedRT: "yes", firstBlankAppears: "appearObvious",
        blankTrend: "stable", blankAfterHighConcFirst: "similarToFirst", repeatedInjection: "everyTime",
      },
      step3: { systemSuitabilityPassed: "failed" },
    },
    {
      name: "B-carryover",
      step2: {
        peakLocations: ["Blank"], hasFixedRT: "yes", firstBlankAppears: "notAppear",
        blankAfterHighConcFirst: "higherThanFirst", blankTrend: "declining",
        relatedToPrevHighConc: "blankElevated", repeatedInjection: "occasionally",
      },
      step3: { systemSuitabilityPassed: "passed" },
    },
    {
      name: "C-sample",
      step2: {
        peakLocations: ["Sample"], hasFixedRT: "no", firstBlankAppears: "notAppear",
        sampleOccurrenceScope: "specificSampleOnly", variesWithConc: "positive",
        areaChangesWithTime: "increase", repeatedInjection: "everyTime",
      },
      step3: { systemSuitabilityPassed: "passed" },
    },
    {
      name: "D-insufficient",
      step2: {
        peakLocations: ["Blank"], hasFixedRT: "yes",
        firstBlankAppears: "notTested", blankAfterHighConcFirst: "notTested",
        blankTrend: "notTested", repeatedInjection: "everyTime",
      },
      step3: { systemSuitabilityPassed: "passed" },
    },
  ];

  for (const s of scenarios) {
    const result = diagnoseHplcIssueV2({
      primaryAnomaly: "unknown_impurity_peak",
      step2Answers: s.step2,
      step3Answers: s.step3,
    });

    await t.test(s.name + ": has inputSummary.primaryAnomalyLabel", () => {
      assert.ok(result.inputSummary.primaryAnomalyLabel);
    });
    await t.test(s.name + ": has riskLevel (低/中/高)", () => {
      assert.ok(["低", "中", "高"].includes(result.riskLevel));
    });
    await t.test(s.name + ": has riskReasons array", () => {
      assert.ok(Array.isArray(result.riskReasons));
      assert.ok(result.riskReasons.length > 0);
    });
    await t.test(s.name + ": topDirections has 1-3 entries", () => {
      assert.ok(result.topDirections.length >= 1);
      assert.ok(result.topDirections.length <= 3);
    });
    await t.test(s.name + ": each topDirection has required fields", () => {
      for (const d of result.topDirections) {
        assert.ok(d.priority);
        assert.ok(["较高", "中等", "较低"].includes(d.confidence), "Invalid confidence: " + d.confidence);
        assert.ok(d.title);
        assert.ok(Array.isArray(d.evidence));
        assert.ok(typeof d.rationale === "string");
        assert.ok(d.actions);
        assert.ok(d.resultJudgment);
        assert.ok(d.resultJudgment.ifResolved);
        assert.ok(d.resultJudgment.ifNotResolved);
      }
    });
    await t.test(s.name + ": disclaimer present", () => {
      assert.ok(result.disclaimer.includes("不替代 GMP"));
    });
  }
});
