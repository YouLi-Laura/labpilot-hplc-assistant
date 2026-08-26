import { diagnoseHplcIssueV2, primaryAnomalyLabels } from "../engine/diagnoseHplcIssue.js?v=evidence-support-20260808-r3";
import { demoCaseA } from "../demo/demoCases.js";
import { bindDirectionExpandControls, renderDiagnosticResult } from "./renderDiagnosticResult.js?v=priority-basis-20260826-r20";
import { step2Questions, step3Questions, validateStep2Answers, getAutoCorrectionNotice, getAutoSyncBlankFields } from "./stepQuestions.js";
import { createInitialStep3Answers, returnToSystemStatus, showOverview, startNewDiagnosis } from "./navigationState.js?v=overview-workbench-20260809-r13";
import { visibleAnomalies } from "./productScope.js";
import { downloadDiagnosticPdf } from "./reportPdf.js?v=diagnosis-pdf-pagination-20260811-r18";
import { bindOverviewActions, getOverviewMarkup } from "./overviewView.js?v=priority-basis-20260826-r20";

// =============================================================================
// 应用状态
// =============================================================================

const appState = {
  currentStep: 'overview',
  primaryAnomaly: null,
  step2Answers: {},
  step3Answers: createInitialStep3Answers(),
  isConfirmed: false,
  result: null,
  isResultDirty: false
};

// DOM 引用
const stepIndicator = document.querySelector('#step-indicator');
const stepContent = document.querySelector('#step-content');
const resultContainer = document.querySelector('#result-container');
const navLinks = document.querySelectorAll('.nav-item[data-available="true"]');
const caseInfoDialog = document.querySelector('#case-info-dialog');
const caseInfoButton = document.querySelector('#nav-case-info');

// =============================================================================
// 统一的表单更新入口
// =============================================================================

function updateFormState(step, field, value) {
  if (step === 'primary') {
    appState.primaryAnomaly = value;
  } else if (step === 'step2') {
    appState.step2Answers[field] = value;

    // 自动修正：peakLocations 含 Blank 或 Standard 时，修正 sampleOccurrenceScope
    if (field === 'peakLocations') {
      const locs = value || [];
      if ((locs.includes('Blank') || locs.includes('Standard')) &&
          appState.step2Answers.sampleOccurrenceScope === 'specificSampleOnly') {
        appState.step2Answers.sampleOccurrenceScope = 'allSamples';
      }
    }

    // 自动同步：如果 firstBlankAppears 或 blankAfterHighConc 表明 Blank 有峰，自动添加 Blank 到 peakLocations
    if (field === 'firstBlankAppears' || field === 'blankAfterHighConcFirst') {
      applyBlankAutoSync();
    }
  } else if (step === 'step3') {
    appState.step3Answers[field] = value;
  }

  if (appState.isConfirmed) {
    appState.isResultDirty = true;
  }
}

/** Apply auto-sync: if blank observation fields indicate Blank has peaks, auto-add to locations */
function applyBlankAutoSync() {
  const sync = getAutoSyncBlankFields(appState.step2Answers);
  if (sync) {
    appState.step2Answers.peakLocations = sync.newValue;
  }
}

// =============================================================================
// 导航与步骤
// =============================================================================

function canProceedToStep(n) {
  if (n === 2) return appState.primaryAnomaly !== null;
  return true;
}

function goToStep(n) {
  if (n < 1 || n > 3) return;
  if (n > appState.currentStep + 1) return;
  if (!canProceedToStep(n)) return;

  appState.currentStep = n;
  renderView();
}

function generateResult() {
  const conflicts = validateStep2Answers(appState.step2Answers);
  if (conflicts.length > 0) {
    renderStep3();
    return;
  }

  appState.isConfirmed = true;
  appState.isResultDirty = false;
  appState.currentStep = 'result';
  appState.result = diagnoseHplcIssueV2({
    primaryAnomaly: appState.primaryAnomaly,
    step2Answers: appState.step2Answers,
    step3Answers: appState.step3Answers
  });
  renderView();
}

function regenerateResult() {
  const conflicts = validateStep2Answers(appState.step2Answers);
  if (conflicts.length > 0) return;

  appState.isResultDirty = false;
  appState.result = diagnoseHplcIssueV2({
    primaryAnomaly: appState.primaryAnomaly,
    step2Answers: appState.step2Answers,
    step3Answers: appState.step3Answers
  });
  renderView();
}

// =============================================================================
// 步骤指示器
// =============================================================================

function renderStepIndicator() {
  const steps = [
    { num: 1, label: '选择异常' },
    { num: 2, label: '异常详情' },
    { num: 3, label: '系统状态' },
    { num: 4, label: '排查结果' }
  ];

  const current = appState.currentStep === 'result' ? 4 : appState.currentStep;

  stepIndicator.innerHTML = steps.map((s) => {
    let cls = 'step-dot';
    if (s.num < current) cls += ' completed';
    if (s.num === current) cls += ' active';
    return `
      <div class="step-item">
        <div class="${cls}">${s.num < current ? '✓' : s.num}</div>
        <span class="step-label">${s.label}</span>
      </div>
    `;
  }).join('');
}

// =============================================================================
// Step 1：选择核心异常
// =============================================================================

function renderStep1() {
  const items = visibleAnomalies.map((a) => {
    const checked = appState.primaryAnomaly === a.key ? 'checked' : '';
    return `
      <label class="anomaly-option ${checked ? 'selected' : ''}">
        <input type="radio" name="primaryAnomaly" value="${a.key}" ${checked}>
        <span class="anomaly-option-label">${a.label}</span>
      </label>
    `;
  }).join('');

  stepContent.innerHTML = `
    <div class="step-panel">
      <h2>选择核心异常</h2>
      <p class="step-desc">通过异常表现、序列位置和系统变更信息，生成基于当前证据的优先排查路径。本工具不替代 SOP、偏差调查或质量结论。</p>
      <p class="step-desc">V1 当前仅开放并验收“未知杂峰”场景。</p>
      <div class="anomaly-options" id="anomaly-options">
        ${items}
      </div>
      <div class="step-actions">
        <button type="button" class="btn-primary" id="btn-step1-next" disabled>下一步：异常详情 →</button>
      </div>
    </div>
  `;

  const radios = stepContent.querySelectorAll('input[name="primaryAnomaly"]');
  const nextBtn = stepContent.querySelector('#btn-step1-next');

  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      updateFormState('primary', null, radio.value);
      nextBtn.disabled = false;
      stepContent.querySelectorAll('.anomaly-option').forEach((opt) => opt.classList.remove('selected'));
      radio.closest('.anomaly-option').classList.add('selected');
    });
  });

  nextBtn.addEventListener('click', () => goToStep(2));

  if (appState.primaryAnomaly) {
    nextBtn.disabled = false;
  }
}

// =============================================================================
// Step 2：异常详情 — 动态问题
// =============================================================================

function renderStep2() {
  const questions = step2Questions[appState.primaryAnomaly] || [];
  const answers = appState.step2Answers || {};
  const notice = getAutoCorrectionNotice(answers);

  const visibleQuestions = questions.filter((q) => {
    if (typeof q.condition === 'function') {
      return q.condition(answers);
    }
    return true;
  });

  const fields = visibleQuestions.map((q) => {
    const opts = q.options || [];
    const longestOptionLength = opts.reduce((max, option) => Math.max(max, option.label.length), 0);
    const totalOptionLength = opts.reduce((total, option) => total + option.label.length, 0);
    const inline = opts.length >= 2 && opts.length <= 4 && longestOptionLength <= 10 && totalOptionLength <= 30;
    const groupCls = q.type === 'multiselect' ? 'checkbox-group' : 'radio-group';
    const groupClsFinal = inline ? `${groupCls} inline-options` : groupCls;

    if (q.type === 'multiselect') {
      const selected = answers[q.key] || [];
      const options = q.options.map((opt) => {
        const checked = selected.includes(opt.value) ? 'checked' : '';
        return `<label class="checkbox-label"><input type="checkbox" name="${q.key}" value="${opt.value}" ${checked}> ${opt.label}</label>`;
      }).join('');
      return `
        <div class="form-field">
          <p class="field-label">${q.label}</p>
          <div class="${groupClsFinal}" data-field="${q.key}">${options}</div>
        </div>
      `;
    } else {
      const currentValue = answers[q.key];
      const options = q.options.map((opt) => {
        const checked = currentValue === opt.value ? 'checked' : '';
        let disabled = '';
        if (typeof opt.disabledWhen === 'function' && opt.disabledWhen(answers)) {
          disabled = 'disabled';
        }
        return `<label class="radio-label ${disabled ? 'disabled' : ''}"><input type="radio" name="${q.key}" value="${opt.value}" ${checked} ${disabled}> ${opt.label}${disabled ? ' <span class="auto-correction-hint">（已自动调整）</span>' : ''}</label>`;
      }).join('');
      return `
        <div class="form-field">
          <p class="field-label">${q.label}</p>
          <div class="${groupClsFinal}" data-field="${q.key}">${options}</div>
        </div>
      `;
    }
  }).join('');

  const noticeHtml = notice.length > 0
    ? `<div class="auto-notice"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> ${notice.map((n) => escapeHtmlLight(n)).join('<br>')}</div>`
    : '';

  function escapeHtmlLight(str) { return String(str).replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }

  stepContent.innerHTML = `
    <div class="step-panel">
      <h2>异常详情 — ${primaryAnomalyLabels[appState.primaryAnomaly] || appState.primaryAnomaly}</h2>
      <p class="step-desc">请根据实际观察回答以下问题，以便系统更准确地判断排查方向。</p>
      ${noticeHtml}
      <div class="form-fields">${fields}</div>
      <div class="step-actions sticky-step-actions">
        <button type="button" class="btn-secondary" id="btn-step2-prev">← 上一步</button>
        <button type="button" class="btn-primary" id="btn-step2-next">下一步：系统状态 →</button>
      </div>
    </div>
  `;

  // Bind checkbox groups
  stepContent.querySelectorAll('.checkbox-group').forEach((group) => {
    const field = group.dataset.field;
    group.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const selected = [];
        group.querySelectorAll('input[type="checkbox"]:checked').forEach((c) => selected.push(c.value));
        updateFormState('step2', field, selected);
        renderStep2();
      });
    });
  });

  // Bind radio groups
  stepContent.querySelectorAll('.radio-group').forEach((group) => {
    const field = group.dataset.field;
    group.querySelectorAll('input[type="radio"]:not([disabled])').forEach((radio) => {
      radio.addEventListener('change', () => {
        updateFormState('step2', field, radio.value);
        renderStep2();
      });
    });
  });

  stepContent.querySelector('#btn-step2-prev').addEventListener('click', () => goToStep(1));
  stepContent.querySelector('#btn-step2-next').addEventListener('click', () => goToStep(3));
}

// =============================================================================
// Step 3：系统状态
// =============================================================================

function renderStep3() {
  const answers = appState.step3Answers || {};

  const conflicts = validateStep2Answers(appState.step2Answers);
  const conflictsHtml = conflicts.length > 0
    ? `<div class="conflict-alert">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <div class="conflict-list">
          <strong>输入存在冲突，请修正后再生成结果：</strong>
          ${conflicts.map((conflict) => `<p class="conflict-item">${String(conflict.message).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>`).join('')}
        </div>
      </div>`
    : '';

  const fields = step3Questions.map((q) => {
    const currentValue = answers[q.key];
    const options = q.options.map((opt) => {
      const checked = currentValue === opt.value ? 'checked' : '';
      return `<label class="radio-label"><input type="radio" name="${q.key}" value="${opt.value}" ${checked}> ${opt.label}</label>`;
    }).join('');
    return `
      <div class="form-field">
        <p class="field-label">${q.label}</p>
        <div class="radio-group" data-field="${q.key}">${options}</div>
      </div>
    `;
  }).join('');

  stepContent.innerHTML = `
    <div class="step-panel">
      <h2>近期变更与系统状态</h2>
      <p class="step-desc">请确认以下系统状态和近期变更信息。</p>
      ${conflictsHtml}
      <div class="form-fields">${fields}</div>
      <div class="step-actions">
        <button type="button" class="btn-secondary" id="btn-step3-prev">← 上一步</button>
        <button type="button" class="btn-primary" id="btn-step3-next" ${conflicts.length > 0 ? 'disabled' : ''}>确认</button>
      </div>
    </div>
  `;

  stepContent.querySelectorAll('.radio-group').forEach((group) => {
    const field = group.dataset.field;
    group.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        updateFormState('step3', field, radio.value);
      });
    });
  });

  stepContent.querySelector('#btn-step3-prev').addEventListener('click', () => goToStep(2));
  stepContent.querySelector('#btn-step3-next').addEventListener('click', generateResult);
}

// =============================================================================
// 结果视图
// =============================================================================

function renderResultView() {
  stepContent.innerHTML = '';

  if (appState.isResultDirty) {
    resultContainer.innerHTML = `
      <div class="result-dirty-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <span>输入已变化，请重新生成诊断结果。</span>
        <button type="button" class="btn-primary" id="btn-regenerate">重新生成</button>
      </div>
    `;
    resultContainer.querySelector('#btn-regenerate').addEventListener('click', regenerateResult);
  } else if (appState.result) {
    resultContainer.innerHTML = renderDiagnosticResult(appState.result);
    bindDirectionExpandControls(resultContainer);
    resultContainer.querySelector('#btn-result-back-edit')?.addEventListener('click', () => {
      returnToSystemStatus(appState);
      renderView();
    });
    const pdfButton = resultContainer.querySelector('#btn-export-pdf-report');
    pdfButton?.addEventListener('click', () => handlePdfExport(pdfButton));
  } else {
    resultContainer.innerHTML = '<p class="empty-result">暂无诊断结果。</p>';
  }
}

async function handlePdfExport(button) {
  if (!appState.result) return;

  const status = resultContainer.querySelector('#pdf-export-status');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = '正在生成…';
  if (status) {
    status.textContent = '';
    status.classList.remove('error');
  }

  try {
    await downloadDiagnosticPdf({
      result: appState.result,
      inputSummary: appState.result.inputSummary
    });
    if (status) status.textContent = 'PDF 已完成下载。';
  } catch {
    if (status) {
      status.textContent = 'PDF 生成失败，请稍后重试。';
      status.classList.add('error');
    }
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

// =============================================================================
// 案例加载
// =============================================================================

function loadCaseInputs(caseInput) {
  appState.primaryAnomaly = caseInput.primaryAnomaly;
  appState.step2Answers = { ...caseInput.step2Answers };
  if (Array.isArray(caseInput.step2Answers?.peakLocations)) {
    appState.step2Answers.peakLocations = [...caseInput.step2Answers.peakLocations];
  }
  appState.step3Answers = { ...caseInput.step3Answers };
  appState.isConfirmed = true;
  appState.isResultDirty = false;
  appState.currentStep = 'result';
  appState.result = diagnoseHplcIssueV2({
    primaryAnomaly: appState.primaryAnomaly,
    step2Answers: appState.step2Answers,
    step3Answers: appState.step3Answers
  });
  navLinks.forEach((link) => link.classList.remove('active'));
  document.querySelector('.nav-item[data-section="diagnosis"]')?.classList.add('active');
  renderView();
}

function setActiveNav(section) {
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.section === section);
  });
}

function beginNewDiagnosis() {
  startNewDiagnosis(appState);
  setActiveNav('diagnosis');
  renderView();
}

function renderOverviewView() {
  stepIndicator.hidden = true;
  stepIndicator.innerHTML = '';
  stepContent.innerHTML = getOverviewMarkup();
  resultContainer.innerHTML = '';
  bindOverviewActions(stepContent, {
    onStart: beginNewDiagnosis
  });
}

// =============================================================================
// 主渲染
// =============================================================================

function renderView() {
  if (appState.currentStep === 'overview') {
    renderOverviewView();
    return;
  }

  stepIndicator.hidden = false;
  renderStepIndicator();

  if (appState.currentStep === 'result') {
    renderResultView();
  } else if (appState.currentStep === 1) {
    renderStep1();
    resultContainer.innerHTML = '';
  } else if (appState.currentStep === 2) {
    renderStep2();
    resultContainer.innerHTML = '';
  } else if (appState.currentStep === 3) {
    renderStep3();
    resultContainer.innerHTML = '';
  }
}

// =============================================================================
// 导航栏
// =============================================================================

// Case information
if (caseInfoButton && caseInfoDialog) {
  caseInfoButton.addEventListener('click', (e) => {
    e.preventDefault();
    caseInfoDialog.showModal();
  });
}

document.querySelector('#btn-close-case-info')?.addEventListener('click', () => {
  caseInfoDialog?.close();
});

document.querySelector('#btn-load-built-in-case')?.addEventListener('click', () => {
  loadCaseInputs(demoCaseA);
  caseInfoDialog?.close();
});

// Start diagnosis nav item
const diagNav = document.querySelector('.nav-item[data-section="diagnosis"]');
if (diagNav) {
  diagNav.addEventListener('click', (e) => {
    e.preventDefault();
    if (appState.currentStep === 1 && appState.primaryAnomaly === null) return;
    beginNewDiagnosis();
  });
}

const overviewNav = document.querySelector('.nav-item[data-section="overview"]');
if (overviewNav) {
  overviewNav.addEventListener('click', (e) => {
    e.preventDefault();
    showOverview(appState);
    setActiveNav('overview');
    renderView();
  });
}

// Initial render
setActiveNav('overview');
renderView();
