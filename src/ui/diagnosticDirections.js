// 排查方向模板库

// =============================================================================
// 补充证据方向
// =============================================================================
const evidenceGapDirection = {
  id: 'collect_blank_sequence_evidence',
  category: 'meta',
  title: '补充连续 Blank 和序列证据',
  summaryLine: '当前关键序列信息不足，建议先采集首针 Blank 和多针 Blank 数据。',
  isMetaDirection: true,
  rationale: function(answers, evidence) {
    const gaps = [];
    if (answers.step2.firstBlankAppears === 'notTested') gaps.push('首针 Blank 信息');
    if (answers.step2.blankTrend === 'notTested') gaps.push('连续 Blank 变化趋势');
    if (answers.step2.blankAfterHighConcFirst === 'notTested') gaps.push('高浓度样品后的 Blank 数据');
    if (gaps.length === 0) return null;
    return `当前输入中以下关键序列信息缺失：${gaps.join('、')}。建议先采集以下数据以区分污染模式。`;
  },
  actions: `1. 使用新鲜流动相进样首针 Blank，记录未知峰保留时间和峰面积。
2. 连续进样 2–3 针 Blank，观察峰面积变化趋势。
3. 在最高浓度样品后插入一针 Blank，观察是否出现未知峰或面积明显升高。
4. 比较未知峰在不同条件下的保留时间和面积特征。`,
  resultJudgment: {
    ifResolved: '收集到充分序列数据后，重新使用本工具输入完整信息。',
    ifNotResolved: '如无法获取完整序列信息，建议基于现有有限证据排查。'
  },
  nextSteps: '获得完整序列数据后，点击侧边栏"开始诊断"重新输入。',
  stopCondition: null
};

// =============================================================================
// 未知杂峰 —— 7 个排查方向（含 hasFixedRT=no 时的峰身份确认方向）
// =============================================================================
const unknownImpurityPeakDirections = [
  // ── 0: 确认是否为同一峰（仅 hasFixedRT=no 时产生）──
  {
    id: 'confirm_peak_identity',
    category: 'identity',
    title: '确认不同进样中的未知峰是否为同一峰',
    summaryLine: '保留时间不固定，需先确认不同针中的未知峰是否属于同一物质。',
    minimumScore: 0,
    isIdentityDirection: true,
    matchConditions: [
      { key: 'hasFixedRT', field: 'step2.hasFixedRT', op: 'equals', value: 'no', weight: 20 }
    ],
    evidenceLabels: {
      'hasFixedRT:no': '未知峰保留时间不固定'
    },
    buildRationale: function(answers, evidence) {
      return '保留时间不固定时，不能默认不同进样中的未知峰属于同一物质。可能存在多个不同的未知峰，或同一物质因方法条件变化而保留时间漂移。在确认峰身份之前，所有来源判断的可靠性降低。';
    },
    actions: `1. 比较各针中未知峰的保留时间（RT）和相对保留时间（RRT）。
2. 比较峰形（对称性、峰宽）和检测器光谱特征（如 PDA 峰纯度或紫外光谱）。
3. 检查积分边界是否一致，排除积分参数差异。
4. 判断是否存在多个不同未知峰。
5. 必要时重新处理色谱图，统一积分参数。`,
    resultJudgment: {
      ifResolved: '确认各针为同一峰后，可进行来源排查。记录峰识别依据。',
      ifNotResolved: '若确认存在多个不同未知峰，需分别记录和排查，不可合并处理。'
    },
    nextSteps: '峰身份确认后，重新使用本工具分别诊断。',
    stopCondition: null
  },

  // ── 方向 1: 流动相与容器污染 ──
  {
    id: 'mobile_phase_contamination',
    category: 'mobile_phase',
    title: '排查流动相、试剂与容器污染',
    summaryLine: '未知峰出现在 Blank 中，应优先排查外部溶液与容器。',
    minimumScore: 8,
    matchConditions: [
      { key: 'peakLocations', field: 'step2.peakLocations', op: 'includes', value: 'Blank', weight: 15 },
      { key: 'peakLocations', field: 'step2.peakLocations', op: 'includes', value: 'Standard', weight: 8 },
      { key: 'firstBlankAppears', field: 'step2.firstBlankAppears', op: 'equals', value: 'appearObvious', weight: 12 },
      { key: 'firstBlankAppears', field: 'step2.firstBlankAppears', op: 'equals', value: 'appearSmall', weight: 7 },
      { key: 'repeatedInjection', field: 'step2.repeatedInjection', op: 'equals', value: 'everyTime', weight: 8 },
      { key: 'hasFixedRT', field: 'step2.hasFixedRT', op: 'equals', value: 'yes', weight: 5 },
      { key: 'blankTrend', field: 'step2.blankTrend', op: 'equals', value: 'stable', weight: 8 },
      { key: 'mobilePhaseRemadeRecently', field: 'step3.mobilePhaseRemadeRecently', op: 'equals', value: 'yes', weight: 10 },
      { key: 'solventOrReagentBatchChanged', field: 'step3.solventOrReagentBatchChanged', op: 'equals', value: 'yes', weight: 8 }
    ],
    evidenceLabels: {
      'peakLocations:Blank': '未知峰出现在 Blank 中',
      'peakLocations:Standard': '未知峰出现在 Standard 中',
      'firstBlankAppears:appearObvious': '首针 Blank 出现且面积明显',
      'firstBlankAppears:appearSmall': '首针 Blank 出现且面积较小',
      'repeatedInjection:everyTime': '每次重复进样均出现',
      'hasFixedRT:yes': '未知峰保留时间固定',
      'blankTrend:stable': '连续 Blank 中峰面积稳定',
      'mobilePhaseRemadeRecently:yes': '近期重新配制了流动相',
      'solventOrReagentBatchChanged:yes': '近期更换了溶剂或试剂批次'
    },
    buildRationale: function(answers, evidence) {
      const hasBlankEvidence = evidence.some(e => e.field === 'peakLocations' && e.value.includes('Blank'));
      const hasStandard = evidence.some(e => e.field === 'peakLocations' && e.value.includes('Standard'));
      const firstBlankObvious = evidence.some(e => e.field === 'firstBlankAppears' && e.value === 'appearObvious');
      const blankTrendStable = evidence.some(e => e.field === 'blankTrend' && e.value === 'stable');
      const blankTrendNt = answers.step2.blankTrend === 'notTested';
      const mobileRemade = evidence.some(e => e.field === 'mobilePhaseRemadeRecently');
      const solventChanged = evidence.some(e => e.field === 'solventOrReagentBatchChanged');
      const rtNotFixed = answers.step2.hasFixedRT === 'no';

      let text = '未知峰出现在 Blank 中';
      if (hasStandard) text += '和 Standard 中';
      text += '，提示该物质存在于色谱系统的共用部分。';

      if (firstBlankObvious) {
        text += '首针 Blank 即明显出现，提示污染来源更可能是外部引入的溶液或容器。';
      }
      if (blankTrendStable) {
        text += '连续 Blank 峰面积稳定进一步支持持续污染源。';
      } else if (blankTrendNt) {
        text += '连续 Blank 趋势尚未检测，尚不能判断是持续污染还是单次事件。';
      }
      if (mobileRemade) text += '近期重新配制流动相是该方向需要优先考虑的因素。';
      if (solventChanged) text += '近期更换溶剂或试剂批次也需要纳入排查范围。';
      if (rtNotFixed) text += '注意：保留时间不固定，峰身份尚未确认，可能影响来源判断的准确性。';

      return text;
    },
    actions: '依次排查并单独更换：新批次溶剂和清洁容器配制流动相、更换稀释剂和试剂批次、检查过滤材料和储液容器。每次仅改变一个变量。',
    resultJudgment: {
      ifResolved: '更换后未知峰消失，说明该变量与问题高度相关。需通过单变量复核进一步定位。',
      ifNotResolved: '逐一排除流动相、溶剂和容器后未知峰仍存在，转入系统公共流路或进样路径排查。'
    },
    nextSteps: '若外部溶液和容器已排除，进入系统公共流路污染排查。',
    stopCondition: null
  },

  // ── 方向 2: 溶剂与试剂批次变化 ──
  {
    id: 'solvent_reagent_contamination',
    category: 'solvent',
    title: '排查溶剂、稀释剂或试剂批次变化',
    summaryLine: '近期更换溶剂或试剂批次，需排查批次引入的杂质。',
    minimumScore: 10,
    requiredAny: [
      { key: 'solventOrReagentBatchChanged', field: 'step3.solventOrReagentBatchChanged', op: 'equals', value: 'yes' },
      { key: 'mobilePhaseRemadeRecently', field: 'step3.mobilePhaseRemadeRecently', op: 'equals', value: 'yes' }
    ],
    matchConditions: [
      { key: 'peakLocations', field: 'step2.peakLocations', op: 'includes', value: 'Blank', weight: 8 },
      { key: 'peakLocations', field: 'step2.peakLocations', op: 'includes', value: 'Standard', weight: 5 },
      { key: 'solventOrReagentBatchChanged', field: 'step3.solventOrReagentBatchChanged', op: 'equals', value: 'yes', weight: 15 },
      { key: 'mobilePhaseRemadeRecently', field: 'step3.mobilePhaseRemadeRecently', op: 'equals', value: 'yes', weight: 10 }
    ],
    evidenceLabels: {
      'peakLocations:Blank': '未知峰出现在 Blank 中',
      'peakLocations:Standard': '未知峰出现在 Standard 中',
      'solventOrReagentBatchChanged:yes': '近期更换了溶剂或试剂批次',
      'mobilePhaseRemadeRecently:yes': '近期重新配制了流动相'
    },
    buildRationale: function(answers, evidence) {
      const solventChanged = evidence.some(e => e.field === 'solventOrReagentBatchChanged');
      const mobileRemade = evidence.some(e => e.field === 'mobilePhaseRemadeRecently');
      const hasBlank = evidence.some(e => e.field === 'peakLocations' && e.value.includes('Blank'));
      let text = '';
      if (solventChanged) text += '近期更换溶剂或试剂批次是引入新杂质的常见原因。';
      if (mobileRemade) text += '近期重新配制流动相后出现未知峰，新配制的流动相或所用试剂需要排查。';
      if (hasBlank) text += '未知峰在 Blank 中出现，提示杂质来源于共用试剂。';
      return text || '溶剂或试剂批次变化需要纳入排查范围。';
    },
    actions: '使用旧批次溶剂或不同供应商的同规格溶剂、稀释剂和试剂，逐一替换并进样对比。每次仅改变一个变量。',
    resultJudgment: {
      ifResolved: '更换后未知峰消失，说明该变化与问题高度相关。需通过单变量复核定位。',
      ifNotResolved: '逐一替换后未知峰仍存在，批次变化为低概率因素。'
    },
    nextSteps: '若溶剂/试剂已排除，转入公共流路或进样路径排查。',
    stopCondition: null
  },

  // ── 方向 3: 系统公共流路污染 ──
  {
    id: 'system_path_contamination',
    category: 'system_contamination',
    title: '排查系统公共流路污染（脱气机、泵、混合器、公共管路）',
    summaryLine: '外部溶液和容器排查后仍未解决时，考虑公共流路中的持续污染。',
    minimumScore: 12,
    matchConditions: [
      { key: 'peakLocations', field: 'step2.peakLocations', op: 'includes', value: 'Blank', weight: 12 },
      { key: 'firstBlankAppears', field: 'step2.firstBlankAppears', op: 'equals', value: 'appearObvious', weight: 15 },
      { key: 'hasFixedRT', field: 'step2.hasFixedRT', op: 'equals', value: 'yes', weight: 8 },
      { key: 'repeatedInjection', field: 'step2.repeatedInjection', op: 'equals', value: 'everyTime', weight: 10 },
      { key: 'blankTrend', field: 'step2.blankTrend', op: 'equals', value: 'stable', weight: 10 },
      { key: 'blankAfterHighConcFirst', field: 'step2.blankAfterHighConcFirst', op: 'equals', value: 'similarToFirst', weight: 8 },
      { key: 'systemPressureAbnormal', field: 'step3.systemPressureAbnormal', op: 'equals', value: 'yes', weight: 5 }
    ],
    evidenceLabels: {
      'peakLocations:Blank': '未知峰出现在 Blank 中',
      'firstBlankAppears:appearObvious': '首针 Blank 即出现且面积明显',
      'hasFixedRT:yes': '未知峰保留时间固定',
      'repeatedInjection:everyTime': '每次重复进样均出现',
      'blankTrend:stable': '连续 Blank 中峰面积稳定',
      'blankAfterHighConcFirst:similarToFirst': '高浓度样品后第一针 Blank 与首针接近',
      'systemPressureAbnormal:yes': '系统压力异常'
    },
    buildRationale: function(answers, evidence) {
      const firstBlankObvious = evidence.some(e => e.field === 'firstBlankAppears' && e.value === 'appearObvious');
      const blankTrendStable = evidence.some(e => e.field === 'blankTrend' && e.value === 'stable');
      const blankTrendNt = answers.step2.blankTrend === 'notTested';
      const similarAfterHigh = evidence.some(e => e.field === 'blankAfterHighConcFirst' && e.value === 'similarToFirst');
      const pressureAbnormal = evidence.some(e => e.field === 'systemPressureAbnormal');

      let text = '';
      if (firstBlankObvious) {
        text += '首针 Blank 即出现，支持持续污染源的可能';
      }
      if (blankTrendNt) {
        text += '；但目前缺少连续 Blank 趋势数据，尚不能充分区分外部溶液污染与公共流路污染';
      } else if (blankTrendStable) {
        text += '；连续 Blank 峰面积稳定而非逐针下降，提示污染持续释放';
      }
      if (similarAfterHigh) text += '；高浓度样品后 Blank 与首针接近，不支持 carryover 模式';
      if (pressureAbnormal) text += '。系统压力异常可能提示公共流路问题';
      if (!text) text += '若外部溶液和容器已排除，应考虑公共流路污染。';
      return text + '。';
    },
    actions: '确认外部溶液和容器已排除后：检查在线脱气机腔体和管路；检查泵密封、单向阀和混合器；使用系统清洗方案冲洗公共流路。清洗后进样新鲜 Blank 对比。',
    resultJudgment: {
      ifResolved: '系统清洗后未知峰消失或明显减小，说明污染物存在于公共流路中。',
      ifNotResolved: '公共流路清洗后未知峰仍存在，转入进样系统排查。'
    },
    nextSteps: '若公共流路已排除，进入进样针/针座 Carryover 排查。',
    stopCondition: null
  },

  // ── 方向 4: 进样针/针座 Carryover / 进样系统残留 ──
  {
    id: 'injection_carryover',
    category: 'carryover',
    title: '排查进样系统残留或维护后异常',
    summaryLine: '进样路径残留或近期维护后引入的异常。',
    minimumScore: function(answers) {
      const ahcNT = answers.step2.blankAfterHighConcFirst === 'notTested';
      const trendNT = answers.step2.blankTrend === 'notTested';
      if (ahcNT && trendNT) return 15;
      return 6;
    },
    matchConditions: [
      { key: 'firstBlankAppears', field: 'step2.firstBlankAppears', op: 'equals', value: 'notAppear', weight: 10 },
      { key: 'firstBlankAppears', field: 'step2.firstBlankAppears', op: 'equals', value: 'appearSmall', weight: 5 },
      { key: 'firstBlankAppears', field: 'step2.firstBlankAppears', op: 'equals', value: 'appearObvious', weight: 2 },
      { key: 'blankAfterHighConcFirst', field: 'step2.blankAfterHighConcFirst', op: 'equals', value: 'higherThanFirst', weight: 15 },
      { key: 'blankTrend', field: 'step2.blankTrend', op: 'equals', value: 'declining', weight: 15 },
      { key: 'relatedToPrevHighConc', field: 'step2.relatedToPrevHighConc', op: 'equals', value: 'blankElevated', weight: 8 },
      { key: 'relatedToPrevHighConc', field: 'step2.relatedToPrevHighConc', op: 'equals', value: 'sampleElevated', weight: 5 },
      { key: 'relatedToPrevHighConc', field: 'step2.relatedToPrevHighConc', op: 'equals', value: 'suspicionOnly', weight: 2 },
      { key: 'injectorRecentlyServiced', field: 'step3.injectorRecentlyServiced', op: 'equals', value: 'yes', weight: 10 },
      { key: 'repeatedInjection', field: 'step2.repeatedInjection', op: 'equals', value: 'occasionally', weight: 4 }
    ],
    evidenceLabels: {
      'firstBlankAppears:notAppear': '首针 Blank 未出现未知峰',
      'firstBlankAppears:appearSmall': '首针 Blank 出现且面积较小',
      'firstBlankAppears:appearObvious': '首针 Blank 出现且面积明显',
      'blankAfterHighConcFirst:higherThanFirst': '高浓度样品后第一针 Blank 明显高于首针',
      'blankTrend:declining': '连续 Blank 中未知峰逐针下降',
      'relatedToPrevHighConc:blankElevated': '高浓度样品后 Blank 中未知峰明显升高',
      'relatedToPrevHighConc:sampleElevated': '后续样品中出现或未知峰升高',
      'relatedToPrevHighConc:suspicionOnly': '仅主观怀疑与前一针有关',
      'injectorRecentlyServiced:yes': '近期维护或更换过进样器部件',
      'repeatedInjection:occasionally': '未知峰偶尔出现'
    },
    buildRationale: function(answers, evidence) {
      const firstNotAppear = evidence.some(e => e.field === 'firstBlankAppears' && e.value === 'notAppear');
      const firstSmall = evidence.some(e => e.field === 'firstBlankAppears' && e.value === 'appearSmall');
      const firstObvious = evidence.some(e => e.field === 'firstBlankAppears' && e.value === 'appearObvious');
      const afterHighHigher = evidence.some(e => e.field === 'blankAfterHighConcFirst' && e.value === 'higherThanFirst');
      const trendDeclining = evidence.some(e => e.field === 'blankTrend' && e.value === 'declining');
      const trendNt = answers.step2.blankTrend === 'notTested';
      const relatedBlank = evidence.some(e => e.field === 'relatedToPrevHighConc' && e.value === 'blankElevated');
      const relatedSample = evidence.some(e => e.field === 'relatedToPrevHighConc' && e.value === 'sampleElevated');
      const relatedSuspicion = evidence.some(e => e.field === 'relatedToPrevHighConc' && e.value === 'suspicionOnly');
      const injectorServiced = evidence.some(e => e.field === 'injectorRecentlyServiced');

      let text = '';
      if (firstNotAppear) {
        text += '首针 Blank 未出现未知峰，说明序列开始时系统清洁。';
      } else if (firstSmall) {
        text += '首针 Blank 面积较小，提示序列开始时残留程度低。';
      } else if (firstObvious) {
        text += '首针 Blank 已存在未知峰';
        if (afterHighHigher) {
          text += '，但高浓度样品后的 Blank 明显升高';
        }
        if (relatedSample) {
          text += '，且后续样品中出现或升高';
        }
        text += '，支持进样残留或维护相关污染的可能';
        if (trendNt) {
          text += '。由于连续 Blank 趋势尚未检测，暂不能确认典型 Carryover 衰减模式';
        } else if (trendDeclining) {
          text += '。连续 Blank 中峰面积逐针下降，符合 Carryover 特征';
        }
        text += '。';
      }
      if (relatedBlank) text += '高浓度样品后 Blank 中未知峰明显升高，进一步指向进样路径残留。';
      if (relatedSuspicion) text += '用户怀疑与前一针有关但尚无 Blank 验证数据，该证据权重较低。';
      if (injectorServiced) text += '近期维护过进样器部件，残留或引入污染的风险升高。';
      if (!text) text += '若其他方向已排除，可考虑排查进样系统。需要补充首针 Blank 和高浓度后 Blank 数据以确认此方向。';
      return text;
    },
    actions: '在高浓度样品后插入多针 Blank 进样，记录每针未知峰面积变化趋势。检查并清洗进样针、针座和定量环。核实洗针液是否合适、洗针次数是否充分。',
    resultJudgment: {
      ifResolved: '优化进样系统清洗后未知峰下降或消失，说明进样路径存在残留。',
      ifNotResolved: '进样系统排查后未知峰无明显变化，转入洗针液或清洗程序。'
    },
    nextSteps: '若进样系统已排除，进入洗针液或清洗程序排查。',
    stopCondition: null
  },

  // ── 方向 5: 洗针液或清洗程序问题 ──
  {
    id: 'needle_wash_issue',
    category: 'needle_wash',
    title: '检查洗针液组成与清洗程序',
    summaryLine: '进样系统残留排查后仍未解决时，需检查洗针液本身。',
    minimumScore: 6,
    matchConditions: [
      { key: 'blankAfterHighConcFirst', field: 'step2.blankAfterHighConcFirst', op: 'equals', value: 'higherThanFirst', weight: 8 },
      { key: 'blankTrend', field: 'step2.blankTrend', op: 'equals', value: 'declining', weight: 6 },
      { key: 'relatedToPrevHighConc', field: 'step2.relatedToPrevHighConc', op: 'equals', value: 'blankElevated', weight: 6 },
      { key: 'relatedToPrevHighConc', field: 'step2.relatedToPrevHighConc', op: 'equals', value: 'sampleElevated', weight: 3 },
      { key: 'repeatedInjection', field: 'step2.repeatedInjection', op: 'equals', value: 'occasionally', weight: 4 },
      { key: 'solventOrReagentBatchChanged', field: 'step3.solventOrReagentBatchChanged', op: 'equals', value: 'yes', weight: 8 },
      { key: 'injectorRecentlyServiced', field: 'step3.injectorRecentlyServiced', op: 'equals', value: 'yes', weight: 6 }
    ],
    evidenceLabels: {
      'blankAfterHighConcFirst:higherThanFirst': '高浓度样品后第一针 Blank 明显高于首针',
      'blankTrend:declining': '连续 Blank 中未知峰逐针下降',
      'relatedToPrevHighConc:blankElevated': '高浓度样品后 Blank 中未知峰明显升高',
      'solventOrReagentBatchChanged:yes': '近期更换了溶剂或试剂批次',
      'injectorRecentlyServiced:yes': '近期维护或更换过进样器部件',
      'repeatedInjection:occasionally': '未知峰偶尔出现'
    },
    buildRationale: function(answers, evidence) {
      const solventChanged = evidence.some(e => e.field === 'solventOrReagentBatchChanged');
      const injectorServiced = evidence.some(e => e.field === 'injectorRecentlyServiced');
      let text = '洗针液组成不合适、被污染或清洗程序不充分，可能导致进样针清洗不彻底。';
      if (solventChanged) text += '近期更换溶剂批次后，若洗针液未同步评估，残留风险升高。';
      if (injectorServiced) text += '近期维护进样器后，洗针程序可能需要重新验证。';
      return text;
    },
    actions: '检查洗针液是否新鲜制备、是否与样品溶剂兼容。测试不同洗针液组成或增加洗针次数/体积。',
    resultJudgment: {
      ifResolved: '优化洗针程序后未知峰消失或面积下降，说明该变量与问题相关。',
      ifNotResolved: '洗针液优化后未知峰未改善，转入样品制备排查。'
    },
    nextSteps: '若洗针液已排除，进入样品制备、稳定性或特异性杂质排查。',
    stopCondition: null
  },

  // ── 方向 6: 样品制备、稳定性或特异性杂质 ──
  {
    id: 'sample_specific_impurity',
    category: 'sample_specific',
    title: '评估样品制备、稳定性与样品特异性杂质',
    summaryLine: '未知峰与样品本身相关时考虑此方向。',
    minimumScore: 8,
    matchConditions: [
      { key: 'peakLocations', field: 'step2.peakLocations', op: 'includes', value: 'Sample', weight: 10 },
      { key: 'sampleOccurrenceScope', field: 'step2.sampleOccurrenceScope', op: 'equals', value: 'specificSampleOnly', weight: 15 },
      { key: 'sampleOccurrenceScope', field: 'step2.sampleOccurrenceScope', op: 'equals', value: 'multipleSamples', weight: 5 },
      { key: 'variesWithConc', field: 'step2.variesWithConc', op: 'equals', value: 'positive', weight: 12 },
      { key: 'areaChangesWithTime', field: 'step2.areaChangesWithTime', op: 'equals', value: 'increase', weight: 12 },
      { key: 'areaChangesWithTime', field: 'step2.areaChangesWithTime', op: 'equals', value: 'decrease', weight: 10 },
      { key: 'firstBlankAppears', field: 'step2.firstBlankAppears', op: 'equals', value: 'notAppear', weight: 6 }
    ],
    evidenceLabels: {
      'peakLocations:Sample': '未知峰出现在 Sample 中',
      'sampleOccurrenceScope:specificSampleOnly': '未知峰仅在特定样品中出现',
      'sampleOccurrenceScope:multipleSamples': '多个样品出现',
      'variesWithConc:positive': '未知峰峰面积随样品浓度正相关变化',
      'areaChangesWithTime:increase': '样品放置后未知峰面积增大',
      'areaChangesWithTime:decrease': '样品放置后未知峰面积减小',
      'firstBlankAppears:notAppear': '首针 Blank 未出现未知峰'
    },
    buildRationale: function(answers, evidence) {
      const firstNotAppear = evidence.some(e => e.field === 'firstBlankAppears' && e.value === 'notAppear');
      const hasBlankInLocs = (answers.step2.peakLocations || []).includes('Blank');
      const specificOnly = evidence.some(e => e.field === 'sampleOccurrenceScope' && e.value === 'specificSampleOnly');
      const variesConc = evidence.some(e => e.field === 'variesWithConc');
      const changesTime = evidence.some(e => e.field === 'areaChangesWithTime');
      let text = '';
      if (hasBlankInLocs) {
        text += '未知峰同时出现在 Blank 和 Sample 中，样品特异性方向不是最高优先级；但如系统排查后仍有疑虑，可考虑样品制备中是否引入独立污染。';
      } else if (firstNotAppear) {
        text += '首针 Blank 未出现未知峰，提示该系统在序列开始时清洁。';
      }
      if (specificOnly) text += '未知峰仅在特定样品中出现。';
      if (variesConc) text += '峰面积随浓度正相关变化，提示该物质可能源于样品本身。';
      if (changesTime) text += '峰面积随放置时间变化，提示可能存在稳定性问题或降解产物。';
      if (!text) text += '若其他方向已排除，可考虑样品制备或基质效应。需要更多数据来确认。';
      return text;
    },
    actions: '复核样品制备流程（称量、稀释、溶解、超声、过滤）。测试不同稀释剂和 pH 条件。考察样品放置时间趋势。比较不同批次或平行制备的样品。',
    resultJudgment: {
      ifResolved: '调整制备条件后未知峰变化，根据方法验证状态评估。',
      ifNotResolved: '样品制备因素已排除，建议综合回顾全部路径。'
    },
    nextSteps: '若全部方向排查后问题仍未解决，建议升级给主管。',
    stopCondition: '异常影响关键定量峰或放行结论时，建议停止直接解释样品结果并升级评估。'
  }
];

// =============================================================================
// Carryover 组合额外加分
// =============================================================================
function computeCarryoverComboBonus(direction, answers) {
  if (direction.category !== 'carryover') return 0;
  const firstBlank = answers.step2.firstBlankAppears;
  const afterHighConc = answers.step2.blankAfterHighConcFirst;
  const trend = answers.step2.blankTrend;
  let bonus = 0;
  if (firstBlank === 'notAppear' && afterHighConc === 'higherThanFirst') bonus += 10;
  if (afterHighConc === 'higherThanFirst' && trend === 'declining') bonus += 10;
  return Math.min(bonus, 15);
}

// =============================================================================
// 全局优先级修正器
// =============================================================================
const globalPriorityModifiers = [
  {
    id: 'blank_has_unknown_peak',
    when: (answers) => (answers.step2.peakLocations || []).includes('Blank'),
    categoryWeights: { mobile_phase: 20, solvent: 15, system_contamination: 15, carryover: 0, needle_wash: 0, sample_specific: -10 }
  },
  {
    id: 'first_blank_obvious',
    when: (answers) => answers.step2.firstBlankAppears === 'appearObvious',
    categoryWeights: { mobile_phase: 15, system_contamination: 10, carryover: -5, solvent: 5, needle_wash: 0, sample_specific: -5, identity: 0 }
  },
  {
    id: 'has_fixed_rt_no',
    when: (answers) => answers.step2.hasFixedRT === 'no',
    categoryWeights: { identity: 25, mobile_phase: -5, system_contamination: -5, carryover: -3, solvent: -3, needle_wash: -2, sample_specific: -3 }
  },
  {
    id: 'only_sample_has_peak',
    when: (answers) => {
      const locs = answers.step2.peakLocations || [];
      return locs.includes('Sample') && !locs.includes('Blank') && !locs.includes('Standard');
    },
    categoryWeights: { mobile_phase: -20, system_contamination: -15, solvent: -15, carryover: -5, needle_wash: -5, sample_specific: 20, identity: 0 }
  },
  {
    id: 'injector_serviced',
    when: (answers) => answers.step3.injectorRecentlyServiced === 'yes',
    categoryWeights: { carryover: 12, needle_wash: 8, mobile_phase: 0, solvent: 0, system_contamination: 0, sample_specific: 0, identity: 0 }
  },
  {
    id: 'blank_after_high_elevated',
    when: (answers) => answers.step2.blankAfterHighConcFirst === 'higherThanFirst',
    categoryWeights: { carryover: 15, needle_wash: 5, mobile_phase: 0, solvent: 0, system_contamination: 0, sample_specific: 0, identity: 0 }
  },
  // Combo: injector serviced + blank elevated after high conc → strong carryover pattern
  {
    id: 'injector_serviced_with_blank_rise',
    when: (answers) => answers.step3.injectorRecentlyServiced === 'yes' && answers.step2.blankAfterHighConcFirst === 'higherThanFirst',
    categoryWeights: { carryover: 15, needle_wash: 10, mobile_phase: 0, solvent: 0, system_contamination: 0, sample_specific: 0, identity: 0 }
  }
];

export const directionTemplates = { unknown_impurity_peak: unknownImpurityPeakDirections };

// =============================================================================
// 评分
// =============================================================================
function isUntestable(value) {
  return value === 'notTested' || value === 'unknown' || value === 'Unknown' || value === undefined || value === null;
}

function computeMatchScore(direction, answers) {
  if (direction.isMetaDirection || direction.isIdentityDirection) return 0;
  let score = 0;
  for (const cond of direction.matchConditions) {
    const parts = cond.field.split('.');
    const scope = parts[0] === 'step2' ? answers.step2 : answers.step3;
    const actualValue = scope[cond.key];
    if (isUntestable(actualValue)) continue;
    let matched = false;
    if (cond.op === 'equals') matched = actualValue === cond.value;
    else if (cond.op === 'includes') matched = Array.isArray(actualValue) && actualValue.includes(cond.value);
    if (matched) score += cond.weight;
  }
  return Math.min(score, 50);
}

function computeBoostScore(direction, answers) {
  let boost = 0;
  for (const modifier of globalPriorityModifiers) {
    if (modifier.when(answers)) boost += (modifier.categoryWeights[direction.category] || 0);
  }
  boost += computeCarryoverComboBonus(direction, answers);
  return Math.max(-40, Math.min(40, boost));
}

function collectEvidence(direction, answers) {
  const evidence = [];
  for (const cond of direction.matchConditions) {
    const parts = cond.field.split('.');
    const scope = parts[0] === 'step2' ? answers.step2 : answers.step3;
    const actualValue = scope[cond.key];
    if (isUntestable(actualValue)) continue;
    let matched = false;
    if (cond.op === 'equals') matched = actualValue === cond.value;
    else if (cond.op === 'includes') matched = Array.isArray(actualValue) && actualValue.includes(cond.value);
    if (matched) {
      const key = `${cond.key}:${cond.value}`;
      const label = direction.evidenceLabels[key];
      if (label) evidence.push({ field: cond.key, label, value: actualValue });
    }
  }
  return evidence;
}

export function classifyEvidenceSupport(totalScore) {
  if (totalScore >= 80) return '较高';
  if (totalScore >= 60) return '中等';
  return '较低';
}

const confidenceOrder = Object.freeze(['较低', '中等', '较高']);

/**
 * Priority is the recommended investigation order. To keep that order legible,
 * a later card must never display stronger evidence support than the card above
 * it. This only normalizes the display label; it does not alter rule scores or
 * direction ranking.
 */
function normalizeTopDirectionConfidence(directions) {
  let ceiling = confidenceOrder.length - 1;
  return directions.map((direction) => {
    const current = confidenceOrder.indexOf(direction.confidence);
    const normalized = current < 0 ? 1 : Math.min(current, ceiling);
    ceiling = normalized;
    return { ...direction, confidence: confidenceOrder[normalized] };
  });
}

function meetsRequiredAny(direction, answers) {
  if (!direction.requiredAny || direction.requiredAny.length === 0) return true;
  return direction.requiredAny.some((cond) => {
    const parts = cond.field.split('.');
    const scope = parts[0] === 'step2' ? answers.step2 : answers.step3;
    const actualValue = scope[cond.key];
    if (isUntestable(actualValue)) return false;
    if (cond.op === 'equals') return actualValue === cond.value;
    if (cond.op === 'includes') return Array.isArray(actualValue) && actualValue.includes(cond.value);
    return false;
  });
}

// =============================================================================
// 证据缺口 & 风险原因
// =============================================================================
function detectBlankEvidenceGaps(answers) {
  const gaps = [];
  if (isUntestable(answers.step2.firstBlankAppears)) gaps.push('firstBlankAppears');
  if (isUntestable(answers.step2.blankTrend)) gaps.push('blankTrend');
  if (isUntestable(answers.step2.blankAfterHighConcFirst)) gaps.push('blankAfterHighConcFirst');
  return gaps;
}

/** Check if top direction has >= 20 matchScore — if so, evidence gap should NOT be priority 1 */
function hasStrongTopEvidence(qualifiedList) {
  if (!qualifiedList || qualifiedList.length === 0) return false;
  return (qualifiedList[0].matchScore || 0) >= 20;
}

function computeRiskReasons(answers) {
  const reasons = [];
  const sst = answers.step3.systemSuitabilityPassed;
  const locs = answers.step2.peakLocations || [];
  const rtNotFixed = answers.step2.hasFixedRT === 'no';

  if (sst === 'failed') reasons.push('System suitability 未通过');
  else if (sst === 'unknown') reasons.push('System suitability 尚未进行');

  if (locs.includes('Blank')) reasons.push('未知峰在 Blank 中有迹象');
  if (locs.includes('Sample')) reasons.push('未知峰在 Sample 中有迹象');
  if (rtNotFixed) reasons.push('未知峰保留时间不固定，峰身份尚未确认');

  if (reasons.length === 0) reasons.push('基于所选异常类型的基准评估');
  return reasons;
}

// =============================================================================
// 主入口
// =============================================================================
export function generateDirections(primaryAnomaly, answers) {
  const templates = directionTemplates[primaryAnomaly];
  if (!templates) return { topDirections: [], otherDirections: [], complianceBanner: null, riskReasons: [], evidenceGaps: [] };

  // Score each direction
  const scored = templates.map((direction) => {
    if (direction.isMetaDirection) return null;
    if (!meetsRequiredAny(direction, answers)) {
      return { ...direction, matchScore: -999, boostScore: 0, totalScore: -999, evidence: [], confidence: '较低', disqualified: true };
    }
    const matchScore = computeMatchScore(direction, answers);
    const boostScore = computeBoostScore(direction, answers);
    const totalScore = matchScore + boostScore;
    const evidence = collectEvidence(direction, answers);
    let confidence = classifyEvidenceSupport(totalScore);

    // Downgrade confidence if hasFixedRT=no (peak identity not confirmed)
    if (answers.step2.hasFixedRT === 'no' && !direction.isIdentityDirection) {
      if (confidence === '较高') confidence = '中等';
      else if (confidence === '中等') confidence = '较低';
    }

    const minScore = typeof direction.minimumScore === 'function' ? direction.minimumScore(answers) : (direction.minimumScore || 0);
    const meetsMin = matchScore >= minScore && (matchScore + boostScore) >= (minScore - 10);
    // identity direction is always "above threshold" if present
    const effectiveMeetsMin = direction.isIdentityDirection ? true : meetsMin;
    return { ...direction, matchScore, boostScore, totalScore, evidence, confidence, meetsMinimum: effectiveMeetsMin };
  }).filter(Boolean);

  const blankGaps = detectBlankEvidenceGaps(answers);

  // Sort
  scored.sort((a, b) => b.totalScore - a.totalScore);
  const qualified = scored.filter(d => !d.disqualified);
  const aboveThreshold = qualified.filter(d => d.meetsMinimum);
  const belowThreshold = qualified.filter(d => !d.meetsMinimum && !d.disqualified);

  // Build identity direction if hasFixedRT=no
  let identityDir = null;
  if (answers.step2.hasFixedRT === 'no') {
    const idTemplate = templates.find(d => d.isIdentityDirection);
    if (idTemplate) {
      identityDir = {
        isMetaDirection: true,
        confidence: '较高',
        title: idTemplate.title,
        summaryLine: idTemplate.summaryLine,
        evidence: collectEvidence(idTemplate, answers),
        rationale: idTemplate.buildRationale(answers, collectEvidence(idTemplate, answers)),
        actions: idTemplate.actions,
        resultJudgment: idTemplate.resultJudgment,
        nextSteps: idTemplate.nextSteps,
        stopCondition: null
      };
    }
  }

  // Build evidence-gap direction
  let evidenceGapDir = null;
  const blankGapCount = blankGaps.length;
  const totalBlankFields = 3; // firstBlankAppears, blankTrend, blankAfterHighConcFirst
  if (blankGapCount >= 2) {
    const rationale = evidenceGapDirection.rationale(answers, []);
    if (rationale !== null) {
      evidenceGapDir = {
        isMetaDirection: true, confidence: '较高',
        title: evidenceGapDirection.title, summaryLine: evidenceGapDirection.summaryLine,
        evidence: [], rationale,
        actions: evidenceGapDirection.actions,
        resultJudgment: evidenceGapDirection.resultJudgment,
        nextSteps: evidenceGapDirection.nextSteps, stopCondition: null
      };
    }
  }

  // Assemble top: identity at #1 always (if present)
  let topN = [];

  if (identityDir) {
    topN.push(identityDir);
    const realAbove = aboveThreshold.filter(d => d.category !== 'identity').slice(0, 2);
    topN.push(...realAbove);
    // Insert gap if needed (after identity, before real dirs)
    if (evidenceGapDir && !topN.some(d => d.title === evidenceGapDir.title) && !hasStrongTopEvidence(qualified.filter(d => d.category !== 'identity'))) {
      topN.splice(1, 0, evidenceGapDir);
      topN = topN.slice(0, 3);
    }
  } else {
    topN = aboveThreshold.slice(0, 3);
    // Insert gap if needed
    if (evidenceGapDir && !topN.some(d => d.title === evidenceGapDir.title)) {
      // When all 3 blank sequence fields are missing → gap is ALWAYS #1
      if (blankGapCount >= 3) {
        topN.unshift(evidenceGapDir);
      } else if (!hasStrongTopEvidence(qualified)) {
        topN.unshift(evidenceGapDir);
      } else if (topN.length >= 2) {
        topN.splice(1, 0, evidenceGapDir);
      } else {
        topN.push(evidenceGapDir);
      }
      topN = topN.slice(0, 3);
    }
  }

  const topDirections = normalizeTopDirectionConfidence(topN.map((d, i) => ({
    priority: i + 1, confidence: d.confidence, title: d.title,
    summaryLine: d.summaryLine, evidence: d.evidence || [],
    rationale: typeof d.buildRationale === 'function' ? d.buildRationale(answers, d.evidence || []) : (d.rationale || ''),
    actions: d.actions, resultJudgment: d.resultJudgment,
    nextSteps: d.nextSteps, stopCondition: d.stopCondition,
    isMetaDirection: d.isMetaDirection || false
  })));

  const otherDirections = belowThreshold.map((d) => ({
    confidence: d.confidence, title: d.title, summaryLine: d.summaryLine,
    evidence: d.evidence || [],
    rationale: typeof d.buildRationale === 'function' ? d.buildRationale(answers, d.evidence || []) : (d.rationale || ''),
    actions: d.actions, resultJudgment: d.resultJudgment,
    nextSteps: d.nextSteps, stopCondition: d.stopCondition
  }));

  return {
    topDirections, otherDirections,
    complianceBanner: computeComplianceBanner(answers),
    riskReasons: computeRiskReasons(answers),
    evidenceGaps: blankGaps,
    _scored: scored
  };
}

function computeComplianceBanner(answers) {
  if (answers.step3.systemSuitabilityPassed === 'failed') {
    return {
      level: 'stop',
      message: 'System suitability 未通过，建议暂停样品结果报告并升级处理。在系统适用性未确认之前，不得直接报告样品检测结果。'
    };
  }
  return null;
}
