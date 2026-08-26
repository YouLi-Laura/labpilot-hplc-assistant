import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("../../src/ui/styles.css", import.meta.url), "utf8");

const overviewModule = await import("../../src/ui/overviewView.js").catch(() => ({
  getOverviewMarkup: () => "",
  bindOverviewActions: null,
}));

test("renders a task-focused overview without case loading or version scope copy", () => {
  const html = overviewModule.getOverviewMarkup();

  assert.match(html, /面对 HPLC 异常，下一步该查什么？/);
  assert.match(html, />开始异常排查</);
  assert.match(html, /选择异常类型并开始结构化排查。/);
  assert.doesNotMatch(html, /未知杂峰出现后/);
  assert.doesNotMatch(html, />开始未知杂峰排查</);
  assert.doesNotMatch(html, /选择未知杂峰并开始结构化排查。/);
  assert.doesNotMatch(html, /把实验室观察转化为可执行的排查路径/);
  assert.equal((html.match(/id="btn-overview-start"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /id="btn-overview-load-case"/);
  assert.doesNotMatch(html, /加载内置案例/);
  assert.doesNotMatch(html, /V1 当前开放/);
  assert.doesNotMatch(html, /当前已开放/);
  assert.doesNotMatch(html, /overview-scope-card/);
  assert.match(html, /选择异常/);
  assert.match(html, /异常详情/);
  assert.match(html, /系统状态/);
  assert.match(html, /排查结果/);
  assert.match(html, /优先级/);
  assert.doesNotMatch(html, /证据支持度/);
  assert.equal((html.match(/<strong>决策依据<\/strong>/g) ?? []).length, 1);
  assert.match(html, /操作后判断/);
  assert.match(html, /异常改善或消失/);
  assert.match(html, /异常仍然存在/);
  assert.match(html, /PDF 报告/);
  assert.match(html, /不替代 SOP、QA、偏差调查或质量结论/);
  assert.doesNotMatch(html, /已完成案例|平均提效|近期记录|趋势图/);
});

test("binds only the overview start action", () => {
  assert.equal(typeof overviewModule.bindOverviewActions, "function");

  const listeners = new Map();
  const buttons = {
    "#btn-overview-start": {
      addEventListener(type, handler) { listeners.set(`start:${type}`, handler); },
    },
  };
  const container = {
    querySelector(selector) { return buttons[selector] ?? null; },
  };
  let startCalls = 0;

  overviewModule.bindOverviewActions(container, {
    onStart: () => { startCalls += 1; },
  });
  listeners.get("start:click")();

  assert.equal(startCalls, 1);
  assert.equal(listeners.has("case:click"), false);
});

test("provides a responsive overview layout without horizontal action overflow", () => {
  assert.match(styles, /\.overview-step-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(styles, /\.overview-lower-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.35fr\)\s+minmax\(260px,\s*0\.65fr\)/s);
  assert.match(styles, /\.overview-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(
    styles,
    /@media\s*\(max-width:\s*680px\)[\s\S]*?\.overview-step-grid,[\s\S]*?\.overview-lower-grid\s*\{[^}]*grid-template-columns:\s*1fr/
  );
});

test("styles overview as a connected workbench flow", () => {
  assert.match(styles, /\.overview-hero\s*\{[^}]*border-top:\s*3px solid var\(--color-accent\)[^}]*box-shadow:/s);
  assert.match(styles, /\.overview-step-grid::before\s*\{[^}]*content:\s*['"]{2}[^}]*height:\s*1px/s);
  assert.match(styles, /\.overview-step-card\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
  assert.match(styles, /\.overview-step-number\s*\{[^}]*border-radius:\s*50%/s);
  assert.match(styles, /\.overview-capability-item\s*\{[^}]*background:\s*#f7f9fc/s);
});
