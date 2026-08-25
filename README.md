# LabPilot — HPLC 异常排查助手

LabPilot 将分析实验室观察转化为有优先级、可追溯并带合规护栏的 HPLC 排查路径。

> 当前版本是确定性规则原型，不是大模型产品，也不替代 SOP、QA、偏差调查或质量结论。

## 在线体验

https://youli-laura.github.io/labpilot-hplc-assistant/

## 当前场景

V1.0 通过四步向导采集未知杂峰相关观察：选择异常、异常详情、系统状态、确认并生成排查结果。

## 产品设计重点

- 按排查优先级组织方向，而不是直接断言根因
- 将“优先级”和“证据支持度”分开表达
- 折叠展示决策依据，具体观察可追溯
- SST 未通过时显示停止护栏和高风险提示
- 通过“若异常改善或消失 / 若异常仍然存在”指导下一步单变量复核
- 支持导出包含输入摘要、排查方向和合规声明的 PDF 报告

## 案例与数据边界

内置案例根据常见实验室观察整理，仅用于演示完整排查路径，不包含真实公司、样品、批号或保密实验数据。

## 技术实现

- 原生 HTML、CSS 与 ECMAScript Modules
- 确定性 HPLC 规则引擎
- 本地 PDF 依赖，不调用第三方数据接口
- Node.js 内置测试运行器
- GitHub Pages 静态部署

## 本地运行

```bash
npm start
```

然后访问 `http://127.0.0.1:4175/`。

## 测试

```bash
npm test
```

测试覆盖规则优先级、证据支持度、冲突校验、SST 护栏、结果渲染、PDF 导出契约、响应式布局和公开发布安全边界。

## 项目状态

该仓库用于展示 LabPilot V1.0 产品原型。后续规划包括更多异常场景、案例记录和知识库能力；未上线模块不会被描述为已完成能力。

## Copyright

Copyright © You.Li. All rights reserved.

This repository is published for portfolio demonstration and technical exchange only. No permission is granted to copy, modify, distribute, sublicense, or use the code commercially.
