import test from "node:test";
import assert from "node:assert/strict";
import { demoCaseA } from "../../src/demo/demoCases.js";
import { diagnoseHplcIssueV2 } from "../../src/engine/diagnoseHplcIssue.js";
import { classifyEvidenceSupport } from "../../src/ui/diagnosticDirections.js";

test("maps weighted evidence score boundaries to support levels", () => {
  assert.equal(classifyEvidenceSupport(59), "较低");
  assert.equal(classifyEvidenceSupport(60), "中等");
  assert.equal(classifyEvidenceSupport(79), "中等");
  assert.equal(classifyEvidenceSupport(80), "较高");
});

test("demo case keeps its ranking and shows distinct evidence support", () => {
  const result = diagnoseHplcIssueV2({
    primaryAnomaly: demoCaseA.primaryAnomaly,
    step2Answers: demoCaseA.step2Answers,
    step3Answers: demoCaseA.step3Answers
  });

  assert.deepEqual(
    result.topDirections.map(({ title }) => title),
    [
      "排查流动相、试剂与容器污染",
      "排查系统公共流路污染（脱气机、泵、混合器、公共管路）",
      "排查溶剂、稀释剂或试剂批次变化"
    ]
  );
  assert.deepEqual(
    result.topDirections.map(({ confidence }) => confidence),
    ["较高", "中等", "较低"]
  );
});
