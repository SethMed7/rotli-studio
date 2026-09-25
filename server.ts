// rotli studio: a local-only server (127.0.0.1) for the asset library, the
// post editor, slide rendering, and PNG export. Posts are plain JSON files in
// posts/; exports land in exports/<slug>/<format>/. Nothing leaves this Mac.
import type { BunRequest } from "bun";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join, normalize, relative } from "node:path";

import { exportPost, EXPORTS_DIR } from "./src/exporter";
import { FORMATS, type FormatId, type LibraryItem, type Post } from "./src/model";
import { motionRoutes } from "./src/motion/routes";

const PORT = Number(process.env.PORT ?? 4500);
const HOST = "127.0.0.1";
const ROOT = import.meta.dir;
const LIBRARY = join(ROOT, "library");
const POSTS = join(ROOT, "posts");
const STATIC = join(ROOT, "static");
mkdirSync(join(LIBRARY, "uploads"), { recursive: true });
mkdirSync(POSTS, { recursive: true });

// raster only: an uploaded SVG could carry script and run on the studio's origin
const IMAGE_TYPES = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

/** A file under `base`, or null if the path tries to leave it. */
function inside(base: string, rel: string): string | null {
  let clean: string; try { clean = decodeURIComponent(rel); } catch { return null; } // malformed encoding
  const file = normalize(join(base, clean));
  return relative(base, file).startsWith("..") ? null : file;
}

function serveFile(file: string | null): Response {
  if (!file || !existsSync(file) || !statSync(file).isFile()) return new Response("Not found", { status: 404 });
  return new Response(Bun.file(file), { headers: { "cache-control": "no-store" } });
}

function library(): LibraryItem[] {
  const items: LibraryItem[] = [];
  for (const shelf of readdirSync(LIBRARY)) {
    const dir = join(LIBRARY, shelf);
    if (!statSync(dir).isDirectory()) continue;
    for (const name of readdirSync(dir).sort()) {
      const file = join(dir, name);
      if (!statSync(file).isFile() || name.startsWith(".")) continue;
      items.push({ shelf, name, url: `/library/${shelf}/${encodeURIComponent(name)}`, bytes: statSync(file).size });
    }
  }
  return items;
}

function postFile(slug: string): string | null {
  return /^[a-z0-9-]{1,48}$/.test(slug) ? join(POSTS, `${slug}.json`) : null;
}

async function readPost(slug: string): Promise<Post | null> {
  const file = postFile(slug);
  return file && existsSync(file) ? ((await Bun.file(file).json()) as Post) : null;
}

async function bundle(entry: string): Promise<Response> {
  const result = await Bun.build({ entrypoints: [join(ROOT, "src", entry)], target: "browser", format: "esm" });
  if (!result.success) return new Response(result.logs.map(String).join("\n"), { status: 500 });
  return new Response(await result.outputs[0]!.text(), { headers: { "content-type": "text/javascript" } });
}

const json = (data: unknown, status = 200) => Response.json(data, { status });

// Loopback is the boundary: every route also requires a local Host header, which closes DNS rebinding (a
// foreign site pointing its name at 127.0.0.1 would send its own Host).
type Handler = (req: never, server?: never) => Response | Promise<Response>;
const LOCAL_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const guard = (h: Handler): Handler => ((req: Request, srv?: never) => (LOCAL_HOSTS.has(req.headers.get("host") ?? "") ? (h as (r: Request, s?: never) => Response | Promise<Response>)(req, srv) : new Response("Forbidden host", { status: 403 }))) as Handler;
function localOnly<T>(routes: T): T {
  return Object.fromEntries(Object.entries(routes as Record<string, unknown>).map(([path, v]) => [path, typeof v === "function" ? guard(v as Handler) : Object.fromEntries(Object.entries(v as Record<string, Handler>).map(([m, h]) => [m, guard(h)]))])) as T;
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  routes: localOnly({
    // the studio's home is the Motion room's landing; the content editor lives at /create, and /posts is the
    // list of published posts (a page of the Motion room)
    "/": () => serveFile(join(STATIC, "motion.html")),
    "/create": () => serveFile(join(STATIC, "app.html")),
    "/posts": () => Response.redirect("/#/posts", 302),
    "/favicon.ico": () => serveFile(join(LIBRARY, "logo", "favicon.ico")),
    "/render": () => serveFile(join(STATIC, "render.html")),
    "/build/app.js": () => bundle("app.ts"),
    "/build/render.js": () => bundle("render.ts"),
    "/build/motion.js": () => bundle("motion/app.ts"),
    ...motionRoutes,
    "/static/*": (req: Request) => serveFile(inside(STATIC, new URL(req.url).pathname.slice("/static/".length))),
    "/library/*": (req: Request) => {
      const res = serveFile(inside(LIBRARY, new URL(req.url).pathname.slice("/library/".length)));
      // uploads are user files: never let one run as a document on this origin
      if (new URL(req.url).pathname.startsWith("/library/uploads/")) { res.headers.set("content-security-policy", "sandbox; default-src 'none'"); res.headers.set("x-content-type-options", "nosniff"); }
      return res;
    },
    "/exports/*": (req: Request) => serveFile(inside(EXPORTS_DIR, new URL(req.url).pathname.slice("/exports/".length))),

    "/api/library": () => json(library()),

    "/api/upload": {
      POST: async (req: Request) => {
        const form = await req.formData();
        const saved: string[] = [];
        for (const value of form.getAll("file")) {
          if (!(value instanceof File)) continue;
          const ext = extname(value.name).toLowerCase();
          if (!IMAGE_TYPES.has(ext)) continue;
          const name = value.name.replace(/[^\w.-]+/g, "-");
          await Bun.write(join(LIBRARY, "uploads", name), value);
          saved.push(`/library/uploads/${encodeURIComponent(name)}`);
        }
        return json({ saved });
      },
    },

    "/api/posts": {
      GET: async () => {
        const posts = await Promise.all(
          readdirSync(POSTS)
            .filter((name) => name.endsWith(".json"))
            .map(async (name) => (await Bun.file(join(POSTS, name)).json()) as Post),
        );
        return json(posts.map(({ slug, title, format, slides }) => ({ slug, title, format, slides: slides.length })));
      },
    },

    "/api/posts/:slug": {
      GET: async (req: BunRequest<"/api/posts/:slug">) => {
        const post = await readPost(req.params.slug);
        return post ? json(post) : json({ error: "No such post" }, 404);
      },
      PUT: async (req: BunRequest<"/api/posts/:slug">) => {
        const file = postFile(req.params.slug);
        if (!file) return json({ error: "Bad slug" }, 400);
        const post = (await req.json()) as Post;
        post.slug = req.params.slug;
        writeFileSync(file, `${JSON.stringify(post, null, 2)}\n`);
        return json({ ok: true });
      },
      DELETE: (req: BunRequest<"/api/posts/:slug">) => {
        const file = postFile(req.params.slug);
        if (file && existsSync(file)) unlinkSync(file);
        return json({ ok: true });
      },
    },

    "/api/export/:slug": {
      POST: async (req: BunRequest<"/api/export/:slug">) => {
        const post = await readPost(req.params.slug);
        if (!post) return json({ error: "Save the post first" }, 404);
        const text = await req.text(); let body: { formats?: FormatId[] } = {};
        if (text) { try { body = JSON.parse(text); } catch { return json({ error: "Bad JSON" }, 400); } }
        const formats = (body.formats ?? [post.format]).filter((f) => f in FORMATS);
        const { dir, files } = await exportPost(server.url.origin, post, formats);
        return json({
          dir,
          files: files.map((file) => `/exports/${relative(EXPORTS_DIR, file).split("/").map(encodeURIComponent).join("/")}`),
        });
      },
    },

    "/api/reveal/:slug": {
      POST: (req: BunRequest<"/api/reveal/:slug">) => {
        const dir = join(EXPORTS_DIR, req.params.slug);
        if (!/^[a-z0-9-]+$/.test(req.params.slug) || !existsSync(dir)) return json({ error: "Nothing exported yet" }, 404);
        Bun.spawn(["open", dir]);
        return json({ ok: true });
      },
    },
  }),
  fetch: () => new Response("Not found", { status: 404 }),
});

console.log(`rotli studio · ${server.url}`);
