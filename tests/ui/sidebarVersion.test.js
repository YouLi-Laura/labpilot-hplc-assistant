import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../src/ui/styles.css", import.meta.url), "utf8");

test("renders the case information entry above the static version metadata", () => {
  assert.match(
    indexHtml,
    /<button[^>]*id="nav-case-info"[^>]*>案例说明<\/button>[\s\S]*?<div class="sidebar-version" aria-label="版本信息">[\s\S]*?<span class="sidebar-version-name">LabPilot V1\.0<\/span>[\s\S]*?<time class="sidebar-version-date" datetime="2026-08-08">发布日期 2026-08-08<\/time>[\s\S]*?<span class="sidebar-version-author">You\.Li<\/span>[\s\S]*?<\/div>/
  );
  assert.doesNotMatch(indexHtml, /加载虚构演示案例/);
  assert.doesNotMatch(indexHtml, /LabPilot V1\.0 Demo/);
  assert.doesNotMatch(indexHtml, /<(?:button|a)[^>]*class="[^"]*sidebar-version/);
});

test("styles the version label as muted, non-floating sidebar metadata", () => {
  const versionRule = styles.match(/\.sidebar-version\s*\{([^}]*)\}/);
  assert.ok(versionRule, "expected a .sidebar-version rule");
  assert.match(versionRule[1], /display:\s*grid/);
  assert.match(versionRule[1], /margin-top:\s*12px/);
  assert.doesNotMatch(versionRule[1], /position:\s*(?:fixed|sticky)/);
  assert.match(styles, /#nav-case-info\s*\{[^}]*width:\s*100%/);
  assert.match(styles, /\.sidebar-version-name\s*\{[^}]*font-weight:\s*600/);
  assert.match(styles, /\.sidebar-version-date,\s*\.sidebar-version-author\s*\{[^}]*color:\s*#8b95a3/);
});
