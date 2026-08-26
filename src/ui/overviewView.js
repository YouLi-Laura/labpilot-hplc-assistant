const workflowSteps = Object.freeze([
  Object.freeze({ number: "01", title: "选择异常", description: "选择异常类型并开始结构化排查。" }),
  Object.freeze({ number: "02", title: "异常详情", description: "记录峰位置、保留时间及 Blank 表现等观察。" }),
  Object.freeze({ number: "03", title: "系统状态", description: "补充近期变更、压力与系统适用性状态。" }),
  Object.freeze({ number: "04", title: "排查结果", description: "获得可追溯的优先排查路径并导出报告。" }),
]);

const outputCapabilities = Object.freeze([
  Object.freeze({ title: "排查优先级", description: "明确先处理什么，以及后续应转向哪里。" }),
  Object.freeze({ title: "决策依据", description: "每个方向都可以回看本次判断引用的具体观察。" }),
  Object.freeze({ title: "操作后判断", description: "分别说明异常改善或消失、异常仍然存在时如何继续。" }),
  Object.freeze({ title: "建议与报告", description: "提供单变量排查建议、结果判断和 PDF 报告。" }),
]);

export function getOverviewMarkup() {
  const steps = workflowSteps.map((step) => `
    <li class="overview-step-card">
      <span class="overview-step-number">${step.number}</span>
      <div>
        <h3>${step.title}</h3>
        <p>${step.description}</p>
      </div>
    </li>
  `).join("");

  const capabilities = outputCapabilities.map((capability) => `
    <li class="overview-capability-item">
      <span class="overview-capability-marker" aria-hidden="true"></span>
      <div>
        <strong>${capability.title}</strong>
        <span>${capability.description}</span>
      </div>
    </li>
  `).join("");

  return `
    <section class="overview-workbench" aria-labelledby="overview-title">
      <header class="overview-hero">
        <div class="overview-hero-copy">
          <p class="overview-eyebrow">LabPilot · HPLC 异常排查</p>
          <h1 id="overview-title">面对 HPLC 异常，下一步该查什么？</h1>
          <p class="overview-intro">通过结构化实验室观察，生成有优先级、可追溯、带合规护栏的排查路径。</p>
          <div class="overview-actions">
            <button type="button" class="btn-primary" id="btn-overview-start">开始异常排查</button>
          </div>
        </div>
      </header>

      <section class="overview-section" aria-labelledby="overview-workflow-title">
        <div class="overview-section-heading">
          <div>
            <p class="overview-section-kicker">工作方式</p>
            <h2 id="overview-workflow-title">四步完成一次结构化排查</h2>
          </div>
          <p>输入实验室观察，系统按当前规则组织证据与行动顺序。</p>
        </div>
        <ol class="overview-step-grid">${steps}</ol>
      </section>

      <div class="overview-lower-grid">
        <section class="overview-section overview-output-card" aria-labelledby="overview-output-title">
          <p class="overview-section-kicker">你将获得</p>
          <h2 id="overview-output-title">可以执行、也可以追溯的结果</h2>
          <ul class="overview-capability-list">${capabilities}</ul>
        </section>

        <aside class="overview-compliance-card" aria-labelledby="overview-compliance-title">
          <p class="overview-section-kicker">合规边界</p>
          <h2 id="overview-compliance-title">辅助排查，不替代质量判断</h2>
          <p>LabPilot 不替代 SOP、QA、偏差调查或质量结论。系统适用性（SST）未通过时，结果将提示暂停报告并标记高风险。</p>
          <span class="overview-compliance-note">所有建议均需结合已批准的方法、程序与实验室要求执行。</span>
        </aside>
      </div>
    </section>
  `;
}

export function bindOverviewActions(container, { onStart }) {
  container.querySelector("#btn-overview-start")?.addEventListener("click", onStart);
}
