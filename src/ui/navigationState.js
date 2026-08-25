export function createInitialStep3Answers() {
  return {
    mobilePhaseRemadeRecently: null,
    columnRecentlyReplaced: null,
    solventOrReagentBatchChanged: null,
    injectorRecentlyServiced: null,
    systemPressureAbnormal: null,
    systemSuitabilityPassed: null,
  };
}

export function returnToSystemStatus(state) {
  state.currentStep = 3;
  return state;
}

export function showOverview(state) {
  state.currentStep = "overview";
  return state;
}

export function startNewDiagnosis(state) {
  state.currentStep = 1;
  state.primaryAnomaly = null;
  state.step2Answers = {};
  state.step3Answers = createInitialStep3Answers();
  state.isConfirmed = false;
  state.result = null;
  state.isResultDirty = false;
  return state;
}
