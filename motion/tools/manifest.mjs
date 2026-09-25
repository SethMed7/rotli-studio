// MANIFEST: everything the studio site shows, read from the source of truth, in one JSON file.
//
//   node tools/manifest.mjs            -> out/manifest.json
//
// For every piece in pieces.json: its module and host, the film's own meta and shots (imported from the
// module, the way build-page does, so the site can never disagree with the render), the derive spec that
// cuts its vertical/carousel/card, the brief + prompt + agent run that made it, its golden, and its outputs
// on disk. series.json groups pieces into series and episodes. A piece that fails to import is listed with
// its error instead of stopping the run.
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOM = resolve(dirname(fileURLToPath(import.meta.url)), ".."), EXPORTS = resolve(ROOM, "../exports");
const read = (p) => JSON.parse(readFileSync(join(ROOM, p), "utf8"));
const rel = (p) => relative(ROOM, p);
const pieces = read("pieces.json").pieces, series = read("series.json").series;
const runs = existsSync(join(ROOM, "workflows/runs/runs.json")) ? read("workflows/runs/runs.json").runs : [];
const briefs = Object.fromEntries(readdirSync(join(ROOM, "season/episodes")).filter((f) => f.endsWith(".json")).map((f) => { const b = read(`season/episodes/${f}`); return [b.id, { ...b, file: `season/episodes/${f}` }]; }));

// id -> module, from the host's import line (the same file the renderer bundles)
const moduleOf = (id) => { const host = join(ROOM, "src/hosts", `page-${id}.ts`); if (!existsSync(host)) return null; const m = readFileSync(host, "utf8").match(/from "\.\.\/canvas-core\/([\w/]+)"/); return m ? `src/canvas-core/${m[1]}.ts` : null; };
const loaded = new Map();
const load = async (mod) => {
  if (!loaded.has(mod)) loaded.set(mod, (async () => {
    const out = await build({ entryPoints: [join(ROOM, mod)], bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
    return import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
  })());
  return loaded.get(mod);
};
const DERIV = /(Vertical|Carousel|Single)$/;
const episodeOf = (id) => id.match(/^(s\d\de\d\d|ep\d\d)/)?.[1] ?? null;
const roleOf = (id) => (DERIV.test(id) ? id.match(DERIV)[1].toLowerCase() : episodeOf(id) ? "episode" : "piece");
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16);

const out = [];
for (const p of pieces) {
  const mod = moduleOf(p.id), ep = episodeOf(p.id), role = roleOf(p.id);
  const e = { ...p, role, episode: ep, module: mod, host: `src/hosts/page-${p.id}.ts`, series: null, meta: null, shots: [], derive: null, error: null };
  e.series = series.find((s) => (s.kind === "episodes" ? ep && ep.startsWith(s.prefix) : s.pieces.includes(p.id)))?.id ?? null;
  if (mod) try {
    const m = await load(mod), film = m[p.id];
    if (!film) throw new Error(`${mod} does not export ${p.id}`);
    e.meta = film.meta; e.shots = film.shots.map((s) => ({ id: s.id, start: s.start, end: s.end }));
    // a representative still for posters: the middle of the longest scene that isn't a card (title, chapter, end)
    const body = e.shots.filter((s) => !/^(title|chapter|end|cover|close|slide\d*)$/.test(s.id)), pick = (body.length ? body : e.shots).reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a), e.shots[0]);
    if (pick) e.posterFrame = Math.floor((pick.start + pick.end) / 2);
    // the episode's derive spec lives in the episode module (its derivatives import it)
    const dk = Object.keys(m).find((k) => /Derive$/.test(k));
    if (role === "episode" && dk) e.derive = m[dk];
  } catch (err) { e.error = String(err.message ?? err).split("\n")[0]; }
  // story episodes: pair each shot with the brief's scene template
  const brief = Object.values(briefs).find((b) => ep && b.id?.toLowerCase().startsWith(ep));
  if (brief && role === "episode") { e.brief = brief.file; e.title = [].concat(brief.title).join(" "); e.logline = brief.logline; e.atmosphere = brief.atmosphere; e.style = brief.style; e.features = brief.features; e.next = brief.next;
    for (const s of e.shots) { const sc = brief.scenes?.find((x) => x.id === s.id); if (sc) s.template = sc.template; } }
  if (role === "episode" && !brief) e.title = (p.about ?? "").split(": ").slice(1).join(": ") || p.id;
  const promptFile = ep && `workflows/prompts/${ep}.prompt.md`; if (role === "episode" && promptFile && existsSync(join(ROOM, promptFile))) e.prompt = promptFile;
  const run = runs.find((r) => r.piece === p.id); if (run) e.run = run;
  const g = join(ROOM, "golden", `${p.id}.json`); if (existsSync(g)) { const gj = JSON.parse(readFileSync(g, "utf8")); e.golden = { file: rel(g), frames: Object.keys(gj.hashes ?? {}).length, audio: !!gj.audio }; }
  const vid = join(ROOM, "out/video", `${p.slug}.mp4`), poster = join(ROOM, "out/video", `${p.slug}.jpg`);
  if (p.kind === "video" && existsSync(vid)) e.video = { file: rel(vid), poster: existsSync(poster) ? rel(poster) : null, bytes: statSync(vid).size, rendered: statSync(vid).mtime.toISOString(), sha: sha(vid) };
  const slides = join(EXPORTS, p.slug, p.format ?? "");
  if (p.kind !== "video" && existsSync(slides)) e.slides = readdirSync(slides).filter((f) => f.endsWith(".png")).sort().map((f) => `../exports/${p.slug}/${p.format}/${f}`);
  out.push(e);
}

// series -> episodes (main + its cuts) or a flat set
const bySeries = series.map((s) => {
  const mine = out.filter((e) => e.series === s.id);
  if (s.kind !== "episodes") return { ...s, pieces: s.pieces.filter((id) => mine.some((e) => e.id === id)) };
  const eps = [...new Set(mine.map((e) => e.episode))].sort().map((code) => {
    const parts = mine.filter((e) => e.episode === code), main = parts.find((e) => e.role === "episode");
    return { code, main: main?.id ?? null, title: main?.title ?? code, cuts: Object.fromEntries(parts.filter((e) => e.role !== "episode").map((e) => [e.role, e.id])) };
  });
  return { ...s, episodes: eps };
});
const manifest = { generated: new Date().toISOString(), room: "motion", pieces: out, series: bySeries, unassigned: out.filter((e) => !e.series).map((e) => e.id) };
writeFileSync(join(ROOM, "out/manifest.json"), JSON.stringify(manifest, null, 1));
const bad = out.filter((e) => e.error);
console.log(`manifest: ${out.length} pieces · ${bySeries.length} series · ${bad.length} import errors · unassigned ${manifest.unassigned.length} -> out/manifest.json`);
for (const e of bad) console.log(`  ! ${e.id}: ${e.error}`);
for (const id of manifest.unassigned) console.log(`  ? ${id} is in no series`);
