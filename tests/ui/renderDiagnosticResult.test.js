import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diagnoseHplcIssueV2 } from "../../src/engine/diagnoseHplcIssue.js";
import * as resultUi from "../../src/ui/renderDiagnosticResult.js";

const { escapeHtml, normalizeDisplayCopy, renderDiagnosticResult, renderPrintableInputSummary } = resultUi;

const fakeResult = {
  inputSummary: {
    primaryAnomalyLabel: "未知杂峰",
    step2Summary: {
      peakLocations: { question: "未知峰出现在哪些位置？", answer: "Blank、Standard、Sample" }
    },
    step3Summary: {
      systemSuitabilityPassed: { question: "SST 是否通过？", answer: "未通过" }
    }
  },
  riskLevel: "高",
  complianceBanner: {
    level: "stop",
    message: "建议暂停样品结果报告并升级处理。"
  },
  topDirections: [
    {
      priority: 1,
      confidence: "较高",
      title: "测试排查方向",
      evidence: [{ field: "test", label: "测试证据", value: "是" }],
      rationale: "测试依据",
      actions: "测试操作",
      resultJudgment: {
        ifResolved: "已解决",
        ifNotResolved: "未解决"
      },
      nextSteps: "下一步测试",
      stopCondition: null
    }
  ],
  otherDirections: [],
  disclaimer: "本结果仅为 HPLC 实验室异常排查辅助原型。"
};

test("escapes HTML before rendering user-controlled text", () => {
  assert.equal(escapeHtml("<script>alert('x')</script>"), "&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;");
});

test("normalizes accidental repeated sentence punctuation", () => {
  assert.equal(normalizeDisplayCopy("请检查两个。。变量。。"), "请检查两个。变量。");
  assert.equal(normalizeDisplayCopy("建议复核．．条件"), "建议复核。条件");
});

test("renders diagnostic guidance without repeating the collected input summary", () => {
  const html = renderDiagnosticResult(fakeResult);
  const alternateRiskHtml = renderDiagnosticResult({ ...fakeResult, riskLevel: "中" });

  assert.ok(!html.includes('class="result-section summary-section"'));
  assert.ok(!html.includes("问题摘要"));
  assert.ok(!html.includes("主要异常"));
  assert.ok(!html.includes("未知杂峰"));
  assert.ok(!html.includes("未知峰出现在哪些位置？"));
  assert.ok(!html.includes("SST 是否通过？"));
  assert.ok(html.includes("风险等级"));
  assert.ok(html.includes("优先排查方向"));
  assert.ok(html.includes("优先级表示建议的排查先后顺序"));
  assert.ok(html.includes("证据支持：较高"));
  assert.ok(html.includes("决策依据"));
  assert.ok(html.includes("系统综合 1 项关键观察形成此排查方向"));
  assert.ok(html.includes("查看推理依据"));
  assert.ok(html.includes("已纳入本次判断的关键观察"));
  assert.ok(html.includes("测试证据"));
  assert.ok(!html.includes("本建议基于以下输入"));
  assert.ok(html.includes("判断依据"));
  assert.ok(html.includes("建议暂停样品结果报告并升级处理"));
  assert.ok(html.includes('class="compliance-banner__content"'));
  assert.ok(html.includes('class="compliance-banner__risk"'));
  assert.ok(html.includes('<strong class="compliance-banner__risk-value">高</strong>'));
  assert.ok(alternateRiskHtml.includes('<strong class="compliance-banner__risk-value">中</strong>'));
  assert.ok(html.includes("执行后如何判断"));
  assert.ok(html.includes("完成上述建议操作后，根据新实验现象选择对应的下一步"));
  assert.ok(html.includes("若异常改善或消失"));
  assert.ok(html.includes("若异常仍然存在"));
  assert.ok(html.includes("本结果仅为 HPLC 实验室异常排查辅助原型"));
});

test("omits reasoning evidence disclosure when evidence is empty", () => {
  const result = {
    ...fakeResult,
    topDirections: [{ ...fakeResult.topDirections[0], evidence: [] }],
  };
  const html = renderDiagnosticResult(result);

  assert.ok(!html.includes("系统综合 0 项关键观察"));
  assert.ok(!html.includes("查看推理依据"));
});

test("renders evidence as a standard disclosure without a radio-like icon", () => {
  const html = renderDiagnosticResult(fakeResult);

  assert.ok(html.includes('<details class="direction-evidence">'));
  assert.ok(html.includes('<summary class="direction-evidence-summary">'));
  assert.ok(html.includes('class="direction-evidence-chevron"'));
  assert.ok(html.includes('aria-hidden="true"'));
  assert.ok(!html.includes("direction-evidence-icon"));
  assert.ok(html.includes("决策依据"));
  assert.ok(html.includes("系统综合 1 项关键观察形成此排查方向"));
  assert.ok(html.includes("查看推理依据"));
  assert.ok(html.includes("已纳入本次判断的关键观察"));
  assert.ok(html.includes("测试证据"));
});

test("renders collapsed direction controls without CSP-blocked inline event handlers", () => {
  const secondDirection = {
    ...fakeResult.topDirections[0],
    priority: 2,
    title: "第二排查方向",
    summaryLine: "第二方向摘要",
  };
  const html = renderDiagnosticResult({
    ...fakeResult,
    topDirections: [fakeResult.topDirections[0], secondDirection],
  });

  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.match(
    html,
    /<button type="button" class="direction-expand-btn" aria-expanded="false" aria-controls="direction-2-details">/
  );
  assert.ok(html.includes('<span class="direction-expand-label">展开详情</span>'));
  assert.ok(html.includes('<div class="direction-body-collapse" id="direction-2-details">'));
});

test("external result binding toggles direction details, label, and ARIA state", () => {
  assert.equal(typeof resultUi.bindDirectionExpandControls, "function");

  const listeners = new Map();
  const attributes = new Map([["aria-expanded", "false"]]);
  const classes = new Set(["direction-collapsible"]);
  const label = { textContent: "展开详情" };
  const card = {
    classList: {
      toggle(name) {
        if (classes.has(name)) {
          classes.delete(name);
          return false;
        }
        classes.add(name);
        return true;
      },
      contains(name) {
        return classes.has(name);
      },
    },
  };
  const button = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    closest(selector) {
      return selector === ".direction-collapsible" ? card : null;
    },
    querySelector(selector) {
      return selector === ".direction-expand-label" ? label : null;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
  const container = {
    querySelectorAll(selector) {
      return selector === ".direction-expand-btn" ? [button] : [];
    },
  };

  resultUi.bindDirectionExpandControls(container);
  assert.equal(typeof listeners.get("click"), "function");

  listeners.get("click")();
  assert.equal(card.classList.contains("expanded"), true);
  assert.equal(attributes.get("aria-expanded"), "true");
  assert.equal(label.textContent, "收起详情");

  listeners.get("click")();
  assert.equal(card.classList.contains("expanded"), false);
  assert.equal(attributes.get("aria-expanded"), "false");
  assert.equal(label.textContent, "展开详情");
});

test("the result view wires the external direction expansion binding", () => {
  const appSource = readFileSync(new URL("../../src/ui/app.js", import.meta.url), "utf8");

  assert.ok(appSource.includes("bindDirectionExpandControls(resultContainer)"));
});

test("cache-busts every asset involved in the evidence disclosure UI", () => {
  const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const appSource = readFileSync(new URL("../../src/ui/app.js", import.meta.url), "utf8");
  const engineSource = readFileSync(new URL("../../src/engine/diagnoseHplcIssue.js", import.meta.url), "utf8");
  const navigationSource = readFileSync(new URL("../../src/ui/navigationState.js", import.meta.url), "utf8");
  const styleAssetVersion = "form-option-spacing-20260812-r19";
  const appAssetVersion = "diagnosis-pdf-pagination-20260811-r18";
  const resultModuleVersion = "direct-pdf-20260809-r10";
  const reportPdfModuleVersion = "diagnosis-pdf-pagination-20260811-r18";
  const navigationModuleVersion = "overview-workbench-20260809-r13";
  const overviewModuleVersion = "overview-generic-copy-20260810-r17";
  const logicAssetVersion = "evidence-support-20260808-r3";

  assert.ok(indexHtml.includes(`styles.css?v=${styleAssetVersion}`));
  assert.ok(indexHtml.includes(`app.js?v=${appAssetVersion}`));
  assert.ok(appSource.includes(`renderDiagnosticResult.js?v=${resultModuleVersion}`));
  assert.ok(appSource.includes(`reportPdf.js?v=${reportPdfModuleVersion}`));
  assert.ok(!appSource.includes("caseReport.js"));
  assert.ok(appSource.includes(`navigationState.js?v=${navigationModuleVersion}`));
  assert.ok(appSource.includes(`overviewView.js?v=${overviewModuleVersion}`));
  assert.ok(appSource.includes(`diagnoseHplcIssue.js?v=${logicAssetVersion}`));
  assert.ok(engineSource.includes(`diagnosticDirections.js?v=${logicAssetVersion}`));
  assert.ok(navigationSource.includes("returnToSystemStatus"));
});

test("renders a return-to-edit action on the result page", () => {
  const html = renderDiagnosticResult(fakeResult);

  assert.ok(html.includes('id="btn-result-back-edit"'));
  assert.ok(html.includes("← 返回修改"));
  assert.ok(!html.includes("btn-result-back-confirm"));
  assert.ok(!html.includes("返回确认页"));
});

test("renders only the PDF export action without restoring the screen summary", () => {
  const html = renderDiagnosticResult(fakeResult);

  assert.ok(html.includes('id="btn-export-pdf-report"'));
  assert.ok(html.includes("导出 PDF 报告"));
  assert.ok(html.includes('id="pdf-export-status"'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(!html.includes('id="btn-export-case-json"'));
  assert.ok(!html.includes("导出案例文件"));
  assert.ok(!html.includes('id="print-report-summary"'));
  assert.ok(!html.includes("问题摘要"));
});

test("renders an escaped input summary only for the temporary printable report", () => {
  const html = renderPrintableInputSummary({
    primaryAnomalyLabel: "未知杂峰<script>",
    step2Summary: {
      peakLocations: { question: "出现位置？", answer: "Blank & Sample" }
    },
    step3Summary: {
      systemSuitabilityPassed: { question: "SST？", answer: "未通过" }
    }
  }, "2026-08-09 14:30:05");

  assert.ok(html.includes('id="print-report-summary"'));
  assert.ok(html.includes("HPLC 异常排查报告"));
  assert.ok(html.includes("案例输入记录"));
  assert.ok(html.includes("2026-08-09 14:30:05"));
  assert.ok(html.includes("未知杂峰&lt;script&gt;"));
  assert.ok(html.includes("Blank &amp; Sample"));
  assert.ok(!html.includes("<script>"));
});

test("renders v2 result with compliance banner", () => {
  const v2Result = diagnoseHplcIssueV2({
    primaryAnomaly: "unknown_impurity_peak",
    step2Answers: {
      peakLocations: ["Blank", "Sample"],
      hasFixedRT: "yes",
      firstBlankAppears: "appearObvious",
      repeatedInjection: "everyTime",
      blankTrend: "stable",
      blankAfterHighConcFirst: "similarToFirst",
      repeatInjectionAreaStable: "yes",
      variesWithConc: "no",
      relatedToPrevHighConc: "no",
      sampleOccurrenceScope: "allSamples",
      areaChangesWithTime: "notTested"
    },
    step3Answers: {
      systemSuitabilityPassed: "failed",
      mobilePhaseRemadeRecently: "yes",
      solventOrReagentBatchChanged: "yes"
    }
  });

  assert.equal(v2Result.riskLevel, "高");
  assert.equal(v2Result.topDirections.length, 3);
  assert.ok(v2Result.complianceBanner.message.includes("暂停样品结果报告"));

  const html = renderDiagnosticResult(v2Result);
  assert.ok(html.includes("优先 1"));
  assert.ok(html.includes("较高") || html.includes("中等") || html.includes("较低"));
});
