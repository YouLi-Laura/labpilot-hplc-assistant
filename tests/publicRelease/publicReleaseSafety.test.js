import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, "../..");
const requiredRootFiles = [".gitignore", ".nojekyll", "LICENSE", "README.md", "index.html", "package.json"];
const forbiddenNames = new Set([
  ".openai",
  ".wrangler",
  "dist",
  "node_modules",
  "portfolio",
]);
const forbiddenPatterns = [
  new RegExp(["art", "v1", ""].join("_")),
  new RegExp(["OAI", "Sites", "Authorization"].join("-")),
  new RegExp(["source", "repository", "credential"].join("_")),
  new RegExp(["", "Users", "liyou", ""].join("\\/")),
  new RegExp(["princeliyou13", "gmail", "com"].join("\\.")),
  new RegExp(["", "chatgpt", "site"].join("\\.")),
];
const execFileAsync = promisify(execFile);

async function listTrackedFiles() {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  return stdout.split("\0").filter(Boolean);
}

test("the public release contains required metadata and no private deployment material", async () => {
  for (const relativePath of requiredRootFiles) {
    await access(path.join(projectRoot, relativePath));
  }

  const trackedFiles = await listTrackedFiles();
  for (const relativePath of trackedFiles) {
    for (const segment of relativePath.split("/")) {
      assert.equal(forbiddenNames.has(segment), false, `forbidden public entry: ${relativePath}`);
    }
    if (/html2pdf\.bundle\.min\.js$/.test(relativePath)) continue;
    const content = await readFile(path.join(projectRoot, relativePath), "utf8");
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(content, pattern, `${relativePath} contains ${pattern}`);
    }
  }
});

test("the public README explains LabPilot in direct professional language", async () => {
  const readme = await readFile(path.join(projectRoot, "README.md"), "utf8");

  for (const requiredCopy of [
    "项目概览",
    "当前实现：未知杂峰",
    "我的职责与协作方式",
    "AI 编程工具参与前端实现、自动化测试与文案迭代",
    "从一次虚构案例看完整流程",
    "输入观察",
    "优先方向",
    "后续分支",
    "三个关键产品决策",
    "按判断依赖分步采集",
    "首屏最多展示三个优先方向",
    "建议必须能回看，也必须能继续",
    "验证范围与当前边界",
    "自动化测试验证规则和交互按设计运行",
    "不证明实际实验效率提升",
    "docs/images/labpilot-input.png",
    "docs/images/labpilot-result.png",
    "研发人员",
    "输入冲突检查",
    "https://youli-laura.github.io/labpilot-hplc-assistant/",
    "确定性规则",
    "不替代 SOP、QA、偏差调查或质量结论",
    "Copyright © 2026 You.Li. All rights reserved.",
  ]) {
    assert.ok(readme.includes(requiredCopy), `README is missing: ${requiredCopy}`);
  }

  for (const relativePath of [
    "docs/images/labpilot-input.png",
    "docs/images/labpilot-result.png",
  ]) {
    await access(path.join(projectRoot, relativePath));
  }

  assert.doesNotMatch(
    readme,
    /AI 驱动|不调用大模型|大模型生成质量判断|求职|招聘|作品集|行业领先|提升效率 \d+%|已投入生产/
  );
  assert.doesNotMatch(
    readme,
    /HPLC 分析人员|把关键问题一次问全|优先级不等于证据支持度|证据支持度/
  );
  assert.doesNotMatch(
    readme,
    /结构确证|流程框架可以扩展到 GC|当前 HPLC 规则不能直接用于 GC|相比 ChatGPT|ChatGPT 做不到|不调用大模型/
  );
  assert.doesNotMatch(
    readme,
    /^## (为什么需要 LabPilot？|不只是给出一串可能原因|产品定位|核心能力|专业边界与设计原则)$/m
  );
  assert.doesNotMatch(
    readme,
    /图片识别|上传色谱图|大模型接入|Agent 能力|当前支持 GC|节省 \d+%|准确率 \d+%/
  );
});

test("the public release is source-visible but not open source", async () => {
  const license = await readFile(path.join(projectRoot, "LICENSE"), "utf8");
  const readme = await readFile(path.join(projectRoot, "README.md"), "utf8");

  for (const requiredCopy of [
    "Copyright © 2026 You.Li. All rights reserved.",
    "not open-source software",
    "prior written permission",
    "GitHub Terms of Service",
    "src/vendor/html2pdf.LICENSE.txt",
  ]) {
    assert.ok(license.includes(requiredCopy), `LICENSE is missing: ${requiredCopy}`);
  }

  assert.match(readme, /公开可见，但不是开源软件/);
  assert.match(readme, /\[LICENSE\]\(\.\/LICENSE\)/);
  assert.match(readme, /\[第三方 MIT 许可证\]\(\.\/src\/vendor\/html2pdf\.LICENSE\.txt\)/);
  assert.doesNotMatch(license, /recruitment|portfolio/i);
});
