import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../src/ui/styles.css", import.meta.url), "utf8");

test("uses the approved professional workbench shell", () => {
  assert.match(indexHtml, /class="sidebar-brand-lockup"/);
  assert.match(indexHtml, /class="sidebar-logo-mark"[^>]*aria-hidden="true"[^>]*>LP</);
  assert.match(styles, /--color-sidebar:\s*#152238/);
  assert.match(styles, /--color-workspace:\s*#eef2f6/);
  assert.match(styles, /--shadow-overlay:\s*0 24px 70px/);
  assert.match(styles, /\.sidebar\s*\{[^}]*width:\s*232px/s);
  assert.match(styles, /\.main-content\s*\{[^}]*max-width:\s*1180px[^}]*margin:\s*0 auto/s);
});

test("keeps existing navigation and ownership metadata", () => {
  assert.match(indexHtml, /data-section="overview"/);
  assert.match(indexHtml, /id="nav-case-info"/);
  assert.match(indexHtml, /LabPilot V1\.0/);
  assert.match(indexHtml, /You\.Li/);
});

test("uses a compact workflow and full-row form affordances", () => {
  assert.match(styles, /\.step-indicator\s*\{[^}]*border:\s*1px solid var\(--color-border\)[^}]*border-radius:/s);
  assert.match(styles, /\.form-fields\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.doesNotMatch(styles, /\.form-fields\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(styles, /\.form-field\s*\{[^}]*padding:\s*16px 18px/s);
  assert.match(styles, /\.radio-label:hover,[\s\S]*?\.checkbox-label:hover\s*\{[^}]*background:\s*var\(--color-accent-light\)/s);
  assert.match(styles, /\.radio-label,\s*\.checkbox-label\s*\{[^}]*gap:\s*10px/s);
  assert.match(
    styles,
    /@media\s*\(min-width:\s*681px\)[\s\S]*?\.radio-group\.inline-options,[\s\S]*?\.checkbox-group\.inline-options\s*\{[^}]*gap:\s*4px 32px\s*!important;/
  );
  assert.match(styles, /\.sticky-step-actions\s*\{[^}]*border-top:\s*1px solid var\(--color-border\)/s);
});

test("keeps result hierarchy and disclosure semantics visually explicit", () => {
  assert.match(styles, /#result-container\s*\{[^}]*max-width:\s*none/s);
  assert.match(styles, /\.result-toolbar\s*\{[^}]*padding:\s*18px 20px[^}]*background:\s*var\(--color-surface\)/s);
  assert.match(styles, /\.direction-card:first-child\s*\{[^}]*border-top:\s*3px solid var\(--color-accent\)/s);
  assert.match(styles, /\.direction-collapsible\s*\{[^}]*box-shadow:\s*none/s);
  assert.match(styles, /\.direction-evidence-summary\s*\{[^}]*min-height:\s*64px/s);
  assert.match(styles, /\.direction-evidence\[open\]\s+\.direction-evidence-chevron\s*\{[^}]*rotate\(90deg\)/s);
  assert.doesNotMatch(styles, /direction-evidence-icon/);
  assert.doesNotMatch(styles, /\.confidence-badge|\.confidence-high|\.confidence-mid|\.confidence-low/);
});

test("defines desktop tablet mobile and PDF-safe boundaries", () => {
  assert.match(styles, /\.case-info-dialog\s*\{[^}]*margin:\s*auto[^}]*box-shadow:\s*var\(--shadow-overlay\)/s);
  assert.match(styles, /@media\s*\(max-width:\s*1100px\)/);
  assert.match(styles, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.form-fields\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(styles, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.overview-step-grid::before\s*\{[^}]*display:\s*none/s);
  assert.match(styles, /\.pdf-export-source\s*\{[^}]*--color-workspace:\s*#fff/s);
  assert.match(styles, /\.pdf-export-source\s+\.direction-card,\s*\.pdf-export-source\s+\.other-direction\s*\{[^}]*box-shadow:\s*none/s);
});

test("keeps mobile navigation limited to the two usable destinations", () => {
  assert.match(styles, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.sidebar-nav\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(styles, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.sidebar-nav li:has\(\.nav-item\.disabled\)\s*\{[^}]*display:\s*none/s);
  assert.match(styles, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.sidebar-nav \.nav-item\s*\{[^}]*white-space:\s*nowrap/s);
});

test("removes the empty workflow indicator from the overview", () => {
  assert.match(styles, /\.step-indicator:empty\s*\{[^}]*display:\s*none/s);
});
