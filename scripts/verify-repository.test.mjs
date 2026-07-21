import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const verifier = path.resolve("scripts/verify-repository.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "financial-news-verifier-"));
const run = () => spawnSync(process.execPath, [verifier], { cwd: temp, encoding: "utf8" });
const write = (relative, content) => {
  const target = path.join(temp, ...relative.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

const category = (name) => `# ${name}\n\n## Global\n\n${[1, 2, 3].map((number) => `### ${number}) Item\n\n> **Source:** [Publisher](https://example.com/${name}/${number})`).join("\n\n")}\n\n## Thailand\n\n${[1, 2, 3].map((number) => `### ${number}) Item\n\n> **Source:** [Publisher](https://example.com/${name}/th-${number})`).join("\n\n")}\n`;

try {
  execFileSync("git", ["init", "-q"], { cwd: temp });
  execFileSync("git", ["config", "user.name", "Verifier Test"], { cwd: temp });
  execFileSync("git", ["config", "user.email", ["test", "example.invalid"].join("@")], { cwd: temp });
  write("index.html", '<link rel="stylesheet" href="assets/style.css"><script src="assets/app.js"></script>');
  write("assets/style.css", "body { color: black; }\n");
  write("assets/app.js", "console.log('ok');\n");
  write("news/manifest.json", JSON.stringify({ dates: ["2026-07-21"] }));
  for (const name of ["business", "economy", "politics"]) write(`news/2026-07-21/${name}.md`, category(name));
  execFileSync("git", ["add", "."], { cwd: temp });
  execFileSync("git", ["commit", "-qm", "valid fixture"], { cwd: temp });

  const valid = run();
  if (valid.status !== 0) throw new Error(`valid fixture rejected\n${valid.stderr}`);

  fs.rmSync(path.join(temp, "news", "2026-07-21", "economy.md"));
  const missing = run();
  if (missing.status === 0 || !missing.stderr.includes("missing file required by manifest")) {
    throw new Error("verifier accepted a missing category file");
  }
  write("news/2026-07-21/economy.md", category("economy"));

  const windowsPath = ["C:", "\\private", "\\file"].join("");
  write("assets/app.js", `const source = '${windowsPath}';\n`);
  const absolutePath = run();
  if (absolutePath.status === 0 || !absolutePath.stderr.includes("machine-specific absolute path")) {
    throw new Error("verifier accepted an absolute machine path");
  }
  write("assets/app.js", "console.log('ok');\n");

  write("assets/app.js", `const token = '${"ghp_"}${"a".repeat(36)}';\n`);
  const secret = run();
  if (secret.status === 0 || !secret.stderr.includes("high-confidence secret signature")) {
    throw new Error("verifier accepted a high-confidence secret");
  }

  console.log("repository verifier positive and negative tests passed");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
