// VERIFY: every gate the studio has, in one command, stopping at nothing (each gate reports), exiting 1 if any failed.
//
//   bun run verify            everything, including every golden (renders sampled frames: several minutes)
//   bun run verify --fast     everything but the goldens
//
// Gates: both typechecks, oxlint, oxfmt, the public-repo privacy gate, the anidoodle inventory, the sound catalog,
// and the goldens (sealed pieces must stay SAME).
import { join } from "node:path";

const ROOT = join(import.meta.dir, ".."),
  MOTION = join(ROOT, "motion"),
  fast = process.argv.includes("--fast");
const gates: { name: string; cmd: string[]; cwd?: string }[] = [
  { name: "typecheck (studio)", cmd: ["bunx", "tsc", "--noEmit", "-p", "."] },
  { name: "typecheck (motion room)", cmd: ["npx", "tsc", "--noEmit", "-p", "tsconfig.json"], cwd: MOTION },
  { name: "lint (oxlint)", cmd: ["bunx", "oxlint", "-c", ".oxlintrc.json", "--deny-warnings", "."] },
  { name: "format (oxfmt --check)", cmd: ["bunx", "oxfmt", "--check", "."] },
  { name: "public-repo gate", cmd: ["bun", "scripts/check-public.ts"] },
  { name: "anidoodle inventory", cmd: ["node", "tools/third-party-inventory.mjs", "--check"], cwd: MOTION },
  { name: "sound catalog", cmd: ["bun", "sound/tools/render.ts", "--check"] },
  ...(fast ? [] : [{ name: "goldens", cmd: ["node", "tools/studio.mjs", "golden", "all"], cwd: MOTION }]),
];

const results: { name: string; ok: boolean; secs: number; tail: string }[] = [];
for (const g of gates) {
  const t0 = performance.now();
  process.stdout.write(`… ${g.name}\n`);
  const r = Bun.spawnSync(g.cmd, { cwd: g.cwd ?? ROOT, stdout: "pipe", stderr: "pipe" });
  const out = `${r.stdout}${r.stderr}`.trim().split("\n");
  results.push({
    name: g.name,
    ok: r.exitCode === 0,
    secs: (performance.now() - t0) / 1000,
    tail: out.slice(-(r.exitCode === 0 ? 1 : 12)).join("\n"),
  });
}
console.log("");
for (const r of results)
  console.log(
    `${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(26)} ${r.secs.toFixed(1).padStart(6)} s  ${r.ok ? r.tail.slice(0, 110) : ""}${r.ok ? "" : `\n${r.tail.replace(/^/gm, "        ")}`}`,
  );
const failed = results.filter((r) => !r.ok);
console.log(
  failed.length
    ? `\nverify: ${failed.length} gate(s) FAILED`
    : `\nverify: all ${results.length} gates PASS${fast ? " (goldens skipped: --fast)" : ""}`,
);
process.exit(failed.length ? 1 : 0);
