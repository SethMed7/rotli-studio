// rotli studio: a local-only server (127.0.0.1) for the Motion room and its assets. Rendered stills and
// carousel slides land in exports/<slug>/<format>/. Nothing leaves this Mac.
import { existsSync, statSync } from "node:fs";
import { join, normalize, relative } from "node:path";

import { motionRoutes } from "./src/motion/routes";

const PORT = Number(process.env.PORT ?? 4500);
const HOST = "127.0.0.1";
const ROOT = import.meta.dir;
const LIBRARY = join(ROOT, "library");
const STATIC = join(ROOT, "static");
const EXPORTS_DIR = join(ROOT, "exports");

/** A file under `base`, or null if the path tries to leave it. */
function inside(base: string, rel: string): string | null {
  let clean: string;
  try {
    clean = decodeURIComponent(rel);
  } catch {
    return null;
  } // malformed encoding
  const file = normalize(join(base, clean));
  return relative(base, file).startsWith("..") ? null : file;
}

function serveFile(file: string | null): Response {
  if (!file || !existsSync(file) || !statSync(file).isFile()) return new Response("Not found", { status: 404 });
  return new Response(Bun.file(file), { headers: { "cache-control": "no-store" } });
}

async function bundle(entry: string): Promise<Response> {
  const result = await Bun.build({ entrypoints: [join(ROOT, "src", entry)], target: "browser", format: "esm" });
  if (!result.success) return new Response(result.logs.map(String).join("\n"), { status: 500 });
  return new Response(await result.outputs[0]!.text(), { headers: { "content-type": "text/javascript" } });
}

// Loopback is the boundary: every route also requires a local Host header, which closes DNS rebinding (a
// foreign site pointing its name at 127.0.0.1 would send its own Host).
type Handler = (req: never, server?: never) => Response | Promise<Response>;
const LOCAL_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const guard = (h: Handler): Handler =>
  ((req: Request, srv?: never) =>
    LOCAL_HOSTS.has(req.headers.get("host") ?? "")
      ? (h as (r: Request, s?: never) => Response | Promise<Response>)(req, srv)
      : new Response("Forbidden host", { status: 403 })) as Handler;
function localOnly<T>(routes: T): T {
  return Object.fromEntries(
    Object.entries(routes as Record<string, unknown>).map(([path, v]) => [
      path,
      typeof v === "function"
        ? guard(v as Handler)
        : Object.fromEntries(Object.entries(v as Record<string, Handler>).map(([m, h]) => [m, guard(h)])),
    ]),
  ) as T;
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  routes: localOnly({
    // the studio's home is the Motion room's landing; /posts is the list of published posts (a Motion room page)
    "/": () => serveFile(join(STATIC, "motion.html")),
    "/posts": () => Response.redirect("/#/posts", 302),
    "/favicon.ico": () => serveFile(join(LIBRARY, "logo", "favicon.ico")),
    "/build/motion.js": () => bundle("motion/app.ts"),
    "/build/wallpapers.js": () => bundle("../motion/src/site/wallpaperMaker.ts"),
    ...motionRoutes,
    "/static/*": (req: Request) => serveFile(inside(STATIC, new URL(req.url).pathname.slice("/static/".length))),
    "/library/*": (req: Request) => serveFile(inside(LIBRARY, new URL(req.url).pathname.slice("/library/".length))),
    "/exports/*": (req: Request) => serveFile(inside(EXPORTS_DIR, new URL(req.url).pathname.slice("/exports/".length))),
  }),
  fetch: () => new Response("Not found", { status: 404 }),
});

console.log(`rotli studio · ${server.url}`);
