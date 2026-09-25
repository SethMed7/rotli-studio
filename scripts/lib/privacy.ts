// The one set of privacy rules for everything that leaves this Mac: the pre-push gate (scripts/check-public.ts)
// and the hosted snapshot (scripts/export-site.ts) both scan with these, so the two can never drift apart.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export type Rule = [RegExp, string];
// The maintainer's home and user name are what must never leak. On the maintainer's Mac they are this machine's;
// in CI (a runner's home is not the maintainer's) the name comes from STUDIO_MAINTAINER, a repository secret.
const CI = !!process.env.CI,
  HOME = CI ? null : homedir(),
  USER = process.env.STUDIO_MAINTAINER || (CI ? null : basename(homedir()));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** Built-in rules: secrets, identity numbers, personal paths and emails, private memex folders. */
export const baseRules = (): Rule[] => [
  [/sk-(?!test)[A-Za-z0-9_-]{20,}/, "an API key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY/, "a private key"],
  [/\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/, "a GitHub token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "an AWS key"],
  [/\b(?!078-05-1120)\d{3}-\d{2}-\d{4}\b/, "an SSN-shaped number (use 078-05-1120)"],
  [/(password|passwd)\s*[:=]\s*\S{6,}/i, "a password"],
  ...(HOME ? [[new RegExp(escape(HOME)), "the maintainer's home path"] as Rule] : []),
  ...(USER ? [[new RegExp(`\\b${escape(USER)}\\b`, "i"), "the maintainer's user name"] as Rule] : []),
  [/\/Users\/(?!example\b)[a-z][\w.-]+\//, "a real /Users/<name>/ path (use /Users/example or ~)"],
  [
    /[\w.+-]+@(?!example\.(com|org)\b|users\.noreply\.github\.com\b|anthropic\.com\b)[A-Za-z][\w-]*(\.[A-Za-z][\w-]*)*\.[A-Za-z]{2,}\b/,
    "an email address (use you@example.com)",
  ],
  [/memex-vault\/(identity|personality|history|chats)\//, "a private memex path"],
];

/** Names that must never be published (clients, private products). The list itself is private: it lives in
 *  the gitignored deploy/private-markers.local.txt. */
export function markerRules(root: string, { required }: { required: boolean }): Rule[] {
  const file = join(root, "deploy/private-markers.local.txt");
  if (!existsSync(file)) {
    if (required)
      throw new Error(
        "deploy/private-markers.local.txt is missing: refusing to publish without the private-name list (pass --no-markers to override knowingly)",
      );
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map(
      (name) =>
        [
          new RegExp(escape(name).replace(/\\?\s+/g, "\\s*"), "i"),
          "a private name from deploy/private-markers.local.txt",
        ] as Rule,
    );
}

/** Text is anything without a NUL byte in its first 8 KB (so .svg, .lock, .log, .toml… are all scanned). */
export const isText = (bytes: Uint8Array) => !bytes.subarray(0, 8192).includes(0);

/** Every rule a text breaks, as "line: what" strings. */
export function scan(text: string, rules: Rule[]): string[] {
  const out: string[] = [];
  text.split("\n").forEach((line, i) => {
    for (const [re, what] of rules) if (re.test(line)) out.push(`${i + 1}: ${what}`);
  });
  return out;
}
