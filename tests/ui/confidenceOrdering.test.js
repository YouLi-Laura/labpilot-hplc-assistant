import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseHplcIssueV2 } from "../../src/engine/diagnoseHplcIssue.js";

const confidenceRank = Object.freeze({ "较低": 1, "中等": 2, "较高": 3 });

const scenarios = [
  {
    name: "外部污染路径",
    step2Answers: {
      peakLocations: ["Blank"],
      hasFixedRT: "yes",
      firstBlankAppears: "appearObvious",
      blankTrend: "stable",
      blankAfterHighConcFirst: "similarToFirst",
      repeatedInjection: "everyTime",
    },
    step3Answers: { systemSuitabilityPassed: "failed" },
  },
  {
    name: "证据不足路径",
    step2Answers: {
      peakLocations: ["Blank"],
      hasFixedRT: "yes",
      firstBlankAppears: "notTested",
      blankAfterHighConcFirst: "notTested",
      blankTrend: "notTested",
      repeatedInjection: "everyTime",
    },
    step3Answers: { systemSuitabilityPassed: "passed" },
  },
];

for (const scenario of scenarios) {
  test(`${scenario.name}: later priorities never display stronger evidence support`, () => {
    const result = diagnoseHplcIssueV2({
      primaryAnomaly: "unknown_impurity_peak",
      step2Answers: scenario.step2Answers,
      step3Answers: scenario.step3Answers,
    });

    for (let index = 1; index < result.topDirections.length; index += 1) {
      const previous = result.topDirections[index - 1];
      const current = result.topDirections[index];
      assert.ok(
        confidenceRank[current.confidence] <= confidenceRank[previous.confidence],
        `优先 ${current.priority}（${current.confidence}）不应高于优先 ${previous.priority}（${previous.confidence}）`,
      );
    }
  });
}
