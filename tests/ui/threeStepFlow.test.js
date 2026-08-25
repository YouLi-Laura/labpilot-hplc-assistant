import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../../src/ui/app.js", import.meta.url), "utf8");

function sourceBlock(start, end) {
  const match = appSource.match(new RegExp(`${start}[\\s\\S]*?${end}`));
  assert.ok(match, `expected source block from ${start} to ${end}`);
  return match[0];
}

test("the progress indicator keeps step 4 as the diagnostic result", () => {
  const indicator = sourceBlock("function renderStepIndicator", "function renderStep1");
  assert.equal((indicator.match(/\{ num:/g) || []).length, 4);
  assert.match(indicator, /label: '选择异常'/);
  assert.match(indicator, /label: '异常详情'/);
  assert.match(indicator, /label: '系统状态'/);
  assert.match(indicator, /\{ num: 4, label: '排查结果' \}/);
  assert.match(indicator, /appState\.currentStep === 'result' \? 4/);
  assert.doesNotMatch(appSource, /function renderStep4|确认本次观察|核心证据摘要|查看全部输入/);
});

test("step 3 exposes one direct confirmation action with the existing conflict guard", () => {
  const step3 = sourceBlock("function renderStep3", "function renderResultView");
  assert.match(step3, /const conflicts = validateStep2Answers\(appState\.step2Answers\)/);
  assert.ok(step3.includes('<button type="button" class="btn-primary" id="btn-step3-next" ${conflicts.length > 0 ? \'disabled\' : \'\'}>确认</button>'));
  assert.match(step3, /conflicts\.length > 0 \? 'disabled' : ''/);
  assert.match(step3, /addEventListener\('click', generateResult\)/);
  assert.doesNotMatch(step3, /确认摘要|function renderStep4|确认本次观察|核心证据摘要|查看全部输入|btn-confirm-generate/);
});

test("generation revalidates conflicts before calling the unchanged diagnosis engine", () => {
  const generation = sourceBlock("function generateResult", "function regenerateResult");
  const validationIndex = generation.indexOf("validateStep2Answers(appState.step2Answers)");
  const diagnosisIndex = generation.indexOf("diagnoseHplcIssueV2({");
  assert.ok(validationIndex >= 0);
  assert.ok(diagnosisIndex > validationIndex);
  assert.match(generation, /if \(conflicts\.length > 0\) \{[\s\S]*?renderStep3\(\);[\s\S]*?return;/);
  assert.match(generation, /appState\.currentStep = 'result'/);
});

test("the main renderer has no step 4 branch", () => {
  const renderer = sourceBlock("function renderView", "// 导航栏");
  assert.doesNotMatch(renderer, /currentStep === 4|renderStep4/);
});
