import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, "../..");
const requiredRootFiles = [".gitignore", ".nojekyll", "README.md", "index.html", "package.json"];
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
