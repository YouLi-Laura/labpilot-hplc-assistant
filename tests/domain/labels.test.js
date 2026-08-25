import test from "node:test";
import assert from "node:assert/strict";
import {
  anomalyLabels,
  scopeLabels,
  riskRank,
  formatBooleanStatus
} from "../../src/domain/hplcLabels.js";

test("defines labels for the six supported HPLC abnormalities", () => {
  assert.deepEqual(Object.keys(anomalyLabels).sort(), [
    "area_abnormal",
    "baseline_abnormal",
    "peak_tailing",
    "resolution_loss",
    "retention_time_drift",
    "unknown_impurity_peak"
  ]);
  assert.equal(anomalyLabels.retention_time_drift, "保留时间漂移");
  assert.equal(anomalyLabels.unknown_impurity_peak, "未知杂峰");
});

test("defines affected-scope labels and ordered risk ranks", () => {
  assert.equal(scopeLabels.blank_standard_sample, "Blank、标准和样品均受影响");
  assert.deepEqual(riskRank, { "低": 1, "中": 2, "高": 3 });
});

test("formats boolean or unknown status for input summaries", () => {
  assert.equal(formatBooleanStatus(true, "已通过", "未通过"), "已通过");
  assert.equal(formatBooleanStatus(false, "已通过", "未通过"), "未通过");
  assert.equal(formatBooleanStatus("unknown", "已通过", "未通过"), "未确认");
});
