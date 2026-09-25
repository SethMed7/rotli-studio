// LINK POST: add one of the owner's published posts to the studio's Posts page (motion/posts.json).
//
//   bun scripts/link-post.ts <url> [--piece <pieceId>]... [--text "what it says"] [--date YYYY-MM-DD]
//
// Links only: the post stays on its platform. The URL must match one of `accounts` in posts.json (the
// owner's own handles), pieces must exist in pieces.json, and an X post's date is read from its id when
// not given. Idempotent: linking the same URL again updates its entry. Nothing is pushed; the change
// reaches the public repo only through an owner push, which the repo's branch rules already require.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, ".."), FILE = join(ROOT, "motion/posts.json");
const args = process.argv.slice(2), url = args.find((a) => /^https?:\/\//.test(a));
const all = (flag: string) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]!] : []));
const one = (flag: string) => all(flag)[0];
if (!url) { console.error("usage: bun scripts/link-post.ts <url> [--piece <id>]... [--text \"…\"] [--date YYYY-MM-DD]"); process.exit(1); }

type Post = { platform: string; url: string; date: string; text: string; pieces: string[] };
const data = JSON.parse(readFileSync(FILE, "utf8")) as { note: string; accounts: { platform: string; match: string }[]; posts: Post[] };
const account = data.accounts.find((a) => new RegExp(a.match).test(url));
if (!account) { console.error(`refused: ${url} is not one of the owner's accounts in motion/posts.json`); process.exit(2); }
const ids = new Set(JSON.parse(readFileSync(join(ROOT, "motion/pieces.json"), "utf8")).pieces.map((p: { id: string }) => p.id));
const pieces = all("--piece"), unknown = pieces.filter((p) => !ids.has(p));
if (unknown.length) { console.error(`refused: unknown piece(s) ${unknown.join(", ")}`); process.exit(2); }
const snowflake = url.match(/status\/(\d+)/)?.[1];
const date = one("--date") ?? (snowflake ? new Date(Number((BigInt(snowflake) >> 22n) + 1288834974657n)).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error("refused: --date must be YYYY-MM-DD"); process.exit(2); }
const clean = url.replace(/\?.*$/, "").replace("twitter.com", "x.com");
const entry: Post = { platform: account.platform, url: clean, date, text: (one("--text") ?? "").slice(0, 400), pieces };
const at = data.posts.findIndex((p) => p.url === clean);
if (at >= 0) data.posts[at] = { ...data.posts[at]!, ...entry, text: entry.text || data.posts[at]!.text, pieces: pieces.length ? pieces : data.posts[at]!.pieces };
else data.posts.push(entry);
data.posts.sort((a, b) => b.date.localeCompare(a.date));
writeFileSync(FILE, JSON.stringify(data, null, 1) + "\n");
console.log(`${at >= 0 ? "updated" : "linked"} ${clean} (${account.platform}, ${date}${pieces.length ? `, pieces ${pieces.join(" ")}` : ""}) -> motion/posts.json`);
