import {
  renderDiagnosticResult,
  renderPrintableInputSummary
} from "./renderDiagnosticResult.js?v=direct-pdf-20260809-r10";

const HTML2PDF_ASSET = "./src/vendor/html2pdf.bundle.min.js?v=direct-pdf-20260809-r10";
let html2pdfLoader = null;

export function buildPdfReportFilename(generatedAt = new Date().toISOString()) {
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error("PDF 生成时间无效。");
  }
  const stamp = date.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  return `labpilot-unknown-peak-${stamp}.pdf`;
}

function formatGeneratedAt(generatedAt) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: false
  }).format(new Date(generatedAt));
}

export function buildPdfExportMarkup({ result, inputSummary, generatedAt }) {
  return `
    ${renderPrintableInputSummary(inputSummary, formatGeneratedAt(generatedAt))}
    <div class="pdf-export-result">
      ${renderDiagnosticResult(result, { includeToolbar: false })}
    </div>
  `;
}

export function trimTrailingCanvasWhitespace(canvas, documentRef = document) {
  if (!canvas?.width || !canvas?.height || typeof canvas.getContext !== "function") {
    return canvas;
  }

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || typeof context.getImageData !== "function") return canvas;

  let pixels;
  try {
    pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return canvas;
  }

  let lastContentRow = -1;
  rowSearch:
  for (let y = canvas.height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      const isVisible = pixels[index + 3] > 0;
      const isNotWhite = pixels[index] < 250 || pixels[index + 1] < 250 || pixels[index + 2] < 250;
      if (isVisible && isNotWhite) {
        lastContentRow = y;
        break rowSearch;
      }
    }
  }

  if (lastContentRow < 0) return canvas;
  const trimmedHeight = Math.min(canvas.height, lastContentRow + 2);
  if (trimmedHeight >= canvas.height) return canvas;

  const trimmedCanvas = documentRef.createElement("canvas");
  const trimmedContext = trimmedCanvas?.getContext?.("2d");
  if (!trimmedContext || typeof trimmedContext.drawImage !== "function") return canvas;
  trimmedCanvas.width = canvas.width;
  trimmedCanvas.height = trimmedHeight;
  trimmedContext.drawImage(canvas, 0, 0);
  return trimmedCanvas;
}

export function loadHtml2Pdf({ documentRef = document, windowRef = window } = {}) {
  if (typeof windowRef.html2pdf === "function") {
    return Promise.resolve(windowRef.html2pdf);
  }
  if (html2pdfLoader) return html2pdfLoader;

  html2pdfLoader = new Promise((resolve, reject) => {
    const script = documentRef.createElement("script");
    script.src = HTML2PDF_ASSET;
    script.async = true;
    script.dataset.labpilotPdfEngine = "html2pdf-0.14.0";
    script.addEventListener("load", () => {
      if (typeof windowRef.html2pdf === "function") {
        resolve(windowRef.html2pdf);
        return;
      }
      html2pdfLoader = null;
      reject(new Error("PDF 组件未正确加载。"));
    }, { once: true });
    script.addEventListener("error", () => {
      html2pdfLoader = null;
      reject(new Error("PDF 组件加载失败。"));
    }, { once: true });
    documentRef.head.append(script);
  });

  return html2pdfLoader;
}

export async function downloadDiagnosticPdf({
  result,
  inputSummary,
  generatedAt = new Date().toISOString(),
  documentRef = document,
  windowRef = window,
  html2pdfFactory
}) {
  const exportHost = documentRef.createElement("div");
  exportHost.className = "pdf-export-host";
  const exportSource = documentRef.createElement("section");
  exportSource.className = "pdf-export-source";
  exportSource.innerHTML = buildPdfExportMarkup({ result, inputSummary, generatedAt });
  exportSource.querySelectorAll("details").forEach((detail) => {
    detail.open = true;
  });
  exportSource.querySelectorAll(".direction-collapsible").forEach((card) => {
    card.classList.add("expanded");
  });
  exportHost.append(exportSource);
  documentRef.body.append(exportHost);

  try {
    const factory = html2pdfFactory || await loadHtml2Pdf({ documentRef, windowRef });
    const filename = buildPdfReportFilename(generatedAt);
    const worker = factory().set({
      margin: [10, 10, 12, 10],
      filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: {
        scale: 1.5,
        useCORS: false,
        backgroundColor: "#ffffff"
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: {
        mode: ["css", "legacy"],
        before: [".direction-card", ".other-direction"],
        avoid: [
          ".direction-card",
          ".other-direction",
          ".direction-card-header",
          ".direction-evidence",
          ".direction-judgment",
          ".judgment-branch",
          ".direction-stop",
          ".risk-section",
          ".disclaimer-section",
          ".compliance-banner"
        ]
      }
    }).from(exportSource);
    await worker.toCanvas();
    const renderedCanvas = await worker.get("canvas");
    const trimmedCanvas = trimTrailingCanvasWhitespace(renderedCanvas, documentRef);
    const pdfBlob = await worker
      .set({ canvas: trimmedCanvas })
      .toPdf()
      .outputPdf("blob");

    const url = windowRef.URL.createObjectURL(pdfBlob);
    const link = documentRef.createElement("a");
    link.href = url;
    link.download = filename;
    documentRef.body.append(link);
    try {
      link.click();
    } finally {
      link.remove();
      windowRef.setTimeout(() => windowRef.URL.revokeObjectURL(url), 0);
    }
  } finally {
    exportHost.remove();
  }
}
