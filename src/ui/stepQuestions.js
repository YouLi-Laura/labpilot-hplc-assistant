// Step 2 动态问题定义 —— 按异常类型 key 组织

export const step2Questions = {
  unknown_impurity_peak: [
    {
      key: 'peakLocations',
      label: '未知峰出现在哪些位置？',
      type: 'multiselect',
      options: [
        { value: 'Blank', label: 'Blank' },
        { value: 'Standard', label: 'Standard' },
        { value: 'Sample', label: 'Sample' },
        { value: 'SST', label: 'System suitability' },
        { value: 'RepeatInjection', label: '重复进样' },
        { value: 'Unknown', label: '不确定' }
      ]
    },
    {
      key: 'hasFixedRT',
      label: '是否固定保留时间出现？',
      type: 'radio',
      options: [
        { value: 'yes', label: '是' },
        { value: 'no', label: '否' },
        { value: 'unknown', label: '不确定' }
      ]
    },
    {
      key: 'repeatInjectionAreaStable',
      label: '同一溶液在相同条件下重复进样时，未知峰面积是否相对稳定？',
      type: 'radio',
      options: [
        { value: 'yes', label: '是' },
        { value: 'no', label: '否' },
        { value: 'unknown', label: '不确定' }
      ]
    },
    {
      key: 'variesWithConc',
      label: '峰面积是否随样品浓度变化？',
      type: 'radio',
      options: [
        { value: 'positive', label: '是（正相关）' },
        { value: 'no', label: '否' },
        { value: 'unknown', label: '不确定' }
      ]
    },
    {
      key: 'relatedToPrevHighConc',
      label: '你观察到未知峰与前一针高浓度样品存在什么关系？',
      type: 'radio',
      options: [
        { value: 'blankElevated', label: '高浓度样品后 Blank 中明显升高' },
        { value: 'sampleElevated', label: '后续样品中出现或未知峰升高' },
        { value: 'suspicionOnly', label: '仅主观怀疑，尚未通过 Blank 验证' },
        { value: 'noRelation', label: '无明显关系' },
        { value: 'unknown', label: '不确定' }
      ]
    },
    {
      key: 'firstBlankAppears',
      label: '首针 Blank 中未知峰情况？',
      type: 'radio',
      options: [
        { value: 'notAppear', label: '未出现' },
        { value: 'appearSmall', label: '出现且面积较小' },
        { value: 'appearObvious', label: '出现且面积明显' },
        { value: 'notTested', label: '未检测 / 不确定' }
      ]
    },
    {
      key: 'blankAfterHighConcFirst',
      label: '高浓度样品后的第一针 Blank',
      type: 'radio',
      options: [
        { value: 'notAppear', label: '未出现' },
        { value: 'similarToFirst', label: '与首针 Blank 接近' },
        { value: 'higherThanFirst', label: '明显高于首针 Blank' },
        { value: 'notTested', label: '未检测 / 不确定' }
      ]
    },
    {
      key: 'blankTrend',
      label: '连续多针 Blank 的变化趋势',
      type: 'radio',
      options: [
        { value: 'declining', label: '逐针下降' },
        { value: 'stable', label: '稳定' },
        { value: 'irregular', label: '不规则波动' },
        { value: 'notTested', label: '未检测 / 不确定' }
      ]
    },
    {
      key: 'repeatedInjection',
      label: '对同一份溶液重复进样时，未知峰是否重复出现？',
      type: 'radio',
      options: [
        { value: 'everyTime', label: '每次均出现' },
        { value: 'occasionally', label: '偶尔出现' },
        { value: 'notReproduced', label: '不复现' },
        { value: 'notTested', label: '未检测' }
      ]
    },
    {
      key: 'sampleOccurrenceScope',
      label: '未知峰在样品中的出现范围？',
      type: 'radio',
      condition: (step2Answers) => (step2Answers.peakLocations || []).includes('Sample'),
      options: [
        { value: 'allSamples', label: '所有样品均出现' },
        { value: 'multipleSamples', label: '多个样品出现' },
        { value: 'specificSampleOnly', label: '仅特定样品出现', disabledWhen: (step2Answers) => {
          const locs = step2Answers.peakLocations || [];
          return locs.includes('Blank') || locs.includes('Standard');
        }},
        { value: 'unknown', label: '不确定' }
      ]
    },
    {
      key: 'areaChangesWithTime',
      label: '样品放置一定时间后，峰面积是否明显变化？',
      type: 'radio',
      options: [
        { value: 'increase', label: '是（峰面积增大）' },
        { value: 'decrease', label: '是（峰面积减小）' },
        { value: 'noChange', label: '无明显变化' },
        { value: 'notTested', label: '未测试' }
      ]
    }
  ]
};

export const step3Questions = [
  { key: 'mobilePhaseRemadeRecently', label: '是否近期重新配制流动相？', type: 'radio', options: [{ value: 'yes', label: '是' }, { value: 'no', label: '否' }] },
  { key: 'columnRecentlyReplaced', label: '是否近期更换色谱柱或保护柱？', type: 'radio', options: [{ value: 'yes', label: '是' }, { value: 'no', label: '否' }] },
  { key: 'solventOrReagentBatchChanged', label: '是否近期更换溶剂、试剂批次或供应商？', type: 'radio', options: [{ value: 'yes', label: '是' }, { value: 'no', label: '否' }] },
  { key: 'injectorRecentlyServiced', label: '是否近期维护或更换过进样器部件（针、针座、定量环）？', type: 'radio', options: [{ value: 'yes', label: '是' }, { value: 'no', label: '否' }] },
  { key: 'systemPressureAbnormal', label: '系统压力是否持续异常（偏高、偏低或波动）？', type: 'radio', options: [{ value: 'yes', label: '是' }, { value: 'no', label: '否' }, { value: 'unknown', label: '不确定' }] },
  { key: 'systemSuitabilityPassed', label: 'System suitability 测试是否通过？', type: 'radio', options: [{ value: 'passed', label: '已通过' }, { value: 'failed', label: '未通过' }, { value: 'unknown', label: '未进行' }] }
];

export const step2LabelMap = {
  peakLocations: { Blank: 'Blank', Standard: 'Standard', Sample: 'Sample', SST: 'System suitability', RepeatInjection: '重复进样', Unknown: '不确定' },
  hasFixedRT: { yes: '是', no: '否', unknown: '不确定' },
  repeatInjectionAreaStable: { yes: '是', no: '否', unknown: '不确定' },
  variesWithConc: { positive: '是（正相关）', no: '否', unknown: '不确定' },
  relatedToPrevHighConc: { blankElevated: '高浓度样品后 Blank 中明显升高', sampleElevated: '后续样品中出现或升高', suspicionOnly: '仅主观怀疑，尚未通过 Blank 验证', noRelation: '无明显关系', unknown: '不确定' },
  firstBlankAppears: { notAppear: '未出现', appearSmall: '出现且面积较小', appearObvious: '出现且面积明显', notTested: '未检测 / 不确定' },
  blankAfterHighConcFirst: { notAppear: '未出现', similarToFirst: '与首针 Blank 接近', higherThanFirst: '明显高于首针 Blank', notTested: '未检测 / 不确定' },
  blankTrend: { declining: '逐针下降', stable: '稳定', irregular: '不规则波动', notTested: '未检测 / 不确定' },
  repeatedInjection: { everyTime: '每次均出现', occasionally: '偶尔出现', notReproduced: '不复现', notTested: '未检测' },
  sampleOccurrenceScope: { allSamples: '所有样品均出现', multipleSamples: '多个样品出现', specificSampleOnly: '仅特定样品出现', unknown: '不确定' },
  areaChangesWithTime: { increase: '是（峰面积增大）', decrease: '是（峰面积减小）', noChange: '无明显变化', notTested: '未测试' }
};

export const step3LabelMap = {
  mobilePhaseRemadeRecently: { yes: '是', no: '否' },
  columnRecentlyReplaced: { yes: '是', no: '否' },
  solventOrReagentBatchChanged: { yes: '是', no: '否' },
  injectorRecentlyServiced: { yes: '是', no: '否' },
  systemPressureAbnormal: { yes: '是', no: '否', unknown: '不确定' },
  systemSuitabilityPassed: { passed: '已通过', failed: '未通过', unknown: '未进行' }
};

// =============================================================================
// Auto-sync: If blank fields indicate presence, auto-add Blank to peakLocations
// =============================================================================
export function getAutoSyncBlankFields(step2Answers) {
  const locs = step2Answers.peakLocations || [];
  if (locs.includes('Blank')) return null; // already has it

  const fb = step2Answers.firstBlankAppears;
  const ahc = step2Answers.blankAfterHighConcFirst;
  const needsBlank =
    fb === 'appearSmall' || fb === 'appearObvious' ||
    ahc === 'similarToFirst' || ahc === 'higherThanFirst';

  if (needsBlank) {
    return {
      field: 'peakLocations',
      newValue: [...locs, 'Blank'],
      notice: '已根据 Blank 相关观察自动补充出现位置：Blank。'
    };
  }
  return null;
}

// =============================================================================
// 一致性校验
// =============================================================================
export function validateStep2Answers(answers) {
  const conflicts = [];
  const locs = answers.peakLocations || [];
  const explicitLocations = ['Blank', 'Standard', 'Sample', 'SST', 'RepeatInjection'];

  // 1. Unknown cannot be combined with an explicit peak location
  if (locs.includes('Unknown') && explicitLocations.some((location) => locs.includes(location))) {
    conflicts.push({
      fields: ['peakLocations'],
      message: '未知峰出现位置已选择明确位置，但同时选择了‘不确定’，两者冲突。请保留明确位置或仅选择‘不确定’。'
    });
  }

  // 2. Blank peak + only specific sample
  if (locs.includes('Blank') && answers.sampleOccurrenceScope === 'specificSampleOnly') {
    conflicts.push({ fields: ['peakLocations', 'sampleOccurrenceScope'], message: '未知峰出现在 Blank 中，但同时标记为"仅特定样品出现"，两者矛盾。' });
  }
  if (locs.includes('Standard') && answers.sampleOccurrenceScope === 'specificSampleOnly') {
    conflicts.push({ fields: ['peakLocations', 'sampleOccurrenceScope'], message: '未知峰出现在 Standard 中，但同时标记为"仅特定样品出现"，两者矛盾。' });
  }

  // 3. firstBlankAppears says present but Blank not in peakLocations (should be caught by auto-sync, but double-check)
  if ((answers.firstBlankAppears === 'appearSmall' || answers.firstBlankAppears === 'appearObvious') && !locs.includes('Blank')) {
    conflicts.push({ fields: ['firstBlankAppears', 'peakLocations'], message: '首针 Blank 明确出现未知峰（' + (answers.firstBlankAppears === 'appearObvious' ? '出现且面积明显' : '出现且面积较小') + '），但"出现位置"中未包含 Blank，两者矛盾。请返回第 2 步修正，或在出现位置中勾选 Blank。' });
  }

  // 4. blankAfterHighConcFirst says similarToFirst/higherThanFirst but Blank not in peakLocations
  if ((answers.blankAfterHighConcFirst === 'similarToFirst' || answers.blankAfterHighConcFirst === 'higherThanFirst') && !locs.includes('Blank')) {
    conflicts.push({ fields: ['blankAfterHighConcFirst', 'peakLocations'], message: '高浓度样品后的 Blank 存在明确观察结果，但"出现位置"中未包含 Blank，两者矛盾。' });
  }

  // 5. peakLocations has Sample but sampleOccurrenceScope is not set
  if (locs.includes('Sample') && !answers.sampleOccurrenceScope) {
    conflicts.push({ fields: ['sampleOccurrenceScope', 'peakLocations'], message: '未知峰出现在 Sample 中，但未填写"样品中出现范围"，请补充。' });
  }

  return conflicts;
}

// =============================================================================
// Auto-correction notices
// =============================================================================
export function getAutoCorrectionNotice(step2Answers) {
  const locs = step2Answers.peakLocations || [];
  const notices = [];

  if ((locs.includes('Blank') || locs.includes('Standard')) && step2Answers.sampleOccurrenceScope === 'specificSampleOnly') {
    notices.push('未知峰同时出现在 Blank/Standard 中，已自动将"仅特定样品出现"调整为"所有样品均出现"。');
  }

  return notices;
}
