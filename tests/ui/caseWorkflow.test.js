import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../../src/ui/app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../src/ui/styles.css", import.meta.url), "utf8");

test("provides an accessible case information dialog with only the built-in case action", () => {
  assert.match(indexHtml, /<dialog[^>]*id="case-info-dialog"[^>]*aria-labelledby="case-info-title"/);
  assert.match(indexHtml, /id="case-info-title"[^>]*>案例说明</);
  assert.match(indexHtml, /不包含真实公司、样品、批号或保密数据/);
  assert.match(indexHtml, /id="btn-load-built-in-case"[^>]*>加载内置案例</);
  assert.doesNotMatch(indexHtml, /btn-import-case-file|case-file-input|case-import-status|导入案例文件/);
});

test("opens the case dialog instead of immediately loading the built-in case", () => {
  assert.match(appSource, /const caseInfoButton = document\.querySelector\('#nav-case-info'\)/);
  assert.match(appSource, /caseInfoDialog\.showModal\(\)/);
  assert.doesNotMatch(appSource, /const demoButton = document\.querySelector\('#nav-load-demo'\)/);
});

test("loads the built-in case through the current-rule diagnosis path", () => {
  assert.match(appSource, /function loadCaseInputs\(caseInput\)/);
  assert.match(appSource, /appState\.primaryAnomaly = caseInput\.primaryAnomaly/);
  assert.match(appSource, /appState\.step2Answers = \{ \.\.\.caseInput\.step2Answers \}/);
  assert.match(appSource, /appState\.step3Answers = \{ \.\.\.caseInput\.step3Answers \}/);
  assert.match(appSource, /appState\.result = diagnoseHplcIssueV2\(\{/);
  assert.match(appSource, /loadCaseInputs\(demoCaseA\)/);
  assert.doesNotMatch(appSource, /parseCaseReport|caseFileInput|caseImportStatus|file\.text\(\)|loadCaseInputs\(importedCase\)/);
});

test("wires one PDF export action without print or JSON transfer behavior", () => {
  assert.match(appSource, /querySelector\('#btn-export-pdf-report'\)/);
  assert.match(appSource, /downloadDiagnosticPdf\(\{/);
  assert.match(appSource, /button\.disabled = true/);
  assert.match(appSource, /button\.textContent = '正在生成…'/);
  assert.match(appSource, /PDF 已完成下载。/);
  assert.doesNotMatch(appSource, /PDF 已开始下载。/);
  assert.match(appSource, /PDF 生成失败，请稍后重试。/);
  assert.match(appSource, /finally\s*\{[\s\S]*button\.disabled = false/);
  assert.doesNotMatch(appSource, /window\.print\(\)|btn-export-case-json|downloadCaseReport|createCaseReport|serializeCaseReport|application\/json/);
});

test("styles the modal as a restrained blue-gray B2B panel", () => {
  assert.match(styles, /\.case-info-dialog\s*\{[^}]*border:\s*1px solid var\(--color-border\)/);
  assert.match(styles, /\.case-dialog-actions\s*\{[^}]*display:\s*flex/);
  assert.doesNotMatch(styles, /case-file-input|case-import-status/);
});

test("centers the case information dialog in the viewport", () => {
  const dialogRule = styles.match(/\.case-info-dialog\s*\{([^}]*)\}/)?.[1] || "";

  assert.match(dialogRule, /position:\s*fixed/);
  assert.match(dialogRule, /inset:\s*0/);
  assert.match(dialogRule, /margin:\s*auto/);
  assert.match(dialogRule, /overflow:\s*auto/);
});
