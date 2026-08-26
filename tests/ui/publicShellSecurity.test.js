import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../src/ui/styles.css", import.meta.url), "utf8");

test("the public shell executes only its self-hosted external module", () => {
  const scripts = [...indexHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];

  assert.equal(scripts.length, 1);
  assert.match(scripts[0][1], /\btype=["']module["']/i);
  assert.match(scripts[0][1], /\bsrc=["']\.\/src\/ui\/app\.js\?v=[^"']+["']/i);
  assert.equal(scripts[0][2].trim(), "");
  assert.doesNotMatch(indexHtml, /https?:\/\/|\/\//i);
  assert.doesNotMatch(indexHtml, /\blucide\b|data-lucide/i);
});

test("the public shell declares a restrictive CSP without inline script or style allowances", () => {
  const cspMeta = indexHtml.match(
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i
  );

  assert.ok(cspMeta, "expected a Content-Security-Policy meta tag");
  assert.match(cspMeta[1], /(?:^|;)\s*default-src\s+'self'\s*(?:;|$)/);
  assert.match(cspMeta[1], /(?:^|;)\s*script-src\s+'self'\s*(?:;|$)/);
  assert.match(cspMeta[1], /(?:^|;)\s*style-src\s+'self'\s*(?:;|$)/);
  assert.match(cspMeta[1], /(?:^|;)\s*object-src\s+'none'\s*(?:;|$)/);
  assert.match(cspMeta[1], /(?:^|;)\s*base-uri\s+'none'\s*(?:;|$)/);
  assert.doesNotMatch(cspMeta[1], /'unsafe-inline'|'unsafe-eval'|https?:|\*/);
  assert.doesNotMatch(indexHtml, /<style\b|\sstyle\s*=/i);
});

test("all four sidebar navigation icons are local decorative SVGs", () => {
  const navIcons = indexHtml.match(/<svg\b[^>]*class=["']nav-icon-svg["'][^>]*>/gi) ?? [];

  assert.equal(navIcons.length, 4);
  for (const icon of navIcons) {
    assert.match(icon, /\baria-hidden=["']true["']/i);
    assert.match(icon, /\bfocusable=["']false["']/i);
    assert.match(icon, /\bviewBox=["']0 0 24 24["']/i);
  }
});

test("overview is an enabled navigation destination while future modules stay disabled", () => {
  const overviewItem = indexHtml.match(/<a\b[^>]*class=["'][^"']*nav-item[^"']*["'][^>]*data-section=["']overview["'][^>]*>/i);
  const recordsItem = indexHtml.match(/<a\b[^>]*class=["'][^"']*nav-item[^"']*["'][^>]*data-section=["']records["'][^>]*>/i);
  const knowledgeItem = indexHtml.match(/<a\b[^>]*class=["'][^"']*nav-item[^"']*["'][^>]*data-section=["']knowledge["'][^>]*>/i);

  assert.ok(overviewItem);
  assert.match(overviewItem[0], /data-available=["']true["']/i);
  assert.doesNotMatch(overviewItem[0], /\bdisabled\b/i);
  assert.doesNotMatch(
    indexHtml.slice(overviewItem.index, indexHtml.indexOf("</a>", overviewItem.index)),
    /即将上线/
  );
  assert.match(recordsItem?.[0] ?? "", /\bdisabled\b/i);
  assert.match(knowledgeItem?.[0] ?? "", /\bdisabled\b/i);
});

test("responsive option layout is external and public shell asset URLs are refreshed", () => {
  assert.match(
    styles,
    /@media\s*\(min-width:\s*681px\)[\s\S]*?\.radio-group\.inline-options,[\s\S]*?\.checkbox-group\.inline-options\s*\{[\s\S]*?flex-direction:\s*row\s*!important;[\s\S]*?flex-wrap:\s*wrap\s*!important;[\s\S]*?gap:\s*4px\s+32px\s*!important;/
  );

  const styleAssetVersion = "priority-basis-20260826-r20";
  const appAssetVersion = "priority-basis-20260826-r20";
  assert.ok(indexHtml.includes(`styles.css?v=${styleAssetVersion}`));
  assert.ok(indexHtml.includes(`app.js?v=${appAssetVersion}`));
});
