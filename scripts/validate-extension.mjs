import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const distDir = "dist";
const manifestPath = join(distDir, "manifest.json");

function fail(message) {
  console.error(`Extension validation failed: ${message}`);
  process.exit(1);
}

function assertFile(path, label) {
  if (!existsSync(path)) {
    fail(`${label} missing at ${path}`);
  }
}

assertFile(manifestPath, "manifest");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (manifest.manifest_version !== 3) {
  fail("manifest_version must be 3");
}

assertFile(join(distDir, manifest.action?.default_popup ?? ""), "popup html");
assertFile(join(distDir, manifest.options_page ?? ""), "options html");
assertFile(join(distDir, manifest.background?.service_worker ?? ""), "service worker");

for (const iconPath of Object.values(manifest.icons ?? {})) {
  assertFile(join(distDir, iconPath), `icon ${iconPath}`);
}

const contentScriptPath = join(distDir, "content/contentScript.js");
assertFile(contentScriptPath, "content script");

const contentScript = readFileSync(contentScriptPath, "utf8");
if (/^\s*import\s/m.test(contentScript)) {
  fail("content script must be self-contained for chrome.scripting.executeScript file injection");
}

console.log("Extension package validation passed.");
