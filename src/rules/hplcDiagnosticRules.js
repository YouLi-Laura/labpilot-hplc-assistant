import { anomalyLabels } from "../domain/hplcLabels.js";

export const DEFAULT_DISCLAIMER =
  "本结果仅为 HPLC 实验室异常排查辅助原型，基于用户输入和预设规则生成。它不构成医学诊断，不替代 GMP 调查结论、主管判断、QA 评估、SOP、方法验证状态或原始记录审查。请结合经批准的方法、实验室程序和数据完整性要求进行判断。";

export const globalStopConditions = [
  {
    id: "stop_sst_failed",
    text: "System suitability 未通过或失败原因未排除时，建议停止直接报告样品结果，并升级给主管或按实验室程序评估。",
    when: [{ field: "systemSuitabilityPassed", operator: "equals", value: false }]
  },
  {
    id: "stop_blank_unknown_peak",
    text: "Blank 中未知峰重复出现且污染源未确认或未排除时，建议停止继续检测并升级给主管。",
    when: [{ field: "blankHasUnknownPeak", operator: "equals", value: true }]
  },
  {
    id: "stop_critical_quality_impact",
    text: "异常可能影响关键定量峰、杂质限度判断或放行结论时，建议停止直接解释样品结果并升级评估。"
  }
];

export const complianceModifiers = [
  {
    id: "sst_failed_blocks_reporting",
    when: [{ field: "systemSuitabilityPassed", operator: "equals", value: false }],
    priorityDelta: 100,
    riskAdjustment: "高",
    explanation: "System suitability 未通过时，方法系统适用性尚未确认，不应建议直接继续报告样品结果。"
  },
  {
    id: "blank_unknown_peak_contamination_first",
    when: [{ field: "blankHasUnknownPeak", operator: "equals", value: true }],
    targetCauseIds: [
      "mobile_phase_contamination",
      "injection_system_contamination",
      "needle_wash_issue",
      "solvent_contamination",
      "carryover"
    ],
    targetStepIds: [
      "check_mobile_phase_contamination",
      "check_injection_system",
      "check_needle_wash",
      "check_solvents",
      "check_carryover"
    ],
    priorityDelta: 80,
    riskAdjustment: "高",
    explanation: "Blank 中出现未知峰时，污染或交叉污染来源需要优先排除。"
  },
  {
    id: "mobile_phase_remake_rt_resolution_changed",
    when: [
      { field: "mobilePhaseRemadeRecently", operator: "equals", value: true },
      { field: "retentionTimeChangedAfterRemake", operator: "equals", value: true },
      { field: "resolutionChangedAfterRemake", operator: "equals", value: true }
    ],
    targetCauseIds: [
      "mobile_phase_ratio_issue",
      "mobile_phase_additive_issue",
      "mobile_phase_ph_issue",
      "solvent_lot_difference",
      "degassing_or_equilibration_issue"
    ],
    targetStepIds: [
      "verify_mobile_phase_ratio",
      "verify_additives",
      "verify_ph",
      "verify_solvent_lot",
      "verify_degas_equilibration"
    ],
    priorityDelta: 70,
    riskAdjustment: "高",
    explanation: "重新配制流动相后保留时间和分离度同时变化，优先排查流动相组成、脱气和平衡相关因素。"
  }
];

const metadata = {
  version: "v1.0.0",
  lastReviewedAt: "2026-07-11"
};

const sharedStopConditions = [
  {
    id: "stop_repeated_unresolved_abnormality",
    text: "重复检查后异常仍持续，且可能影响数据完整性或方法适用性时，建议停止继续检测并升级给主管。"
  }
];

export const hplcDiagnosticRules = [
  {
    id: "retention_time_drift",
    label: anomalyLabels.retention_time_drift,
    ...metadata,
    baseRiskLevel: "中",
    causeCandidates: [
      { id: "mobile_phase_ratio_issue", text: "可能存在流动相比例或混合准确性变化，建议优先检查配制和泵混合。", basePriority: 70 },
      { id: "mobile_phase_additive_issue", text: "可能存在添加剂或缓冲盐浓度变化，建议优先复核配制记录和称量记录。", basePriority: 66 },
      { id: "mobile_phase_ph_issue", text: "可能存在 pH、缓冲盐或添加剂浓度变化，建议优先复核记录和测量值。", basePriority: 65 },
      { id: "solvent_lot_difference", text: "可能存在溶剂批次、等级或供应来源变化，可考虑复核批号和适用性记录。", basePriority: 63 },
      { id: "degassing_or_equilibration_issue", text: "可能存在脱气不足或系统平衡不充分，可考虑延长平衡并观察趋势。", basePriority: 60 },
      { id: "column_or_temperature_issue", text: "可能存在柱温、流速或色谱柱状态变化，建议结合系统记录排查。", basePriority: 45 }
    ],
    stepTemplates: [
      { id: "verify_mobile_phase_ratio", action: "复核流动相比例、配制记录和泵比例设置。", rationale: "保留时间对有机相比例和混合准确性敏感，比例变化可造成整体漂移。", linkedCauses: ["mobile_phase_ratio_issue"], baseOrder: 10 },
      { id: "verify_additives", action: "复核添加剂、缓冲盐浓度和称量记录。", rationale: "添加剂或缓冲盐浓度变化可能改变保留行为和选择性。", linkedCauses: ["mobile_phase_additive_issue"], baseOrder: 15 },
      { id: "verify_ph", action: "复核 pH、缓冲盐和添加剂浓度。", rationale: "离子化状态或缓冲条件变化可能改变保留行为。", linkedCauses: ["mobile_phase_ph_issue"], baseOrder: 20 },
      { id: "verify_solvent_lot", action: "复核有机相、水、缓冲盐和添加剂的供应商、等级和批号变化。", rationale: "溶剂批次或等级变化可能改变洗脱强度、背景和选择性。", linkedCauses: ["solvent_lot_difference"], baseOrder: 25 },
      { id: "verify_degas_equilibration", action: "确认流动相脱气状态和系统平衡时间。", rationale: "脱气不足或平衡不足可能导致保留时间逐针变化。", linkedCauses: ["degassing_or_equilibration_issue"], baseOrder: 30 },
      { id: "check_temperature_flow_column", action: "检查柱温、流速记录、压力趋势和色谱柱使用状态。", rationale: "温度、流速和柱状态变化均可能改变保留时间。", linkedCauses: ["column_or_temperature_issue"], baseOrder: 40 }
    ],
    priorityModifiers: [],
    stopConditions: sharedStopConditions
  },
  {
    id: "resolution_loss",
    label: anomalyLabels.resolution_loss,
    ...metadata,
    baseRiskLevel: "中",
    causeCandidates: [
      { id: "column_efficiency_loss", text: "可能存在色谱柱效能下降、污染或保护柱影响，建议优先查看压力和历史使用记录。", basePriority: 65 },
      { id: "mobile_phase_ratio_issue", text: "可能存在流动相比例或梯度条件偏差，建议优先复核配制和方法参数。", basePriority: 60 },
      { id: "mobile_phase_additive_issue", text: "可能存在添加剂、缓冲盐或 pH 条件变化，建议结合近期配制记录检查。", basePriority: 58 },
      { id: "system_dead_volume_issue", text: "可能存在系统死体积、接头或管路状态变化，可考虑检查系统连接。", basePriority: 45 }
    ],
    stepTemplates: [
      { id: "verify_mobile_phase_ratio", action: "复核流动相比例、梯度表和方法参数。", rationale: "分离度对洗脱强度和梯度条件变化敏感。", linkedCauses: ["mobile_phase_ratio_issue"], baseOrder: 10 },
      { id: "verify_additives", action: "复核添加剂、缓冲盐、pH 和配制批记录。", rationale: "选择性变化常与流动相化学组成变化相关。", linkedCauses: ["mobile_phase_additive_issue"], baseOrder: 20 },
      { id: "check_column_efficiency", action: "检查理论塔板数、拖尾因子、压力趋势和色谱柱历史。", rationale: "柱效下降或污染可能直接降低相邻峰分离度。", linkedCauses: ["column_efficiency_loss"], baseOrder: 30 },
      { id: "check_system_connections", action: "检查接头、管路、保护柱和系统死体积变化。", rationale: "额外体积或连接异常可能造成峰展宽并降低分离度。", linkedCauses: ["system_dead_volume_issue"], baseOrder: 40 }
    ],
    priorityModifiers: [],
    stopConditions: sharedStopConditions
  },
  {
    id: "peak_tailing",
    label: anomalyLabels.peak_tailing,
    ...metadata,
    baseRiskLevel: "中",
    causeCandidates: [
      { id: "column_active_sites", text: "可能存在柱污染或活性位点相互作用，建议优先结合峰类型和柱历史检查。", basePriority: 65 },
      { id: "sample_solvent_mismatch", text: "可能存在样品溶剂与初始流动相不匹配，可考虑复核溶剂强度和进样体积。", basePriority: 58 },
      { id: "injection_overload", text: "可能存在进样量或样品浓度偏高，建议优先检查稀释和进样设置。", basePriority: 55 },
      { id: "buffer_ph_issue", text: "可能存在 pH 或缓冲条件不适合目标化合物，建议复核方法条件。", basePriority: 50 }
    ],
    stepTemplates: [
      { id: "check_tailing_scope", action: "确认拖尾影响单一峰、多个峰还是全部峰。", rationale: "影响范围有助于区分样品、柱和系统因素。", linkedCauses: ["column_active_sites", "sample_solvent_mismatch"], baseOrder: 10 },
      { id: "review_sample_solvent_and_load", action: "复核样品溶剂、浓度、进样体积和稀释记录。", rationale: "溶剂不匹配或过载可能导致峰形拖尾。", linkedCauses: ["sample_solvent_mismatch", "injection_overload"], baseOrder: 20 },
      { id: "check_guard_column_and_frit", action: "检查保护柱、筛板、压力趋势和柱污染迹象。", rationale: "堵塞、污染或活性位点可能造成峰形异常。", linkedCauses: ["column_active_sites"], baseOrder: 30 },
      { id: "verify_buffer_ph", action: "复核 pH、缓冲盐和目标峰化学性质。", rationale: "离子化状态变化或二次相互作用可能加重拖尾。", linkedCauses: ["buffer_ph_issue"], baseOrder: 40 }
    ],
    priorityModifiers: [],
    stopConditions: sharedStopConditions
  },
  {
    id: "area_abnormal",
    label: anomalyLabels.area_abnormal,
    ...metadata,
    baseRiskLevel: "中",
    causeCandidates: [
      { id: "autosampler_precision_issue", text: "可能存在进样量、针座或自动进样器精密度问题，建议优先检查重复性。", basePriority: 65 },
      { id: "sample_preparation_issue", text: "可能存在样品制备、稀释、溶解或稳定性问题，建议优先复核制备链路。", basePriority: 62 },
      { id: "standard_solution_issue", text: "可能存在标准溶液、校准或响应链路变化，建议检查标准记录和系统响应。", basePriority: 58 },
      { id: "integration_parameter_issue", text: "可能存在积分参数或基线处理差异，可考虑复核积分事件和审计记录。", basePriority: 50 }
    ],
    stepTemplates: [
      { id: "compare_standard_sample_area", action: "比较 Blank、标准和样品的面积变化范围。", rationale: "影响范围可帮助区分系统、标准和样品制备因素。", linkedCauses: ["standard_solution_issue", "sample_preparation_issue"], baseOrder: 10 },
      { id: "check_autosampler_precision", action: "检查自动进样器重复进样、针座、样品瓶和进样体积设置。", rationale: "进样体积或机械重复性异常可导致面积波动。", linkedCauses: ["autosampler_precision_issue"], baseOrder: 20 },
      { id: "review_sample_standard_preparation", action: "复核样品和标准的称量、稀释、溶解和稳定性记录。", rationale: "制备链路变化会直接影响响应面积。", linkedCauses: ["sample_preparation_issue", "standard_solution_issue"], baseOrder: 30 },
      { id: "review_integration_events", action: "复核积分参数、基线划分和人工积分记录。", rationale: "积分处理差异可能造成表观面积异常。", linkedCauses: ["integration_parameter_issue"], baseOrder: 40 }
    ],
    priorityModifiers: [],
    stopConditions: sharedStopConditions
  },
  {
    id: "baseline_abnormal",
    label: anomalyLabels.baseline_abnormal,
    ...metadata,
    baseRiskLevel: "低",
    causeCandidates: [
      { id: "mobile_phase_degas_issue", text: "可能存在流动相脱气不足、气泡或泵混合波动，建议优先观察压力和基线形态。", basePriority: 65 },
      { id: "detector_condition_issue", text: "可能存在检测器灯能量、温控或波长相关问题，建议检查仪器状态。", basePriority: 58 },
      { id: "mobile_phase_absorbance_issue", text: "可能存在流动相吸收差异、污染或梯度基线变化，可考虑复核溶剂和批次。", basePriority: 55 },
      { id: "column_temperature_issue", text: "可能存在柱温波动或系统平衡不足，建议结合温控记录排查。", basePriority: 45 }
    ],
    stepTemplates: [
      { id: "classify_baseline_pattern", action: "区分基线噪声、漂移、周期波动或突发干扰。", rationale: "不同基线形态对应的优先排查方向不同。", linkedCauses: ["mobile_phase_degas_issue", "detector_condition_issue"], baseOrder: 10 },
      { id: "check_pressure_and_degas", action: "检查压力波动、脱气状态、泵密封和管路气泡。", rationale: "气泡或泵波动常伴随压力和基线同步异常。", linkedCauses: ["mobile_phase_degas_issue"], baseOrder: 20 },
      { id: "check_detector_status", action: "检查检测器灯能量、波长设置、温控和流通池状态。", rationale: "检测器状态变化可引入噪声或漂移。", linkedCauses: ["detector_condition_issue"], baseOrder: 30 },
      { id: "verify_solvent_lot", action: "复核流动相溶剂批次、吸收背景和污染风险。", rationale: "溶剂批次或污染可能改变基线背景。", linkedCauses: ["mobile_phase_absorbance_issue"], baseOrder: 40 }
    ],
    priorityModifiers: [],
    stopConditions: sharedStopConditions
  },
  {
    id: "unknown_impurity_peak",
    label: anomalyLabels.unknown_impurity_peak,
    ...metadata,
    baseRiskLevel: "中",
    causeCandidates: [
      { id: "mobile_phase_contamination", text: "可能存在流动相或容器污染，Blank 出现未知峰时建议优先检查。", basePriority: 70 },
      { id: "injection_system_contamination", text: "可能存在进样系统残留或污染，建议优先检查样品环、针座和管路。", basePriority: 68 },
      { id: "needle_wash_issue", text: "可能存在洗针液组成或污染问题，建议优先检查洗针液和清洗程序。", basePriority: 65 },
      { id: "solvent_contamination", text: "可能存在稀释剂、溶剂或试剂污染，建议检查批次和空白。", basePriority: 62 },
      { id: "carryover", text: "可能存在交叉污染或 carryover，建议通过序列位置和清洗验证排查。", basePriority: 60 },
      { id: "sample_related_impurity", text: "若 Blank 和标准未见该峰，可能与样品制备或样品稳定性相关。", basePriority: 40 }
    ],
    stepTemplates: [
      { id: "check_mobile_phase_contamination", action: "优先检查流动相、容器、过滤材料和配制记录。", rationale: "Blank 中出现未知峰时，流动相或容器污染需要先排除。", linkedCauses: ["mobile_phase_contamination"], baseOrder: 10 },
      { id: "check_injection_system", action: "检查进样针、针座、样品环、阀和相关管路污染。", rationale: "进样路径污染可在 Blank、标准和样品中重复出现未知峰。", linkedCauses: ["injection_system_contamination"], baseOrder: 20 },
      { id: "check_needle_wash", action: "检查洗针液组成、批次、污染风险和清洗程序。", rationale: "洗针液问题可能导致残留峰或交叉污染。", linkedCauses: ["needle_wash_issue"], baseOrder: 30 },
      { id: "check_solvents", action: "检查稀释剂、溶剂和试剂批次，必要时进样新鲜空白。", rationale: "溶剂或试剂污染可能在 Blank 中表现为未知峰。", linkedCauses: ["solvent_contamination"], baseOrder: 40 },
      { id: "check_carryover", action: "根据序列位置检查 carryover，并在高浓度样品后插入空白确认。", rationale: "未知峰若与前序进样相关，交叉污染需要优先排除。", linkedCauses: ["carryover"], baseOrder: 50 },
      { id: "compare_unknown_peak_scope", action: "比较未知峰在 Blank、标准、样品和重复进样中的出现范围。", rationale: "出现范围决定是否优先调查污染、系统或样品制备因素。", linkedCauses: ["sample_related_impurity", "carryover"], baseOrder: 60 }
    ],
    priorityModifiers: [],
    stopConditions: sharedStopConditions
  }
];
