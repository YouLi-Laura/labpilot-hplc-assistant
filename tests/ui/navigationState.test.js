import test from "node:test";
import assert from "node:assert/strict";
import * as navigationState from "../../src/ui/navigationState.js";

const { returnToSystemStatus } = navigationState;

test("returns from result to step 3 without clearing inputs or result", () => {
  const state = {
    currentStep: "result",
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: { hasFixedRT: "yes" },
    step3Answers: { systemSuitabilityPassed: "passed" },
    result: { topDirections: [{ title: "Carryover" }] },
    isConfirmed: true,
    isResultDirty: false,
  };
  const originalStep2 = state.step2Answers;
  const originalStep3 = state.step3Answers;
  const originalResult = state.result;

  returnToSystemStatus(state);

  assert.equal(state.currentStep, 3);
  assert.equal(state.primaryAnomaly, "unknown_impurity_peak");
  assert.equal(state.step2Answers, originalStep2);
  assert.equal(state.step3Answers, originalStep3);
  assert.equal(state.result, originalResult);
  assert.equal(state.isConfirmed, true);
  assert.equal(state.isResultDirty, false);
});

test("returns to overview without clearing the in-progress diagnosis", () => {
  assert.equal(typeof navigationState.showOverview, "function");

  const state = {
    currentStep: 2,
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: { hasFixedRT: "yes" },
    step3Answers: { systemSuitabilityPassed: "passed" },
    result: { topDirections: [{ title: "Carryover" }] },
    isConfirmed: true,
    isResultDirty: true,
  };
  const originalStep2 = state.step2Answers;
  const originalStep3 = state.step3Answers;
  const originalResult = state.result;

  navigationState.showOverview(state);

  assert.equal(state.currentStep, "overview");
  assert.equal(state.primaryAnomaly, "unknown_impurity_peak");
  assert.equal(state.step2Answers, originalStep2);
  assert.equal(state.step3Answers, originalStep3);
  assert.equal(state.result, originalResult);
  assert.equal(state.isConfirmed, true);
  assert.equal(state.isResultDirty, true);
});

test("starts a fresh diagnosis with the complete initial state", () => {
  assert.equal(typeof navigationState.startNewDiagnosis, "function");
  assert.equal(typeof navigationState.createInitialStep3Answers, "function");

  const state = {
    currentStep: "result",
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: { hasFixedRT: "yes" },
    step3Answers: { systemSuitabilityPassed: "failed" },
    result: { topDirections: [{ title: "Carryover" }] },
    isConfirmed: true,
    isResultDirty: true,
  };

  navigationState.startNewDiagnosis(state);

  assert.equal(state.currentStep, 1);
  assert.equal(state.primaryAnomaly, null);
  assert.deepEqual(state.step2Answers, {});
  assert.deepEqual(state.step3Answers, {
    mobilePhaseRemadeRecently: null,
    columnRecentlyReplaced: null,
    solventOrReagentBatchChanged: null,
    injectorRecentlyServiced: null,
    systemPressureAbnormal: null,
    systemSuitabilityPassed: null,
  });
  assert.equal(state.result, null);
  assert.equal(state.isConfirmed, false);
  assert.equal(state.isResultDirty, false);
});
