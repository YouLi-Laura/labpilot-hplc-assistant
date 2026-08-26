import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
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

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".git") continue;
    assert.equal(forbiddenNames.has(entry.name), false, `forbidden public entry: ${entry.name}`);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolutePath));
    else files.push(absolutePath);
  }

  return files;
}

test("the public release contains required metadata and no private deployment material", async () => {
  for (const relativePath of requiredRootFiles) {
    await access(path.join(projectRoot, relativePath));
  }

  const files = await walk(projectRoot);
  for (const file of files) {
    if (/html2pdf\.bundle\.min\.js$/.test(file)) continue;
    const content = await readFile(file, "utf8");
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(content, pattern, `${path.relative(projectRoot, file)} contains ${pattern}`);
    }
  }
});

test("the public README explains LabPilot to non-HPLC readers without overstating the product", async () => {
  const readme = await readFile(path.join(projectRoot, "README.md"), "utf8");

  for (const requiredCopy of [
    "HPLC 是什么",
    "LabPilot 解决什么问题",
    "适合谁使用",
    "LabPilot 的核心优势",
    "https://youli-laura.github.io/labpilot-hplc-assistant/",
    "确定性规则",
    "不替代 SOP、QA、偏差调查或质量结论",
    "Copyright © 2026 You.Li. All rights reserved.",
  ]) {
    assert.ok(readme.includes(requiredCopy), `README is missing: ${requiredCopy}`);
  }

  assert.doesNotMatch(readme, /AI 驱动|行业领先|提升效率 \d+%|已投入生产/);
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
});
