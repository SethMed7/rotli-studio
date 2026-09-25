// The one validator for publish/posts.json, shared by the helper that adds posts (scripts/link-post.ts) and the
// snapshot export (scripts/export-site.ts), so a hand edit cannot publish what the helper would refuse.
// What it guarantees: every link is https, on one of the owner's account patterns, dated, and names only real
// pieces. It does NOT prove authorship (a well-formed id on the owner's handle is accepted without a network
// check); the owner-only push rules are what keep strangers from adding entries.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Post = { platform: string; url: string; date: string; text: string; pieces: string[] };
export type Account = { platform: string; match: string };
export type PostsFile = { note: string; accounts: Account[]; posts: Post[] };

export const POSTS_FILE = (root: string) => join(root, "publish/posts.json");
export const readPosts = (root: string) => JSON.parse(readFileSync(POSTS_FILE(root), "utf8")) as PostsFile;
export const pieceIds = (root: string) =>
  new Set<string>(
    JSON.parse(readFileSync(join(root, "motion/pieces.json"), "utf8")).pieces.map((p: { id: string }) => p.id),
  );

/** the owner's account a URL belongs to, or null (https only; the account patterns are anchored) */
export function accountFor(url: string, accounts: Account[]): Account | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  return (
    accounts.find((a) => a.match.startsWith("^") && a.match.endsWith("$") && new RegExp(a.match).test(url)) ?? null
  );
}

/** every problem with the file, as readable strings; empty when it is safe to publish */
export function validatePosts(data: PostsFile, ids: Set<string>): string[] {
  const out: string[] = [];
  if (!Array.isArray(data.accounts) || !Array.isArray(data.posts))
    return ["publish/posts.json needs `accounts` and `posts` arrays"];
  data.posts.forEach((p, i) => {
    const at = `posts[${i}] ${p?.url ?? ""}`;
    const account = typeof p?.url === "string" ? accountFor(p.url, data.accounts) : null;
    if (!account) out.push(`${at}: not an https link on one of the owner's accounts`);
    else if (account.platform !== p.platform)
      out.push(`${at}: platform ${p.platform} does not match its account (${account.platform})`);
    if (typeof p?.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) out.push(`${at}: date must be YYYY-MM-DD`);
    if (typeof p?.text !== "string" || p.text.length > 400)
      out.push(`${at}: text must be a string of at most 400 characters`);
    if (!Array.isArray(p?.pieces) || p.pieces.some((x) => !ids.has(x)))
      out.push(`${at}: pieces must be ids from motion/pieces.json`);
  });
  return out;
}
