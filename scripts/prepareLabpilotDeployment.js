import {
  access,
  cp,
  lstat,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const STAGE_MARKER = "labpilot-demo-deployment-stage-v1";

const DARWIN_SYSTEM_PATH_ALIASES = Object.freeze([
  ["/var", "/private/var"],
  ["/tmp", "/private/tmp"],
  ["/etc", "/private/etc"]
]);

const HOSTING_PATHS = Object.freeze([
  ".gitignore",
  ".openai/hosting.json",
  "app/globals.css",
  "app/layout.tsx",
  "app/page.tsx",
  "build/sites-vite-plugin.ts",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "postcss.config.mjs",
  "tsconfig.json",
  "vite.config.ts",
  "worker/index.ts"
]);

const PRODUCT_PATHS = Object.freeze([
  "index.html",
  "src/demo/demoCases.js",
  "src/domain/hplcLabels.js",
  "src/engine/diagnoseHplcIssue.js",
  "src/rules/hplcDiagnosticRules.js",
  "src/ui/app.js",
  "src/ui/diagnosticDirections.js",
  "src/ui/navigationState.js",
  "src/ui/overviewView.js",
  "src/ui/productScope.js",
  "src/ui/reportPdf.js",
  "src/ui/renderDiagnosticResult.js",
  "src/ui/stepQuestions.js",
  "src/ui/styles.css",
  "src/vendor/html2pdf.bundle.min.js",
  "src/vendor/html2pdf.LICENSE.txt"
]);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function lstatIfExists(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function normalizeSystemPathAliases(path) {
  if (process.platform !== "darwin") return path;

  for (const [alias, canonical] of DARWIN_SYSTEM_PATH_ALIASES) {
    if (path === alias) return canonical;
    if (path.startsWith(`${alias}${sep}`)) {
      return `${canonical}${path.slice(alias.length)}`;
    }
  }
  return path;
}

async function assertSafeProjectRoot(projectRoot) {
  const stats = await lstatIfExists(projectRoot);
  if (stats?.isSymbolicLink()) {
    throw new Error(`projectRoot must not be a symbolic link: ${projectRoot}`);
  }
  if (!stats || !stats.isDirectory()) {
    throw new Error(`projectRoot must be an existing directory: ${projectRoot}`);
  }

  const canonicalProjectRoot = await realpath(projectRoot);
  if (canonicalProjectRoot !== normalizeSystemPathAliases(projectRoot)) {
    throw new Error(`projectRoot must not contain symbolic links: ${projectRoot}`);
  }
}

async function assertSafeStageAncestry(hostingRoot) {
  for (const path of [hostingRoot, join(hostingRoot, "work")]) {
    const stats = await lstatIfExists(path);
    if (stats?.isSymbolicLink()) {
      throw new Error(`Deployment stage ancestry must not contain symbolic links: ${path}`);
    }
    if (stats && !stats.isDirectory()) {
      throw new Error(`Deployment stage ancestry must contain only directories: ${path}`);
    }
  }
}

async function resetMarkedStage(outputRoot) {
  const stats = await lstatIfExists(outputRoot);
  if (stats?.isSymbolicLink()) {
    throw new Error(`Deployment stage must not be a symbolic link: ${outputRoot}`);
  }
  if (stats) {
    const markerPath = join(outputRoot, ".labpilot-deployment-stage");
    const marker = await readFile(markerPath, "utf8").catch(() => null);
    if (marker !== STAGE_MARKER) {
      throw new Error(`Refusing to replace unmarked directory: ${outputRoot}`);
    }
    await rm(outputRoot, { recursive: true, force: true });
  }
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    join(outputRoot, ".labpilot-deployment-stage"),
    STAGE_MARKER,
    "utf8"
  );
}

async function copyPath(source, target) {
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, {
    recursive: true,
    filter: (path) => basename(path) !== ".DS_Store"
  });
}

export async function prepareLabpilotDeployment({ projectRoot, outputRoot }) {
  if (!isAbsolute(projectRoot) || !isAbsolute(outputRoot)) {
    throw new Error("projectRoot and outputRoot must be absolute paths");
  }

  const resolvedProjectRoot = resolve(projectRoot);
  const resolvedOutputRoot = resolve(outputRoot);
  const hostingRoot = join(resolvedProjectRoot, "hosting");
  const managedOutputRoot = join(hostingRoot, "work", "labpilot-deploy");

  if (resolvedOutputRoot !== managedOutputRoot) {
    throw new Error(
      `Deployment stage must be the managed path ${managedOutputRoot}: ${resolvedOutputRoot}`
    );
  }

  await assertSafeProjectRoot(resolvedProjectRoot);
  await assertSafeStageAncestry(hostingRoot);
  await resetMarkedStage(resolvedOutputRoot);

  for (const path of HOSTING_PATHS) {
    await copyPath(join(hostingRoot, path), join(resolvedOutputRoot, path));
  }
  for (const path of PRODUCT_PATHS) {
    await copyPath(
      join(resolvedProjectRoot, path),
      join(resolvedOutputRoot, "public/labpilot", path)
    );
  }

  const hostingNodeModules = join(hostingRoot, "node_modules");
  if (await exists(hostingNodeModules)) {
    await symlink(hostingNodeModules, join(resolvedOutputRoot, "node_modules"), "dir");
  }

  return resolvedOutputRoot;
}

const isCli = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const outputRoot = resolve(projectRoot, "hosting/work/labpilot-deploy");
  prepareLabpilotDeployment({ projectRoot, outputRoot })
    .then((path) => process.stdout.write(`${path}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack || error.message}\n`);
      process.exitCode = 1;
    });
}
