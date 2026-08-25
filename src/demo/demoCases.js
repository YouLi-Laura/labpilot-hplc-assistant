// 虚构演示案例 —— 适配四步诊断流程（无冲突版本）
export const demoCaseA = Object.freeze({
  id: "fictional_demo_case_a",
  title: "虚构演示案例 A：未知杂峰 — SST 未通过、Blank 出现未知峰",
  isFictional: true,
  companyDataUsed: false,
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
    areaChangesWithTime: "notTested"
  },
  step3Answers: {
    mobilePhaseRemadeRecently: "yes",
    columnRecentlyReplaced: "no",
    solventOrReagentBatchChanged: "yes",
    injectorRecentlyServiced: "no",
    systemPressureAbnormal: "no",
    systemSuitabilityPassed: "failed"
  }
});

export const demoCases = Object.freeze([demoCaseA]);
