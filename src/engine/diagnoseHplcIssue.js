import {
  DEFAULT_DISCLAIMER,
  complianceModifiers,
  globalStopConditions,
  hplcDiagnosticRules
} from "../rules/hplcDiagnosticRules.js";
import {
  anomalyLabels,
  formatBooleanStatus,
  riskRank,
  scopeLabels
} from "../domain/hplcLabels.js";
import { generateDirections } from "../ui/diagnosticDirections.js?v=evidence-support-20260808-r3";
import {
  step2Questions,
  step3Questions,
  step2LabelMap,
  step3LabelMap
} from "../ui/stepQuestions.js";

// =============================================================================
// Legacy interface — kept for backward compat with existing tests
// =============================================================================

const defaultInput = Object.freeze({
  anomalyTypes: [],
  systemSuitabilityPassed: "unknown",
  blankHasUnknownPeak: false,
  mobilePhaseRemadeRecently: false,
  retentionTimeChangedAfterRemake: false,
  resolutionChangedAfterRemake: false,
  affectedScope: "unknown",
  affectedPeaks: [],
  observedSymptoms: [],
  freeTextNotes: ""
});

export function normalizeDiagnosticInput(input = {}) {
  return {
    ...defaultInput,
    ...input,
    anomalyTypes: Array.isArray(input.anomalyTypes) ? input.anomalyTypes : [],
    affectedPeaks: Array.isArray(input.affectedPeaks) ? input.affectedPeaks : [],
    observedSymptoms: Array.isArray(input.observedSymptoms) ? input.observedSymptoms : []
  };
}

export function conditionMatches(input, condition) {
  const actualValue = input[condition.field];
  if (condition.operator === "equals") return actualValue === condition.value;
  if (condition.operator === "notEquals") return actualValue !== condition.value;
  if (condition.operator === "includes") {
    return Array.isArray(actualValue) && actualValue.includes(condition.value);
  }
  return false;
}

export function conditionsMatch(input, conditions = []) {
  return conditions.every((condition) => conditionMatches(input, condition));
}

function riskMax(left, right) {
  return riskRank[right] > riskRank[left] ? right : left;
}

function buildInputSummary(input) {
  return {
    anomalyLabels: input.anomalyTypes.map((type) => anomalyLabels[type] ?? type),
    systemSuitabilityStatus: formatBooleanStatus(input.systemSuitabilityPassed, "已通过", "未通过"),
    blankStatus: input.blankHasUnknownPeak ? "Blank 出现未知峰" : "Blank 未见未知峰",
    mobilePhaseContext: input.mobilePhaseRemadeRecently
      ? "近期重新配制流动相"
      : "未记录近期重新配制流动相",
    retentionTimeChangedAfterRemake: formatBooleanStatus(
      input.retentionTimeChangedAfterRemake,
      "已变化",
      "未变化"
    ),
    resolutionChangedAfterRemake: formatBooleanStatus(
      input.resolutionChangedAfterRemake,
      "已变化",
      "未变化"
    ),
    freeTextNotes: input.freeTextNotes,
    affectedScope: scopeLabels[input.affectedScope] ?? scopeLabels.unknown,
    affectedPeaks: input.affectedPeaks,
    observedSymptoms: input.observedSymptoms
  };
}

function uniqueById(items) {
  const seen = new Map();
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.set(item.id, item);
    }
  }
  return [...seen.values()];
}

function modifierTargetsItem(modifier, itemId, targetKey) {
  const targets = modifier[targetKey];
  return !Array.isArray(targets) || targets.includes(itemId);
}

function scoreItem(input, item, baseScore, modifiers, targetKey) {
  return modifiers.reduce((score, modifier) => {
    if (!conditionsMatch(input, modifier.when)) return score;
    if (!modifierTargetsItem(modifier, item.id, targetKey)) return score;
    return score + modifier.priorityDelta;
  }, baseScore);
}

function getActiveModifiers(input, selectedRules) {
  return [
    ...complianceModifiers,
    ...selectedRules.flatMap((rule) => rule.priorityModifiers)
  ].filter((modifier) => conditionsMatch(input, modifier.when));
}

function getRiskLevel(selectedRules, activeModifiers) {
  const baseRisk = selectedRules.reduce(
    (current, rule) => riskMax(current, rule.baseRiskLevel),
    "低"
  );
  return activeModifiers.reduce((current, modifier) => {
    return modifier.riskAdjustment ? riskMax(current, modifier.riskAdjustment) : current;
  }, baseRisk);
}

// Legacy diagnose function
export function diagnoseHplcIssue(rawInput = {}) {
  const input = normalizeDiagnosticInput(rawInput);
  const selectedRules = hplcDiagnosticRules.filter((rule) => input.anomalyTypes.includes(rule.id));
  const activeModifiers = getActiveModifiers(input, selectedRules);

  const causes = uniqueById(selectedRules.flatMap((rule) => rule.causeCandidates))
    .map((cause) => ({
      ...cause,
      score: scoreItem(input, cause, cause.basePriority, activeModifiers, "targetCauseIds")
    }))
    .sort((a, b) => b.score - a.score || b.basePriority - a.basePriority)
    .map((cause) => cause.text);

  const steps = uniqueById(selectedRules.flatMap((rule) => rule.stepTemplates))
    .filter((step) => conditionsMatch(input, step.requiredWhen ?? []))
    .map((step) => ({
      ...step,
      score: scoreItem(input, step, 100 - step.baseOrder, activeModifiers, "targetStepIds")
    }))
    .sort((a, b) => b.score - a.score || a.baseOrder - b.baseOrder)
    .map((step, index) => ({
      id: step.id,
      order: index + 1,
      action: step.action,
      rationale: step.rationale
    }));

  const stopConditions = uniqueById([
    ...globalStopConditions,
    ...selectedRules.flatMap((rule) => rule.stopConditions)
  ])
    .filter((condition) => conditionsMatch(input, condition.when ?? []))
    .map((condition) => condition.text);

  return {
    inputSummary: buildInputSummary(input),
    riskLevel: getRiskLevel(selectedRules, activeModifiers),
    probableCauses: causes,
    troubleshootingSteps: steps,
    stopConditions,
    disclaimer: DEFAULT_DISCLAIMER
  };
}

// =============================================================================
// V2 interface — 四步诊断流程
// =============================================================================

// 异常类型到中文标签的映射
export const primaryAnomalyLabels = {
  unknown_impurity_peak: '未知杂峰',
  retention_time_drift: '保留时间漂移',
  resolution_loss: '分离度下降',
  peak_tailing: '峰形异常',
  baseline_abnormal: '基线异常',
  area_abnormal: '峰面积或定量异常'
};

// 生成 Step 2 摘要（每道问题的答案转中文）
function buildStep2Summary(primaryAnomaly, step2Answers) {
  const questions = step2Questions[primaryAnomaly];
  if (!questions) return {};

  const summary = {};
  for (const q of questions) {
    const value = step2Answers[q.key];
    if (value === undefined || value === null) continue;

    const labelMap = step2LabelMap[q.key];
    if (q.type === 'multiselect' && Array.isArray(value)) {
      if (labelMap) {
        summary[q.key] = { question: q.label, answer: value.map((v) => labelMap[v] || v).join('、') };
      } else {
        summary[q.key] = { question: q.label, answer: value.join('、') };
      }
    } else {
      // radio — value is a string
      summary[q.key] = {
        question: q.label,
        answer: labelMap ? (labelMap[value] || value) : value
      };
    }
  }
  return summary;
}

// 生成 Step 3 摘要
function buildStep3Summary(step3Answers) {
  const summary = {};
  for (const q of step3Questions) {
    const value = step3Answers[q.key];
    if (value === undefined || value === null) continue;

    const labelMap = step3LabelMap[q.key];
    summary[q.key] = {
      question: q.label,
      answer: labelMap ? (labelMap[value] || value) : value
    };
  }
  return summary;
}

// 计算风险等级
function computeRiskLevelV2(complianceBanner) {
  if (complianceBanner && complianceBanner.level === 'stop') {
    return '高';
  }
  return '中';
}

/**
 * 新版诊断接口
 * @param {Object} params
 * @param {string} params.primaryAnomaly - 主要异常 key
 * @param {Object} params.step2Answers - Step 2 答案
 * @param {Object} params.step3Answers - Step 3 答案
 * @returns {Object} 诊断结果
 */
export function diagnoseHplcIssueV2({ primaryAnomaly, step2Answers, step3Answers }) {
  const answers = {
    step2: step2Answers || {},
    step3: step3Answers || {}
  };

  const { topDirections, otherDirections, complianceBanner, riskReasons } = generateDirections(primaryAnomaly, answers);

  const riskLevel = computeRiskLevelV2(complianceBanner);

  const inputSummary = {
    primaryAnomalyLabel: primaryAnomalyLabels[primaryAnomaly] || primaryAnomaly,
    step2Summary: buildStep2Summary(primaryAnomaly, step2Answers),
    step3Summary: buildStep3Summary(step3Answers)
  };

  return {
    inputSummary,
    riskLevel,
    riskReasons,
    complianceBanner,
    topDirections,
    otherDirections,
    disclaimer: DEFAULT_DISCLAIMER
  };
}
