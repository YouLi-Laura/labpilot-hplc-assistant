export const anomalyLabels = Object.freeze({
  retention_time_drift: "保留时间漂移",
  resolution_loss: "分离度下降",
  peak_tailing: "峰拖尾",
  area_abnormal: "峰面积异常",
  baseline_abnormal: "基线异常",
  unknown_impurity_peak: "未知杂峰"
});

export const scopeLabels = Object.freeze({
  sample_only: "仅样品受影响",
  blank_only: "仅 Blank 受影响",
  standard_only: "仅标准受影响",
  blank_standard_sample: "Blank、标准和样品均受影响",
  all: "所有进样均受影响",
  unknown: "影响范围未确认"
});

export const riskRank = Object.freeze({
  "低": 1,
  "中": 2,
  "高": 3
});

export function formatBooleanStatus(value, trueText, falseText) {
  if (value === true) return trueText;
  if (value === false) return falseText;
  return "未确认";
}
