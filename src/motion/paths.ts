// The studio's pages live at real paths (/piece/<id>, /series/studies, /journal), not after a "#": a shared link then
// reaches the server, so a piece's own page (title, card, words) answers it. This list is the one source of which
// first path segments are pages. The app routes them (app.ts), the local server serves the shell for them
// (server.ts), and the hosted Caddyfile names the same ones (export-site.ts refuses to build if it drifts).
// "library" and "sound" are also asset folders: only the bare /library and /sound are pages.
export const PAGE_ROOTS = [
  "library",
  "carousels",
  "wallpapers",
  "prompts",
  "posts",
  "sound",
  "series",
  "use",
  "piece",
  "brand",
  "workflows",
  "runs",
  "skills",
  "tools",
  "docs",
  "doc",
  "note",
  "journal",
  "isolation",
] as const;
/** roots that are also asset folders: only the bare path is a page */
export const BARE_ONLY = new Set<string>(["library", "sound"]);

/** is this same-origin path one of the studio's pages (so the app routes it instead of loading it)? */
export function isPage(pathname: string): boolean {
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (!parts[0]) return true;
  if (!(PAGE_ROOTS as readonly string[]).includes(parts[0])) return false;
  return !(BARE_ONLY.has(parts[0]) && parts.length > 1);
}
