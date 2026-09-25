// CHECK PUBLIC: the studio repository is public, under the same rules as the rotli repo (synthetic data
// only; no home paths, personal emails or device names; secrets scanned before every push). This is the
// gate: the pre-push hook (.githooks/pre-push) runs it on exactly the commits being pushed.
//
//   bun scripts/check-public.ts                 scan HEAD's tree + gitleaks over all history
//   bun scripts/check-public.ts <sha>...        scan these commits' trees (what the hook passes)
//
// It reads COMMITTED bytes (git objects), never the working tree, so an uncommitted placeholder cannot hide
// what is actually pushed. Every text file is scanned (text = no NUL byte), including this one, plus file
// names. Rules: scripts/lib/privacy.ts (shared with the site export), plus the gitignored private-name list.
// Install the hook once per clone: git config core.hooksPath .githooks
import { join } from "node:path";
import { baseRules, isText, markerRules, scan } from "./lib/privacy";

const ROOT = join(import.meta.dir, "..");
const git = (args: string[]) => {
  const r = Bun.spawnSync(["git", ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode) throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  return r.stdout;
};
const problems: string[] = [];

const leaks = Bun.spawnSync(["gitleaks", "git", "--no-banner", "--redact", "--exit-code", "3", "."], {
  cwd: ROOT,
  stdout: "pipe",
  stderr: "pipe",
});
if (leaks.exitCode === 3) problems.push(`gitleaks found secrets in history:\n${leaks.stdout}${leaks.stderr}`);
else if (leaks.exitCode !== 0)
  problems.push(`gitleaks did not run (${leaks.exitCode}): install it with \`brew install gitleaks\``);

const rules = [...baseRules(), ...markerRules(ROOT, { required: false })];
const commits = process.argv.slice(2).filter((a) => /^[0-9a-f]{7,40}$/.test(a));
let scanned = 0;
for (const rev of commits.length ? commits : ["HEAD"]) {
  const entries = git(["ls-tree", "-r", "-z", rev])
    .toString()
    .split("\0")
    .filter(Boolean)
    .map((l) => {
      const [meta, path] = l.split("\t");
      return { sha: meta!.split(" ")[2]!, path: path! };
    });
  for (const { sha, path } of entries) {
    for (const hit of scan(path, rules))
      problems.push(`${rev.slice(0, 8)} file name ${path}: ${hit.replace(/^\d+: /, "")}`);
    const bytes = git(["cat-file", "blob", sha]);
    if (!isText(bytes)) continue;
    scanned++;
    for (const hit of scan(new TextDecoder().decode(bytes), rules)) problems.push(`${rev.slice(0, 8)} ${path}:${hit}`);
  }
}
if (problems.length) {
  console.error(`check-public: FAIL (${problems.length})\n  ${problems.slice(0, 60).join("\n  ")}`);
  process.exit(1);
}
console.log(
  `check-public: PASS · gitleaks clean over history · ${scanned} committed text files free of secrets, home paths, personal emails and private names`,
);
