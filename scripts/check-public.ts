// CHECK PUBLIC: the studio repository is public, under the same rules as the rotli repo (synthetic data
// only; no home paths, personal emails or device names; secrets scanned before every push). This is the
// gate: the pre-push hook (.githooks/pre-push) runs it, and it must pass before any publication step.
//
//   bun scripts/check-public.ts          scan tracked files + full git history
//
// Checks: gitleaks over all history; every tracked text file for the maintainer's home path or user
// name, any /Users/<name>/ path other than /Users/example, email addresses other than placeholders and
// GitHub noreply, private memex paths, and the names listed in deploy/private-markers.local.txt (a
// gitignored file, so the list itself is never published).
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const ROOT = join(import.meta.dir, ".."), HOME = homedir(), USER = basename(HOME);
const sh = (cmd: string[]) => { const r = Bun.spawnSync(cmd, { cwd: ROOT, stdout: "pipe", stderr: "pipe" }); return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() }; };
const problems: string[] = [];

const leaks = sh(["gitleaks", "git", "--no-banner", "--redact", "--exit-code", "3", "."]);
if (leaks.code === 3) problems.push(`gitleaks found secrets in history:\n${leaks.out}`);
else if (leaks.code !== 0) problems.push(`gitleaks did not run (${leaks.code}): install it with \`brew install gitleaks\`\n${leaks.out.slice(0, 400)}`);

const rules: [RegExp, string][] = [
  [new RegExp(HOME.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")), "the maintainer's home path"],
  [new RegExp(`\\b${USER}\\b`, "i"), "the maintainer's user name"],
  [/\/Users\/(?!example\b)[a-z][\w.-]+\//, "a real /Users/<name>/ path (use /Users/example or ~)"],
  [/[\w.+-]+@(?!example\.(com|org)\b|users\.noreply\.github\.com\b|anthropic\.com\b)[A-Za-z][\w-]*(\.[A-Za-z][\w-]*)*\.[A-Za-z]{2,}\b/, "an email address (use you@example.com)"],
  [/memex-vault\/(identity|personality|history|chats)\//, "a private memex path"],
];
const markers = join(ROOT, "deploy/private-markers.local.txt");
if (existsSync(markers)) for (const name of readFileSync(markers, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")))
  rules.push([new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"), "i"), "a private name from deploy/private-markers.local.txt"]);

const files = sh(["git", "ls-files", "-z"]).out.split("\0").filter(Boolean);
for (const f of files) {
  if (!/\.(md|json|ts|tsx|mjs|js|py|txt|html|css|sh|toml|ya?ml|command)$|^[^.]+$/.test(f) || f === "scripts/check-public.ts") continue;
  let text: string; try { text = readFileSync(join(ROOT, f), "utf8"); } catch { continue; }
  text.split("\n").forEach((line, i) => { for (const [re, what] of rules) if (re.test(line)) problems.push(`${f}:${i + 1}: ${what}`); });
}

if (problems.length) { console.error(`check-public: FAIL (${problems.length})\n  ${problems.slice(0, 60).join("\n  ")}`); process.exit(1); }
console.log(`check-public: PASS · gitleaks clean over history · ${files.length} tracked files free of home paths, personal emails and private names`);
