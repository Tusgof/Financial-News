import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const root = process.cwd();
const categories = ["business", "economy", "politics"];
const findings = [];
const addFinding = (file, message) => findings.push(`${file}: ${message}`);

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const manifestPath = path.join(root, "news", "manifest.json");
if (!fs.existsSync(manifestPath)) {
  addFinding("news/manifest.json", "missing manifest");
} else {
  let manifest;
  try {
    const value = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest = Array.isArray(value) ? value : value.dates;
  } catch (error) {
    addFinding("news/manifest.json", `invalid JSON (${error.message})`);
  }

  if (!Array.isArray(manifest) || manifest.length === 0) {
    addFinding("news/manifest.json", "dates must be a non-empty array");
  } else {
    const seen = new Set();
    for (const [index, date] of manifest.entries()) {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        addFinding("news/manifest.json", `invalid date at index ${index}`);
        continue;
      }
      const parsed = new Date(`${date}T00:00:00Z`);
      if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
        addFinding("news/manifest.json", `non-calendar date ${date}`);
      }
      if (seen.has(date)) addFinding("news/manifest.json", `duplicate date ${date}`);
      seen.add(date);

      for (const category of categories) {
        const relative = `news/${date}/${category}.md`;
        const absolute = path.join(root, ...relative.split("/"));
        if (!fs.existsSync(absolute)) {
          addFinding(relative, "missing file required by manifest");
          continue;
        }
        const content = fs.readFileSync(absolute, "utf8");
        if (!content.trim()) {
          addFinding(relative, "empty news file");
          continue;
        }
        const regionCount = (content.match(/^##\s+/gm) ?? []).length;
        const itemCount = (content.match(/^###\s+\d+\)\s+/gm) ?? []).length;
        const sourceUrls = [...content.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map((match) => match[1]);
        if (regionCount < 2) addFinding(relative, "requires global and Thailand sections");
        if (itemCount < 6) addFinding(relative, "requires at least six numbered news items");
        if (sourceUrls.length < itemCount) addFinding(relative, "each news item requires an HTTP(S) source link");
        for (const url of sourceUrls) {
          try {
            const parsedUrl = new URL(url);
            if (!(["http:", "https:"].includes(parsedUrl.protocol))) throw new Error("unsupported protocol");
          } catch {
            addFinding(relative, `invalid source URL ${url}`);
          }
        }
      }
    }

    const expectedOrder = [...manifest].sort().reverse();
    if (manifest.some((date, index) => date !== expectedOrder[index])) {
      addFinding("news/manifest.json", "dates must be newest-first");
    }

    const datedDirectories = fs.readdirSync(path.join(root, "news"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
      .map((entry) => entry.name);
    for (const date of datedDirectories) {
      if (!seen.has(date)) addFinding(`news/${date}`, "dated directory is missing from manifest");
    }
  }
}

const indexPath = path.join(root, "index.html");
if (!fs.existsSync(indexPath)) {
  addFinding("index.html", "missing static entry point");
} else {
  const html = fs.readFileSync(indexPath, "utf8");
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
    const reference = match[1].trim();
    if (!reference || reference.startsWith("#") || reference.startsWith("data:")) continue;
    if (/^(?:https?:)?\/\//i.test(reference)) continue;
    if (/^(?:mailto|tel):/i.test(reference)) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(reference)) {
      addFinding("index.html", `unsafe or unsupported reference ${reference}`);
      continue;
    }
    const clean = reference.split(/[?#]/, 1)[0];
    const absolute = path.resolve(root, decodeURIComponent(clean));
    if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute)) {
      addFinding("index.html", `missing local static reference ${reference}`);
    }
  }
}

const sensitiveFilename = /(?:^|\/)[^/]*(?:payroll|payslip|passport|employee[ _-]?database|staff[ _-]?list|bank[ _-]?statement|signed[ _-]?contract|tax[ _-]?id|ฐานข้อมูลพนักงาน|สลิปเงินเดือน)[^/]*$/i;
const credentialFilename = /(?:^|\/)(?:\.env(?:\.[^/]*)?|\.dev\.vars|\.npmrc|token\.json|credentials?\.json|client[_-]?secret[^/]*\.json|id_(?:rsa|dsa|ecdsa|ed25519)|[^/]+\.(?:pem|key|p12|pfx|jks|keystore))$/i;
const credentialExample = /(?:^|\/)(?:\.env\.example|\.dev\.vars\.example)$/i;
const machinePath = /(?:^|[\s"'`(=])(?:[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\[A-Za-z0-9$._-]+|\/(?:Users|home)\/[A-Za-z0-9._-]+\/)/im;
const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const highConfidenceSecrets = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /gh[pousr]_[A-Za-z0-9_]{30,}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /(?:^|[\s"'=])sk-(?:proj-)?[A-Za-z0-9_-]{32,}/m,
];

for (const file of trackedFiles) {
  const normalized = file.replaceAll("\\", "/");
  if (sensitiveFilename.test(normalized)) addFinding(file, "Vault-class filename candidate");
  if (credentialFilename.test(normalized) && !credentialExample.test(normalized)) {
    addFinding(file, "credential filename candidate");
  }

  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) continue;
  const buffer = fs.readFileSync(absolute);
  if (buffer.subarray(0, 8192).includes(0)) continue;
  const text = buffer.toString("utf8");
  if (machinePath.test(text)) addFinding(file, "machine-specific absolute path");
  if (highConfidenceSecrets.some((pattern) => pattern.test(text))) {
    addFinding(file, "high-confidence secret signature");
  }
  const emails = text.match(email) ?? [];
  if (emails.some((value) => !/@(?:example\.(?:com|org|net)|example\.invalid)$/i.test(value))) {
    addFinding(file, "email/PII candidate");
  }
}

const commits = execFileSync("git", ["rev-list", "--all"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);
const historyChecks = [
  {
    name: "reachable-history secret signature",
    pattern: "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|gh[pousr]_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|(^|[[:space:]\"'=])sk-(proj-)?[A-Za-z0-9_-]{32,}",
  },
  {
    name: "reachable-history email/PII candidate",
    pattern: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}",
  },
];

for (const commit of commits) {
  for (const check of historyChecks) {
    const result = spawnSync("git", ["grep", "-I", "-l", "-E", "-e", check.pattern, commit, "--"], {
      cwd: root,
      encoding: "utf8",
    });
    if (result.status === 0) addFinding(`history@${commit.slice(0, 7)}`, check.name);
    else if (result.status !== 1) throw new Error(result.stderr || `git grep failed for ${commit}`);
  }
}

const historyObjects = execFileSync("git", ["rev-list", "--objects", "--all"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);
for (const entry of historyObjects) {
  const separator = entry.indexOf(" ");
  if (separator < 0) continue;
  const objectPath = entry.slice(separator + 1).replaceAll("\\", "/");
  if (sensitiveFilename.test(objectPath)) addFinding(objectPath, "reachable-history Vault-class filename candidate");
  if (credentialFilename.test(objectPath) && !credentialExample.test(objectPath)) {
    addFinding(objectPath, "reachable-history credential filename candidate");
  }
}

if (findings.length) {
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log(`repository verification passed (${trackedFiles.length} tracked files, ${commits.length} reachable commits)`);
