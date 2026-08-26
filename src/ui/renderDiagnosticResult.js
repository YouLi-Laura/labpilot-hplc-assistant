// 纯 HTML 渲染器 —— V2 四步诊断结果
// 优先级 1 完整展开，优先级 2/3 默认折叠，其他方向全部折叠

export function normalizeDisplayCopy(value) {
  return String(value ?? "")
    .replace(/[。．]{2,}/g, "。")
    .replace(/[ \t]+\n/g, "\n");
}

export function escapeHtml(value) {
  return normalizeDisplayCopy(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function bindDirectionExpandControls(container) {
  container.querySelectorAll('.direction-expand-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.direction-collapsible');
      if (!card) return;

      const isExpanded = card.classList.toggle('expanded');
      button.setAttribute('aria-expanded', String(isExpanded));

      const label = button.querySelector('.direction-expand-label');
      if (label) {
        label.textContent = isExpanded ? '收起详情' : '展开详情';
      }
    });
  });
}

function renderPriorityBadge(priority) {
  return `<span class="priority-badge priority-${priority}">优先 ${priority}</span>`;
}

function renderEvidence(evidence) {
  if (!evidence || evidence.length === 0) return "";
  const count = evidence.length;
  const items = evidence
    .map((item) => `<li>${escapeHtml(item.label)}</li>`)
    .join("");

  return `
    <details class="direction-evidence">
      <summary class="direction-evidence-summary">
        <svg class="direction-evidence-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <span class="direction-evidence-overview">
          <strong>决策依据</strong>
          <span>系统综合 ${count} 项关键观察形成此排查方向</span>
        </span>
        <span class="direction-evidence-toggle">查看推理依据</span>
      </summary>
      <div class="direction-evidence-detail">
        <h4>已纳入本次判断的关键观察</h4>
        <ul>${items}</ul>
      </div>
    </details>
  `;
}

function renderResultJudgment(judgment) {
  if (!judgment) return '';
  return `
    <div class="direction-judgment">
      <h4>执行后如何判断</h4>
      <p class="judgment-help">完成上述建议操作后，根据新实验现象选择对应的下一步。</p>
      <div class="judgment-branch resolved">
        <span class="judgment-branch-label">若异常改善或消失</span>
        <span class="judgment-branch-copy">${escapeHtml(judgment.ifResolved)}</span>
      </div>
      <div class="judgment-branch not-resolved">
        <span class="judgment-branch-label">若异常仍然存在</span>
        <span class="judgment-branch-copy">${escapeHtml(judgment.ifNotResolved)}</span>
      </div>
    </div>
  `;
}

function renderDirectionBody(direction) {
  return `
    ${renderEvidence(direction.evidence)}
    <div class="direction-rationale">
      <h4>判断依据</h4>
      <p>${escapeHtml(direction.rationale)}</p>
    </div>
    <div class="direction-actions">
      <h4>建议操作</h4>
      <p>${escapeHtml(direction.actions)}</p>
    </div>
    ${renderResultJudgment(direction.resultJudgment)}
    ${direction.nextSteps ? `
    <div class="direction-next">
      <h4>下一步</h4>
      <p>${escapeHtml(direction.nextSteps)}</p>
    </div>
    ` : ''}
    ${direction.stopCondition ? `
    <div class="direction-stop">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      <span>${escapeHtml(direction.stopCondition)}</span>
    </div>
    ` : ''}
  `;
}

function renderDirectionCard(direction, index) {
  const priority = direction.priority || (index + 1);
  const isTop1 = priority === 1;
  const cardId = `direction-${priority}`;
  const bodyId = `${cardId}-details`;

  if (isTop1) {
    // Priority 1: fully expanded
    return `
      <div class="direction-card" id="${cardId}">
        <div class="direction-card-header">
          ${renderPriorityBadge(priority)}
        </div>
        <h3 class="direction-title">${escapeHtml(direction.title)}</h3>
        ${renderDirectionBody(direction)}
      </div>
    `;
  }

  // Priority 2/3: collapsed by default
  return `
    <div class="direction-card direction-collapsible" id="${cardId}">
      <div class="direction-card-header">
        ${renderPriorityBadge(priority)}
      </div>
      <h3 class="direction-title">${escapeHtml(direction.title)}</h3>
      <p class="direction-summary-line">${escapeHtml(direction.summaryLine)}</p>
      <button type="button" class="direction-expand-btn" aria-expanded="false" aria-controls="${bodyId}">
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        <span class="direction-expand-label">展开详情</span>
      </button>
      <div class="direction-body-collapse" id="${bodyId}">
        ${renderDirectionBody(direction)}
      </div>
    </div>
  `;
}

function renderComplianceBanner(banner, riskLevel) {
  if (!banner) return '';
  const isStop = banner.level === 'stop';
  const cls = isStop ? 'banner-stop' : 'banner-warning';
  const stopTitle = 'System suitability 未通过';
  const message = String(banner.message ?? '');
  const bannerMessage = isStop && message.startsWith(stopTitle)
    ? message.slice(stopTitle.length).replace(/^[，,]\s*/, '')
    : message;

  return `
    <div class="compliance-banner ${cls}" role="alert">
      <div class="compliance-banner__content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <div class="compliance-banner__copy">
          ${isStop ? `<strong class="compliance-banner__title">${stopTitle}</strong>` : ''}
          <span class="compliance-banner__message">${escapeHtml(bannerMessage)}</span>
        </div>
      </div>
      ${isStop && riskLevel ? `
        <div class="compliance-banner__risk" aria-label="风险等级：${escapeHtml(riskLevel)}">
          <span class="compliance-banner__risk-label">风险等级</span>
          <strong class="compliance-banner__risk-value">${escapeHtml(riskLevel)}</strong>
        </div>
      ` : ''}
    </div>
  `;
}

export function renderPrintableInputSummary(inputSummary = {}, generatedAt = "") {
  const renderItems = (summary) => Object.values(summary || {})
    .map((item) => `<div class="print-input-item"><dt>${escapeHtml(item.question)}</dt><dd>${escapeHtml(item.answer)}</dd></div>`)
    .join('');

  return `
    <section class="print-report-summary" id="print-report-summary">
      <header class="print-report-header">
        <p class="print-report-brand">LabPilot</p>
        <h1>HPLC 异常排查报告</h1>
        <p>报告生成时间：${escapeHtml(generatedAt)}</p>
      </header>
      <div class="print-report-scope">
        <strong>适用范围</strong>
        <span>本报告为未知杂峰排查辅助输出，不替代 SOP、QA、偏差调查或质量结论。</span>
      </div>
      <h2>案例输入记录</h2>
      <div class="print-primary-anomaly">
        <span>主要异常</span>
        <strong>${escapeHtml(inputSummary.primaryAnomalyLabel || "未知杂峰")}</strong>
      </div>
      <h3>异常详情</h3>
      <dl class="print-input-grid">${renderItems(inputSummary.step2Summary)}</dl>
      <h3>系统状态</h3>
      <dl class="print-input-grid">${renderItems(inputSummary.step3Summary)}</dl>
    </section>
  `;
}

function renderRiskSection(riskLevel, riskReasons) {
  const cls = `risk-badge risk-${riskLevel}`;
  const reasonsHtml = (riskReasons && riskReasons.length > 0)
    ? `<ul class="risk-reasons">${riskReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`
    : '';

  return `
    <section class="result-section risk-section">
      <h2>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        风险等级
      </h2>
      <div class="risk-info">
        <p class="${cls}">${escapeHtml(riskLevel)}</p>
        ${reasonsHtml ? `
        <div class="risk-reasons-box">
          <span class="risk-reasons-label">风险依据</span>
          ${reasonsHtml}
        </div>
        ` : ''}
      </div>
    </section>
  `;
}

function renderOtherDirections(otherDirections) {
  if (!otherDirections || otherDirections.length === 0) return '';

  const items = otherDirections.map((d) => `
    <div class="other-direction">
      <div class="other-direction-header">
        <span class="other-direction-title">${escapeHtml(d.title)}</span>
      </div>
      ${d.summaryLine ? `<p class="direction-summary-line">${escapeHtml(d.summaryLine)}</p>` : ''}
      ${renderDirectionBody(d)}
    </div>
  `).join('');

  return `
    <section class="result-section other-section">
      <details class="other-directions">
        <summary>查看其他可能原因（${otherDirections.length} 条）</summary>
        <div class="other-directions-body">
          ${items}
        </div>
      </details>
    </section>
  `;
}

export function renderDiagnosticResult(result, { includeToolbar = true } = {}) {
  if (!result || !result.topDirections) {
    return '<p class="empty-result">暂无诊断结果。</p>';
  }

  return `
    ${renderComplianceBanner(result.complianceBanner, result.riskLevel)}
    ${includeToolbar ? `
    <div class="result-toolbar">
      <div class="result-toolbar-primary">
        <div class="result-toolbar-actions">
          <button type="button" class="btn-secondary result-back-button" id="btn-result-back-edit">← 返回修改</button>
          <button type="button" class="btn-secondary" id="btn-export-pdf-report">导出 PDF 报告</button>
        </div>
        <p class="pdf-export-status" id="pdf-export-status" role="status" aria-live="polite"></p>
      </div>
      <p>返回后可逐级检查或修改输入，现有答案不会丢失。</p>
    </div>
    ` : ''}
    <section class="result-section directions-section">
      <h2>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
        优先排查方向
      </h2>
      <p class="direction-scale-note">优先级表示建议的排查先后；展开“决策依据”可以查看本次判断引用的观察。</p>
      <div class="direction-cards">
        ${result.topDirections.map((d, i) => renderDirectionCard(d, i)).join('')}
      </div>
    </section>
    ${renderRiskSection(result.riskLevel, result.riskReasons)}
    ${renderOtherDirections(result.otherDirections)}
    <section class="result-section disclaimer-section">
      <h2>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        免责声明
      </h2>
      <p>${escapeHtml(result.disclaimer)}</p>
    </section>
  `;
}
