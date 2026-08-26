import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const moduleUrl = new URL("../../src/ui/reportPdf.js", import.meta.url);
const stylesUrl = new URL("../../src/ui/styles.css", import.meta.url);
const vendorUrl = new URL("../../src/vendor/html2pdf.bundle.min.js", import.meta.url);
const licenseUrl = new URL("../../src/vendor/html2pdf.LICENSE.txt", import.meta.url);
const moduleExists = existsSync(moduleUrl);

test("provides a dedicated direct-download PDF module and pinned local assets", () => {
  assert.equal(moduleExists, true);
  assert.equal(existsSync(vendorUrl), true);
  assert.equal(existsSync(licenseUrl), true);
});

if (moduleExists) {
  const {
    buildPdfExportMarkup,
    buildPdfReportFilename,
    downloadDiagnosticPdf,
    trimTrailingCanvasWhitespace
  } = await import(moduleUrl);

  const fakeResult = {
    riskLevel: "中",
    riskReasons: ["需要复核"],
    complianceBanner: null,
    topDirections: [{
      priority: 1,
      title: "排查流动相污染",
      confidence: "较高",
      evidence: ["Blank 中出现未知峰"],
      rationale: "观察支持该方向。",
      actions: "单变量复核。",
      resultJudgment: {
        ifResolved: "继续定位。",
        ifNotResolved: "转入系统流路排查。"
      },
      nextSteps: "记录结果。"
    }],
    otherDirections: [],
    disclaimer: "不替代 SOP。"
  };

  const fakeInputSummary = {
    primaryAnomalyLabel: "未知杂峰<script>",
    step2Summary: {
      peakLocations: { question: "出现位置？", answer: "Blank & Sample" }
    },
    step3Summary: {}
  };

  test("builds a stable PDF filename", () => {
    assert.equal(
      buildPdfReportFilename("2026-08-09T10:11:12.000Z"),
      "labpilot-unknown-peak-20260809-101112.pdf"
    );
  });

  test("builds a full escaped report without screen controls", () => {
    const html = buildPdfExportMarkup({
      result: fakeResult,
      inputSummary: fakeInputSummary,
      generatedAt: "2026-08-09T10:11:12.000Z"
    });

    assert.match(html, /HPLC 异常排查报告/);
    assert.match(html, /未知杂峰&lt;script&gt;/);
    assert.match(html, /Blank &amp; Sample/);
    assert.match(html, /排查流动相污染/);
    assert.match(html, /决策依据/);
    assert.doesNotMatch(html, /证据支持：|confidence-badge/);
    assert.doesNotMatch(html, /btn-result-back-edit|btn-export-pdf-report|btn-export-case-json/);
  });

  test("keeps the cloned PDF source at neutral coordinates inside an off-screen host", () => {
    const moduleSource = readFileSync(moduleUrl, "utf8");
    const styles = readFileSync(stylesUrl, "utf8");
    const hostRule = styles.match(/\.pdf-export-host\s*\{([^}]*)\}/)?.[1] || "";
    const sourceRule = styles.match(/\.pdf-export-source\s*\{([^}]*)\}/)?.[1] || "";

    assert.match(moduleSource, /exportHost\.append\(exportSource\)/);
    assert.match(moduleSource, /\.from\(exportSource\)/);
    assert.match(moduleSource, /exportHost\.remove\(\)/);
    assert.match(hostRule, /position:\s*fixed/);
    assert.match(hostRule, /left:\s*-12000px/);
    assert.doesNotMatch(sourceRule, /position:\s*fixed|left:\s*-\d+px/);
  });

  test("fits the PDF source within the printable A4 content width", () => {
    const styles = readFileSync(stylesUrl, "utf8");
    const sourceRule = styles.match(/\.pdf-export-source\s*\{([^}]*)\}/)?.[1] || "";

    assert.match(sourceRule, /width:\s*100%/);
    assert.match(sourceRule, /max-width:\s*100%/);
    assert.match(sourceRule, /padding:\s*24px 24px 0/);
    assert.doesNotMatch(sourceRule, /width:\s*794px/);
  });

  test("starts every direction on a fresh page and keeps each card intact", () => {
    const styles = readFileSync(stylesUrl, "utf8");
    const directionRule = styles.match(
      /\.pdf-export-source \.direction-card,\s*\.pdf-export-source \.other-direction\s*\{([^}]*)\}/
    )?.[1] || "";

    assert.match(directionRule, /break-before:\s*page/);
    assert.match(directionRule, /page-break-before:\s*always/);
    assert.match(directionRule, /break-inside:\s*avoid/);
    assert.match(directionRule, /page-break-inside:\s*avoid/);
  });

  test("hides the native disclosure marker in the PDF report", () => {
    const styles = readFileSync(stylesUrl, "utf8");

    assert.match(
      styles,
      /\.pdf-export-source \.other-directions summary\s*\{[^}]*list-style:\s*none/
    );
    assert.match(
      styles,
      /\.pdf-export-source \.other-directions summary::marker\s*\{[^}]*content:\s*['"]['"]/
    );
    assert.match(
      styles,
      /\.pdf-export-source \.other-directions summary::-webkit-details-marker\s*\{[^}]*display:\s*none/
    );
  });

  test("trims only trailing white canvas rows before PDF pagination", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 255, 255, 255, 255,
      20, 20, 20, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255
    ]);
    const sourceCanvas = {
      width: 2,
      height: 4,
      getContext() {
        return { getImageData() { return { data: pixels }; } };
      }
    };
    const calls = {};
    const targetContext = { drawImage(canvas, x, y) { calls.draw = { canvas, x, y }; } };
    const targetCanvas = { width: 0, height: 0, getContext() { return targetContext; } };
    const documentRef = { createElement(tag) { assert.equal(tag, "canvas"); return targetCanvas; } };

    const result = trimTrailingCanvasWhitespace(sourceCanvas, documentRef);

    assert.equal(result, targetCanvas);
    assert.equal(result.width, 2);
    assert.equal(result.height, 3);
    assert.deepEqual(calls.draw, { canvas: sourceCanvas, x: 0, y: 0 });
  });

  test("downloads an A4 PDF and always removes the off-screen source", async () => {
    const calls = {};
    const source = {
      className: "",
      innerHTML: "",
      querySelectorAll() { return []; },
      remove() { calls.removed = true; }
    };
    const host = {
      className: "",
      append(node) { calls.hostChild = node; },
      remove() { calls.hostRemoved = true; }
    };
    const link = {
      href: "",
      download: "",
      click() { calls.clicked = true; },
      remove() { calls.linkRemoved = true; }
    };
    const documentRef = {
      createElement(tag) {
        if (tag === "a") return link;
        if (tag === "div") return host;
        return source;
      },
      body: { append(node) { calls.appended = calls.appended || []; calls.appended.push(node); } }
    };
    const renderCanvas = {
      width: 1,
      height: 1,
      getContext() {
        return { getImageData() { return { data: new Uint8ClampedArray([0, 0, 0, 255]) }; } };
      }
    };
    const worker = {
      set(options) {
        if (options.canvas) calls.trimmedCanvas = options.canvas;
        else calls.options = options;
        return this;
      },
      from(node) { calls.source = node; return this; },
      toCanvas() { calls.toCanvas = true; return this; },
      async get(name) { calls.get = name; return renderCanvas; },
      toPdf() { calls.toPdf = true; return this; },
      async outputPdf(type) {
        calls.outputType = type;
        return new Blob(["%PDF-1.4"], { type: "application/pdf" });
      }
    };
    const windowRef = {
      URL: {
        createObjectURL(blob) { calls.blob = blob; return "blob:labpilot-pdf"; },
        revokeObjectURL(url) { calls.revoked = url; }
      },
      setTimeout(callback) { callback(); }
    };

    await downloadDiagnosticPdf({
      result: fakeResult,
      inputSummary: fakeInputSummary,
      generatedAt: "2026-08-09T10:11:12.000Z",
      documentRef,
      windowRef,
      html2pdfFactory: () => worker
    });

    assert.deepEqual(calls.appended, [host, link]);
    assert.equal(calls.hostChild, source);
    assert.equal(calls.source, source);
    assert.equal(calls.toCanvas, true);
    assert.equal(calls.get, "canvas");
    assert.equal(calls.trimmedCanvas, renderCanvas);
    assert.equal(calls.toPdf, true);
    assert.equal(calls.options.filename, "labpilot-unknown-peak-20260809-101112.pdf");
    assert.equal(calls.options.jsPDF.format, "a4");
    assert.deepEqual(calls.options.pagebreak.mode, ["css", "legacy"]);
    assert.deepEqual(calls.options.pagebreak.before, [".direction-card", ".other-direction"]);
    assert.equal(calls.options.pagebreak.avoid.includes(".direction-card"), true);
    assert.equal(calls.options.pagebreak.avoid.includes(".other-direction"), true);
    assert.equal(calls.options.pagebreak.avoid.includes(".result-section"), false);
    assert.equal(calls.options.pagebreak.avoid.includes(".direction-card-header"), true);
    assert.equal(calls.options.pagebreak.avoid.includes(".direction-judgment"), true);
    assert.equal(calls.outputType, "blob");
    assert.equal(calls.blob.type, "application/pdf");
    assert.equal(link.href, "blob:labpilot-pdf");
    assert.equal(link.download, "labpilot-unknown-peak-20260809-101112.pdf");
    assert.equal(calls.clicked, true);
    assert.equal(calls.linkRemoved, true);
    assert.equal(calls.revoked, "blob:labpilot-pdf");
    assert.equal(calls.hostRemoved, true);
  });

  test("removes the off-screen source when PDF generation fails", async () => {
    let removed = false;
    const source = {
      className: "",
      innerHTML: "",
      querySelectorAll() { return []; },
      remove() {}
    };
    const host = {
      className: "",
      append() {},
      remove() { removed = true; }
    };
    const documentRef = {
      createElement(tag) { return tag === "div" ? host : source; },
      body: { append() {} }
    };
    const worker = {
      set() { return this; },
      from() { return this; },
      toCanvas() { return this; },
      async get() {
        return {
          width: 1,
          height: 1,
          getContext() {
            return { getImageData() { return { data: new Uint8ClampedArray([0, 0, 0, 255]) }; } };
          }
        };
      },
      toPdf() { return this; },
      async outputPdf() { throw new Error("pdf failed"); }
    };

    await assert.rejects(
      downloadDiagnosticPdf({
        result: fakeResult,
        inputSummary: fakeInputSummary,
        documentRef,
        windowRef: {},
        html2pdfFactory: () => worker
      }),
      /pdf failed/
    );
    assert.equal(removed, true);
  });

  test("loads the PDF engine only from a versioned local asset", () => {
    const source = readFileSync(moduleUrl, "utf8");
    assert.match(source, /\.\/src\/vendor\/html2pdf\.bundle\.min\.js\?v=direct-pdf-20260809-r10/);
    assert.doesNotMatch(source, /https?:\/\/|window\.print\(/);
  });
}
