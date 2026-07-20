import fs from "node:fs";
import path from "node:path";
const trackerPath = process.argv[2];
if (!trackerPath) throw new Error("usage: node scripts/validate-work-order.mjs <tracker.json>");
const root = process.cwd();
const tracker = JSON.parse(fs.readFileSync(path.resolve(root, trackerPath), "utf8"));
const failures = [];
for (const task of tracker.tasks ?? []) {
  if (task.status !== "done") continue;
  for (const artifact of task.required_artifacts ?? []) {
    if (artifact.must !== "exist" || !fs.existsSync(path.resolve(root, artifact.path))) failures.push(`${task.id}: missing or unsupported ${artifact.path}`);
  }
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`validated ${tracker.tasks?.length ?? 0} task(s)`);
