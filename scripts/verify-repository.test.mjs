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
const stopRule = "หยุดทันทีเมื่อพบความคลาดเคลื่อนด้านเงิน การเปิดเผย PII/credential หรือการกระทำเกินอำนาจ; หาก acceptance gate เดิมล้มเหลวติดต่อกัน 3 ครั้งให้ pause และทบทวน; หากไม่เกิดผลดีที่วัดได้ติดต่อกัน 2 milestone ให้ kill หรือ re-scope";

const category = (name) => `# ${name}\n\n## Global\n\n${[1, 2, 3].map((number) => `### ${number}) Item\n\n> **Source:** [Publisher](https://example.com/${name}/${number})`).join("\n\n")}\n\n## Thailand\n\n${[1, 2, 3].map((number) => `### ${number}) Item\n\n> **Source:** [Publisher](https://example.com/${name}/th-${number})`).join("\n\n")}\n`;

try {
  execFileSync("git", ["init", "-q"], { cwd: temp });
  execFileSync("git", ["config", "user.name", "Verifier Test"], { cwd: temp });
  execFileSync("git", ["config", "user.email", ["test", "example.invalid"].join("@")], { cwd: temp });
  write("index.html", '<link rel="stylesheet" href="assets/style.css"><script src="assets/app.js"></script>');
  write("assets/style.css", "body { color: black; }\n");
  write("assets/app.js", "console.log('ok');\n");
  write("AGENTS.md", stopRule);
  write("PROJECT_BRAIN.md", stopRule);
  write("news/manifest.json", JSON.stringify({ dates: ["2026-07-21"] }));
  for (const name of ["business", "economy", "politics"]) write(`news/2026-07-21/${name}.md`, category(name));
  execFileSync("git", ["add", "."], { cwd: temp });
  execFileSync("git", ["commit", "-qm", "valid fixture"], { cwd: temp });

  const valid = run();
  if (valid.status !== 0) throw new Error(`valid fixture rejected\n${valid.stderr}`);

  write("AGENTS.md", "corrupted stop rule\n");
  const stopRuleMismatch = run();
  if (stopRuleMismatch.status === 0 || !stopRuleMismatch.stderr.includes("not verbatim UTF-8")) {
    throw new Error("verifier accepted a non-verbatim locked stop rule");
  }
  write("AGENTS.md", stopRule);

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
  write("assets/app.js", "console.log('ok');\n");

  write("assets/payload.bin", Buffer.from([0, 1, 2, 3]));
  execFileSync("git", ["add", "assets/payload.bin"], { cwd: temp });
  const binary = run();
  if (binary.status === 0 || !binary.stderr.includes("tracked binary content is not allowed")) {
    throw new Error("verifier accepted generic tracked binary content");
  }
  execFileSync("git", ["commit", "-qm", "binary history fixture"], { cwd: temp });
  fs.rmSync(path.join(temp, "assets", "payload.bin"));
  execFileSync("git", ["add", "assets/payload.bin"], { cwd: temp });
  execFileSync("git", ["commit", "-qm", "remove binary fixture"], { cwd: temp });
  const historyBinary = run();
  if (historyBinary.status === 0 || !historyBinary.stderr.includes("reachable-history binary content")) {
    throw new Error("verifier accepted generic binary content in reachable history");
  }

  write("assets/app.js", `const source = '${windowsPath}';\n`);
  execFileSync("git", ["add", "assets/app.js"], { cwd: temp });
  execFileSync("git", ["commit", "-qm", "absolute path history fixture"], { cwd: temp });
  write("assets/app.js", "console.log('ok');\n");
  execFileSync("git", ["add", "assets/app.js"], { cwd: temp });
  execFileSync("git", ["commit", "-qm", "remove absolute path fixture"], { cwd: temp });
  const historyAbsolutePath = run();
  if (historyAbsolutePath.status === 0 || !historyAbsolutePath.stderr.includes("reachable-history machine-specific absolute path")) {
    throw new Error("verifier accepted an absolute machine path in reachable history");
  }

  console.log("repository verifier positive and negative tests passed");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
