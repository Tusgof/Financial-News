import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "work-order-validator-"));
try {
  const tracker = path.join(temp, "tracker.json");
  fs.writeFileSync(tracker, JSON.stringify({tasks: [{id: "test", status: "done", required_artifacts: [{path: "missing.txt", must: "exist"}]}]}));
  const result = spawnSync(process.execPath, [path.resolve("scripts/validate-work-order.mjs"), tracker], {cwd: temp});
  if (result.status === 0) throw new Error("validator accepted a missing done artifact");
  console.log("validator negative test passed");
} finally { fs.rmSync(temp, {recursive: true, force: true}); }
