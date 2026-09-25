// The Motion room: every series, episode, cut and piece in motion/, broken down to its scenes, the
// brief and prompt that asked for it, the agent run that built it, its source and its golden. Plus the
// brand, workflows, skills, tools, docs and the isolation audit. Read-only; hash-routed.
import { esc, markdown } from "./md";
import { filmPlayer, mountFilmPlayers } from "./player";
import { cue, mountSound } from "./sound";

type Shot = { id: string; start: number; end: number; template?: string };
type Beat = { frame: number; crop: { x: number; y: number; w: number; h: number }; title: string; sub?: string; hi?: string; len?: number };
type Run = { piece: string; description: string; launched: string; model: string | null; followUps: number; tokens: number; minutes: number; file: string };
type Piece = {
  id: string; kind: "video" | "carousel" | "still"; slug: string; format: string; about?: string; caption?: string; sealed?: boolean;
  role: "episode" | "vertical" | "carousel" | "single" | "piece"; episode: string | null; series: string | null; module: string | null; host: string;
  meta: { W: number; H: number; fps: number; durationFrames: number; family?: string } | null; shots: Shot[]; error: string | null;
  derive: { no: number; label?: string; line?: boolean; vertical: Beat[]; slides: Beat[]; single: Beat } | null;
  brief?: string; title?: string; logline?: string; atmosphere?: string; style?: string; next?: string; features?: { claim: string; source: string }[];
  prompt?: string; run?: Run; golden?: { file: string; frames: number; audio: boolean };
  video?: { file: string; poster: string | null; bytes: number; rendered: string; sha: string }; slides?: string[]; posterFrame?: number;
};
type Episode = { code: string; main: string | null; title: string; cuts: Partial<Record<"vertical" | "carousel" | "single", string>> };
type Series = { id: string; title: string; kind: "episodes" | "set"; shape: string; logline: string; docs: string[]; schedule?: string; sealed: boolean; episodes?: Episode[]; pieces?: string[] };
type Manifest = { generated: string; pieces: Piece[]; series: Series[] };

// STATIC: the hosted, read-only snapshot (scripts/export-site.ts). No server: API answers are .json files,
// and anything that renders, verifies or audits on this Mac is left out.
const STATIC = (window as unknown as { STUDIO_STATIC?: boolean }).STUDIO_STATIC === true;
const api = (name: string) => (STATIC ? `/api/motion/${name}.json` : `/api/motion/${name}`);
const $ = (s: string) => document.querySelector<HTMLElement>(s)!;
const main = $("#main"), nav = $("#nav");
let M: Manifest;
const byId = (id: string) => M.pieces.find((p) => p.id === id);
// Every navigation bumps `gen`; a fetch started under an older navigation throws Stale when it resolves, so
// a slow response for page A can never be written into page B.
let gen = 0;
class Stale extends Error {}
const text = async (url: string) => { const g = gen, r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); const t = await r.text(); if (g !== gen) throw new Stale(); return t; };
const json = async <T>(url: string, init?: RequestInit) => { const g = gen, r = await fetch(url, init); if (!r.ok) throw new Error(`${r.status} ${url}`); const v = (await r.json()) as T; if (g !== gen) throw new Stale(); return v; };
/** a section that failed to load says so (and a stale one says nothing) */
const failed = (el: HTMLElement | null) => (e: unknown) => { if (!(e instanceof Stale) && el) el.innerHTML = `<p class="error">Could not load this: ${esc(String(e))}. <button class="link" type="button" onclick="location.reload()">Retry</button></p>`; };
const smooth = (): ScrollBehavior => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
/** Markdown shown inside a page that already has its h1: every heading steps down one level */
const embedded = (html: string) => html.replace(/<(\/?)h([1-5])(\b[^>]*)>/g, (_, slash: string, n: string, rest: string) => `<${slash}h${Number(n) + 1}${rest}>`);
const secs = (frames: number, fps = 30) => `${(frames / fps).toFixed(frames % fps ? 1 : 0)} s`;
const tc = (f: number, fps = 30) => `${Math.floor(f / fps / 60)}:${String(Math.floor(f / fps) % 60).padStart(2, "0")}.${String(f % fps).padStart(2, "0")}`;
const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
const m = (path: string) => `/m/${path}`;
const s = (path: string) => `/s/${path.replace(/^\.\.\//, "")}`;
const fileUrl = (p: string) => (p.startsWith("../") ? s(p) : m(p));
// posters: a frame from the longest scene (the render's own .jpg is its last frame, the end card)
const poster = (p: Piece | undefined) => (!p ? "" : p.video && p.posterFrame !== undefined ? `/api/motion/thumb/${p.slug}/${p.posterFrame}.jpg` : p.video?.poster ? m(p.video.poster) : p.slides?.[0] ? s(p.slides[0]) : "");
const epNo = (code: string) => code.replace(/^(s\d\de|ep)/, ""); // "01" in both series
const chip = (t: string, cls = "") => `<span class="chip ${cls}">${esc(t)}</span>`;
const seriesOf = (id: string | null) => M.series.find((x) => x.id === id);

// ---------------------------------------------------------------- nav: one tree; the open series lists its episodes
function renderNav(route: string, pieceId?: string) {
  const here = (href: string) => route === href || (href !== "#/" && route.startsWith(href + "/")) || (href.length > 2 && route.startsWith(href + "?"));
  const link = (href: string, label: string, count?: number | string) => `<a href="${href}" ${here(href) ? 'aria-current="page"' : ""}><span>${esc(label)}</span>${count !== undefined ? `<small>${count}</small>` : ""}</a>`;
  const tree = (x: Series) => {
    if (!here(`#/series/${x.id}`)) return "";
    const items = x.episodes ? x.episodes.map((e) => ({ id: e.main ?? "", label: e.title.replace(/\.$/, ""), num: epNo(e.code), ids: [e.main, ...Object.values(e.cuts)] })) : (x.pieces ?? []).map((id) => ({ id, label: byId(id)?.title ?? id, num: "", ids: [id] }));
    return `<div class="tree">${items.map((it) => `<a href="#/piece/${it.id}" ${pieceId && it.ids.includes(pieceId) ? 'aria-current="page"' : ""}>${it.num ? `<span class="num">${it.num}</span>` : ""}<span>${esc(it.label)}</span></a>`).join("")}</div>`;
  };
  const group = (name: string, body: string) => `<div class="group"><span class="group-name">${name}</span>${body}</div>`;
  nav.innerHTML = `${link("#/", "Home")}${link("#/library", "Library", M.pieces.length)}${link("#/posts", "Posts")}
    ${group("Films", M.series.map((x) => link(`#/series/${x.id}`, x.title.replace(/:.*/, ""), x.episodes ? x.episodes.length : x.pieces?.length) + tree(x)).join(""))}
    ${group("How it's made", `${link("#/brand", "Brand & atmospheres")}${link("#/sound", "Sound")}${link("#/workflows", "Workflows & prompts")}${link("#/runs", "Agent runs", M.pieces.filter((p) => p.run).length)}${link("#/skills", "Skills")}${link("#/tools", "Tools")}`)}
    ${group("About", `${link("#/docs", "Docs & licences")}${link("#/isolation", "Isolation audit")}`)}`;
}

// ---------------------------------------------------------------- home: the landing page
// the landing poster: the island at the ferry, full size (the scene thumbnails are only 640 px wide)
export const HERO_POSTER_FRAME = 45;
let stopPlayers: (() => void) | null = null;
const stats = () => { const vids = M.pieces.filter((p) => p.kind === "video" && p.meta); return { pieces: M.pieces.length, episodes: M.series.reduce((a, x) => a + (x.episodes?.length ?? 0), 0), minutes: vids.reduce((a, p) => a + p.meta!.durationFrames / 30, 0) / 60, goldens: M.pieces.filter((p) => p.golden).length, runs: M.pieces.filter((p) => p.run).length }; };
const seriesRows = (h: 2 | 3 = 3) => `<ul class="rows">${M.series.map((x) => { const first = x.episodes ? byId(x.episodes[0]?.main ?? "") : byId(x.pieces?.[0] ?? "");
  return `<li><a class="row" href="#/series/${x.id}"><img src="${poster(first)}" alt="" loading="lazy"><div><h${h} class="row-title">${esc(x.title)}${x.sealed ? chip("sealed", "lock") : ""}</h${h}><p>${esc(x.logline)}</p><p class="meta">${esc(x.shape)}</p></div><span class="go" aria-hidden="true">→</span></a></li>`; }).join("")}</ul>`;
function home() {
  const film = byId("rotliStory"), n = stats();
  main.innerHTML = `<section class="hero">
      <h1>Rotli, <span class="ink">drawn in code.</span></h1>
      <p class="lede">Rotli is the calm notes app for your Mac. This is its studio: every film, episode, carousel and card here is drawn frame by frame in code, and everything that made them is open: the briefs, the prompts, the agent runs and the tools that make them again.</p>
      <div class="ctas"><a class="button lg" href="#/piece/rotliStory">Watch the film</a><a class="button ghost lg" href="#/library">Browse the library</a></div>
      <p class="fine">Open source · MIT · ${n.pieces} pieces, ${n.minutes.toFixed(0)} minutes of film</p>
    </section>
    ${film?.video ? `<section class="film">${filmPlayer(m(film.video.file), `/api/motion/poster/${film.slug}/${HERO_POSTER_FRAME}.jpg`, "The Rotli Story: a 60-second film of a quokka on Rottnest, from the ferry to the sunset")}
      <p class="film-caption"><span><b>The Rotli Story</b> · 60 s · a quokka on Rottnest, from the ferry to the sunset</span><a class="link" href="#/piece/rotliStory">Scene by scene →</a></p></section>` : ""}
    <section class="band tinted"><div class="inner">
      <h2>Everything we've made, by series.</h2>
      <p class="intro">Each series groups its episodes with the cuts made from them: a vertical for Reels and Shorts, a carousel and a card. Open any piece to see its scenes, the brief behind it and the run that built it.</p>
      ${seriesRows()}
    </div></section>
    <section class="band deep"><div class="inner">
      <h2>How a piece gets made.</h2>
      <p class="intro">The same five steps for every episode, so any piece can be made again from its files.</p>
      <ol class="steps">
        <li><b>A brief</b><p>A JSON file holds the story, the atmosphere, the scenes and every claim a caption may make, each with its source on rotli.co.</p></li>
        <li><b>A prompt</b><p>The brief plus a shared preamble becomes the agent's prompt, deterministically (<code>brief-to-prompt</code>).</p></li>
        <li><b>A build</b><p>An agent draws the episode in code on the studio's engine and renders review sheets. Every run is kept, prompt and report.</p></li>
        <li><b>A review</b><p>Every sheet is checked against the checklist: claims match the product, nothing overlaps, no dead air.</p></li>
        <li><b>A golden</b><p>Sampled frames and the audio are hashed. After any change to shared code, the goldens prove what moved; the first film can never change.</p></li>
      </ol>
    </div></section>
    <section class="band"><div class="inner split">
      <div><h2>Open, all the way down.</h2><p class="intro">The studio is public under the MIT licence, like Rotli. The render engine began as anidoodle by Alex Greenshpun (Apache-2.0).</p>
        <ul class="numbers"><li><b>${n.pieces}</b>pieces</li><li><b>${n.episodes}</b>episodes</li><li><b>${n.goldens}</b>goldens</li><li><b>${n.runs}</b>agent runs</li></ul></div>
      <ul class="links">
        <li><a href="#/workflows">Workflows &amp; prompts →</a><p>How a piece is made, and the exact prompt each episode was built from.</p></li>
        <li><a href="#/runs">Agent runs →</a><p>Every request in the owner's words, and each agent's prompt, follow-ups and report.</p></li>
        <li><a href="#/brand">Brand &amp; atmospheres →</a><p>The palette, type, twelve theme environments and the moods scenes are set in.</p></li>
        <li><a href="https://github.com/SethMed7/rotli-studio" target="_blank" rel="noreferrer">Source on GitHub →</a><p>The engine, tools, skills and every piece's code.</p></li>
      </ul>
    </div></section>
    <footer class="site-foot"><span>rotli studio · ${STATIC ? `snapshot of ${new Date(M.generated).toLocaleDateString()}` : "running on this Mac"}</span><span><a href="https://rotli.co" target="_blank" rel="noreferrer">rotli.co</a> · <a href="#/docs?doc=..%2FLICENSE">MIT</a> · <a href="#/docs?doc=..%2FNOTICE">Notices</a></span></footer>`;
}

// ---------------------------------------------------------------- library: every series
function library() {
  const n = stats();
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Library</nav><header class="page-head"><h1>Library</h1><p>Every piece, grouped by series. ${n.pieces} pieces · ${n.episodes} episodes · ${n.minutes.toFixed(1)} minutes of video · ${n.goldens} goldens.</p></header>
    ${seriesRows(2)}
    <p class="foot">Manifest built ${new Date(M.generated).toLocaleString()}${STATIC ? " · a read-only snapshot of the studio." : ` · <button class="link" id="rebuild">Rebuild</button> after rendering or editing <code>pieces.json</code> / <code>series.json</code>.`}</p>`;
  if (!STATIC) $("#rebuild").onclick = async () => { M = await json<Manifest>("/api/motion/manifest", { method: "POST" }); route(); };
}

// ---------------------------------------------------------------- posts: what has been published, as links
type Post = { platform: string; url: string; date: string; text: string; pieces: string[] };
async function posts() {
  const data = await json<{ posts: Post[] }>(m("posts.json"));
  const when = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Posts</nav><header class="page-head"><h1>Posts</h1><p>Where the studio's work has been published. Each entry links to the post on its platform, with the pieces it shares.</p>
    <details class="maintainer"><summary>How a post gets here</summary><p>Only links to the owner's own accounts are accepted: <code>bun scripts/link-post.ts &lt;url&gt; [--piece &lt;id&gt;]</code> checks the URL against the account patterns in <code>publish/posts.json</code>, and the change reaches this page only through a push by the repository owner. The check is on the link's account handle; the post itself stays on its platform.</p></details></header>
    ${data.posts.length ? `<ul class="posts">${data.posts.map((p) => `<li class="post"><time datetime="${esc(p.date)}">${esc(when(p.date))}</time>
      <div><p class="post-text">${p.text ? esc(p.text) : `A post on ${esc(p.platform)}`}</p>${p.pieces.length ? `<div class="post-pieces">${p.pieces.map((id) => { const pc = byId(id); return pc ? `<a href="#/piece/${pc.id}"><img src="${poster(pc)}" alt="" loading="lazy"><span>${esc(pc.title ?? pc.id)}</span></a>` : ""; }).join("")}</div>` : ""}</div>
      ${/^https:\/\//.test(p.url) ? `<a class="button ghost" href="${esc(p.url)}" target="_blank" rel="noreferrer">Open on ${esc(p.platform)}</a>` : ""}</li>`).join("")}</ul>` : `<p class="empty">Nothing linked yet.</p>`}`;
}

// ---------------------------------------------------------------- sound: the studio's music and effects, with their prompts
async function sound() {
  const cat = await json<{ made: string; sounds: { id: string; kind: string; title: string; use: string; prompt: string; file: string; seconds: number }[] }>("/sound/catalog.json");
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Sound</nav><header class="page-head"><h1>Sound</h1><p>The studio's music and effects, composed in code like the films: no samples and no AI audio model. Each one has the prompt it was made from and the recipe that realizes it (<code>sound/src/recipes.ts</code>); <code>bun sound/tools/render.ts</code> makes the same files every time. Turn them on with <b>Sound</b> in the top bar; the music steps aside whenever a film plays with sound.</p></header>
    <ul class="sounds">${cat.sounds.map((x) => `<li class="sound" id="sound-${esc(x.id)}"><div class="sound-head"><h2>${esc(x.title)}</h2><p class="meta">${x.kind === "music" ? "music · loops" : "effect"} · ${x.seconds.toFixed(1)} s · ${esc(x.use)}</p></div>
      <audio controls preload="none" src="/${esc(x.file)}" aria-label="Play ${esc(x.title)}"></audio>
      <details><summary>The prompt</summary><div class="doc" data-prompt="${esc(x.prompt)}"></div></details>
      <p class="meta"><a class="link" href="/${esc(x.prompt)}" target="_blank">${esc(x.prompt)}</a> · <a class="link" href="/${esc(x.file)}" download>Download ${esc(x.id)}.m4a</a></p></li>`).join("")}</ul>
    <p class="foot">${esc(cat.made)}.</p>`;
  main.querySelectorAll<HTMLElement>("[data-prompt]").forEach((el) => { void text(`/${el.dataset.prompt}`).then((t) => (el.innerHTML = embedded(embedded(markdown(t))))).catch(failed(el)); });
}

// ---------------------------------------------------------------- series
function series(id: string) {
  const x = seriesOf(id); if (!x) return notFound();
  const docs = [...x.docs, ...(x.schedule ? [x.schedule] : [])];
  const head = `<nav class="crumbs"><a href="#/">Studio</a> › <a href="#/library">Library</a> › ${esc(x.title.replace(/:.*/, ""))}</nav><header class="page-head"><h1>${esc(x.title)}${x.sealed ? chip("sealed", "lock") : ""}</h1><p>${esc(x.logline)}</p><p class="meta">${esc(x.shape)}</p>${docs.length ? `<p class="docs">${docs.map((d) => `<a href="#/doc/${encodeURIComponent(d)}">${esc(d.replace(/^\.\.\//, ""))}</a>`).join("")}</p>` : ""}</header>`;
  if (x.episodes) {
    const total = x.episodes.reduce((a, e) => a + (byId(e.main ?? "")?.run?.tokens ?? 0), 0);
    main.innerHTML = head + `<ol class="episodes">${x.episodes.map((e) => { const p = byId(e.main ?? ""); if (!p) return "";
      const cut = (k: "vertical" | "carousel" | "single", label: string) => { const c = byId(e.cuts[k] ?? ""); return c ? `<a class="cut" href="#/piece/${c.id}"><img src="${poster(c)}" alt="${label} for ${esc(e.title)}" loading="lazy"><span>${label}</span></a>` : ""; };
      const built = p.run ? `agent · ${(p.run.tokens / 1000).toFixed(0)}k tokens · ${p.run.minutes} min` : p.id.startsWith("s01e01") || p.id.startsWith("ep01") ? "hand-built reference" : "";
      const bits = [p.meta ? secs(p.meta.durationFrames) : "", p.atmosphere ?? "", p.style ? `${p.style} style` : "", p.shots.length ? `${p.shots.length} scenes` : "", built, p.golden ? "golden locked" : "no golden"].filter(Boolean);
      return `<li class="episode"><a class="ep-poster" href="#/piece/${p.id}" tabindex="-1" aria-hidden="true"><img src="${poster(p)}" alt="" loading="lazy"></a>
        <div class="ep-body"><h2><span class="num">${epNo(e.code)}</span><a href="#/piece/${p.id}">${esc(e.title)}</a></h2><p>${esc(p.logline ?? p.about ?? "")}</p><p class="meta">${bits.map(esc).join(" · ")}</p></div>
        <div class="cuts">${cut("vertical", "9:16")}${cut("carousel", "carousel")}${cut("single", "card")}</div></li>`; }).join("")}</ol>
      ${total ? `<p class="foot">Agent cost for this series: ${(total / 1e6).toFixed(2)}M tokens across ${x.episodes.filter((e) => byId(e.main ?? "")?.run).length} runs; episode 01 is the hand-built reference.</p>` : ""}`;
  } else {
    main.innerHTML = head + `<div class="pieces">${(x.pieces ?? []).map((pid) => { const p = byId(pid)!; return `<a class="piece-link" href="#/piece/${p.id}"><img src="${poster(p)}" alt="" loading="lazy"><b>${esc(p.title ?? p.id)}${p.sealed ? chip("sealed", "lock") : ""}</b><p class="meta">${esc(p.kind)} · ${esc(p.format)}${p.meta && p.kind === "video" ? ` · ${secs(p.meta.durationFrames)}` : ""}</p><p>${esc(p.about ?? "")}</p></a>`; }).join("")}</div>`;
  }
}

// ---------------------------------------------------------------- piece
/** a slide's description: cover, the beat it was cut from (derive spec), or the closing card */
const sentences = (...parts: (string | undefined)[]) => parts.filter(Boolean).map((x) => x!.trim()).map((x, i, all) => (i < all.length - 1 && !/[.!?:]$/.test(x) ? `${x}.` : x)).join(" ");
function slideAlt(p: Piece, ep: Piece | undefined, i: number, n: number): string {
  const spec = ep?.derive, title = p.title ?? ep?.title ?? p.id;
  if (p.role === "single" && spec) return `${title}: ${sentences(spec.single.title, spec.single.sub)}`;
  if (p.role === "carousel" && spec) { if (i === 0) return `Slide 1 of ${n}, cover: ${title}`; if (i === n - 1) return `Slide ${n} of ${n}: closing card, rotli.co`; const b = spec.slides[i - 1]; if (b) return `Slide ${i + 1} of ${n}: ${sentences(b.title, b.sub)}`; }
  return n > 1 ? `Slide ${i + 1} of ${n} of ${title}: ${p.about ?? ""}` : `${title}: ${p.about ?? ""}`;
}
async function piece(id: string) {
  const p = byId(id); if (!p) return notFound();
  const x = seriesOf(p.series), ep = x?.episodes?.find((e) => e.code === p.episode), main_ = ep ? byId(ep.main ?? "") : undefined;
  const cutTabs = ep ? `<nav class="cut-tabs" aria-label="Formats of this episode">${[["episode", ep.main], ["vertical", ep.cuts.vertical], ["carousel", ep.cuts.carousel], ["single", ep.cuts.single]].filter(([, v]) => v).map(([k, v]) => `<a href="#/piece/${v}"${v === p.id ? ' aria-current="page"' : ""}>${k === "episode" ? "Episode" : k === "single" ? "Card" : k![0]!.toUpperCase() + k!.slice(1)}</a>`).join("")}</nav>` : "";
  const media = p.kind === "video" && p.video
    ? `<div class="player" style="--ar:${p.meta ? `${p.meta.W}/${p.meta.H}` : "16/9"}"><video id="video" controls preload="metadata" playsinline src="${m(p.video.file)}" poster="${poster(p)}"></video></div>`
    : p.slides?.length ? `<div class="slides">${p.slides.map((f, i) => `<a href="${s(f)}" target="_blank"><img src="${s(f)}" alt="${esc(slideAlt(p, main_, i, p.slides!.length))}" loading="lazy"><span aria-hidden="true">${i + 1}</span></a>`).join("")}</div>`
    : `<p class="empty">Not rendered yet: <code>node tools/studio.mjs render ${esc(p.id)}</code></p>`;
  const facts: [string, string][] = [
    ["Kind", `${p.kind} · ${p.format}`], ...(p.meta ? [["Size", `${p.meta.W} × ${p.meta.H}`] as [string, string], ["Length", p.kind === "video" ? `${secs(p.meta.durationFrames)} · ${p.meta.durationFrames} frames @ ${p.meta.fps} fps` : `${p.shots.length} slide(s)`] as [string, string]] : []),
    ...(p.meta?.family ? [["Theme family", p.meta.family] as [string, string]] : []), ...(p.atmosphere ? [["Atmosphere", p.atmosphere] as [string, string]] : []), ...(p.style ? [["Style", p.style] as [string, string]] : []),
    ["Golden", p.golden ? `${p.golden.frames} frames${p.golden.audio ? " + audio" : ""} locked` : "none"], ...(p.video ? [["Render", `${mb(p.video.bytes)} · ${new Date(p.video.rendered).toLocaleString()}`] as [string, string]] : []),
    ...(p.run ? [["Built by", `agent · ${p.run.model ?? "inherited model"} · ${p.run.tokens.toLocaleString()} tokens · ${p.run.minutes} min`] as [string, string]] : []),
  ];
  const sections: [string, string][] = [["breakdown", p.kind === "video" ? "Breakdown" : "Slides"], ...(p.derive || (main_?.derive && p.role !== "episode") ? [["cuts", "Cuts"] as [string, string]] : []), ...(p.brief || main_?.brief ? [["brief", "Brief"] as [string, string]] : []), ...(p.prompt || main_?.prompt ? [["prompt", "Prompt"] as [string, string]] : []), ...((p.run ?? main_?.run) ? [["run", "Agent run"] as [string, string]] : []), ["source", "Source"], ["files", "Files & checks"]];
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › ${x ? `<a href="#/series/${x.id}">${esc(x.title.replace(/:.*/, ""))}</a> › ` : ""}${ep ? `${epNo(ep.code)} · ${esc(ep.title)}` : esc(p.title ?? p.id)}</nav>
    <header class="page-head piece-head"><h1>${esc(p.title ?? (ep ? `${ep.title}` : p.id))}${p.sealed ? chip("sealed", "lock") : ""}</h1><p>${esc(p.logline ?? p.about ?? "")}</p>${p.error ? `<p class="error">Import error: ${esc(p.error)}</p>` : ""}</header>
    ${cutTabs}<div class="piece-top">${media}<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
    <nav class="section-tabs">${sections.map(([k, v]) => `<a href="#sec-${k}">${v}</a>`).join("")}</nav>
    ${sections.map(([k, v]) => `<section id="sec-${k}" class="sec"><h2>${v}</h2><div class="sec-body" data-sec="${k}"><p class="muted">Loading…</p></div></section>`).join("")}`;
  const body = (k: string) => main.querySelector<HTMLElement>(`[data-sec="${k}"]`);
  // breakdown: a timeline the width of the piece, then one card per scene
  const video = main.querySelector<HTMLVideoElement>("#video");
  if (p.kind === "video" && p.meta) {
    const D = p.meta.durationFrames;
    body("breakdown")!.innerHTML = `<div class="timeline">${p.shots.map((sh) => `<button style="flex:${sh.end - sh.start}" data-seek="${sh.start}" aria-label="Seek to ${esc(sh.id)}, ${tc(sh.start)}" title="${esc(sh.id)} · ${tc(sh.start)}–${tc(sh.end)}"><span>${esc(sh.id)}</span></button>`).join("")}<i class="playhead" id="playhead"></i></div>
      <div class="scenes">${p.shots.map((sh, i) => { const mid = Math.floor((sh.start + sh.end) / 2);
        return `<article class="scene"><button class="frame" style="aspect-ratio:${p.meta!.W}/${p.meta!.H}" data-seek="${sh.start}" aria-label="Seek to scene ${i + 1}, ${esc(sh.id)}, at ${tc(sh.start)}"><img src="/api/motion/thumb/${p.slug}/${mid}.jpg" alt="" loading="lazy"></button>
        <div><b>${i + 1}. ${esc(sh.id)}</b><small>${tc(sh.start)} – ${tc(sh.end)} · ${secs(sh.end - sh.start)} · frames ${sh.start}–${sh.end - 1}</small>${sh.template ? `<p>${esc(sh.template)}</p>` : ""}${STATIC ? "" : `<a class="link" href="/api/motion/frame/${p.id}/${mid}.png" target="_blank">Exact frame ${mid} (full size render)</a>`}</div></article>`; }).join("")}</div>`;
    main.querySelectorAll<HTMLElement>("[data-seek]").forEach((b) => (b.onclick = () => { if (video) { video.currentTime = Number(b.dataset.seek) / 30 + 0.001; video.scrollIntoView({ block: "nearest", behavior: smooth() }); } }));
    const head = $("#playhead"); video?.addEventListener("timeupdate", () => (head.style.left = `${Math.min(100, ((video.currentTime * 30) / D) * 100)}%`));
  } else body("breakdown")!.innerHTML = p.slides?.length ? `<p class="muted">${p.slides.length} slide(s) exported to <code>exports/${esc(p.slug)}/${esc(p.format)}/</code>${p.caption ? "; caption below." : "."}</p>${p.caption ? `<blockquote>${esc(p.caption)}</blockquote>` : ""}` : `<p class="muted">No exports yet.</p>`;
  // cuts: how each vertical beat / slide / card is cut from the episode (source frame + crop box)
  const spec = p.derive ?? main_?.derive, src = p.role === "episode" ? p : main_;
  if (spec && src && body("cuts")) {
    const crop = (b: Beat, label: string) => { const W = src.meta?.W ?? 1920, H = src.meta?.H ?? 1080;
      return `<figure class="cutbeat"><div class="frame" style="aspect-ratio:${W}/${H}"><img src="/api/motion/thumb/${src.slug}/${b.frame}.jpg" alt="" loading="lazy"><i style="left:${(b.crop.x / W) * 100}%;top:${(b.crop.y / H) * 100}%;width:${(b.crop.w / W) * 100}%;height:${(b.crop.h / H) * 100}%"></i></div>
      <figcaption><b>${esc(label)}: ${esc(b.title)}</b>${b.sub ? `<small>${esc(b.sub)}</small>` : ""}<small>episode frame ${b.frame}${b.len ? ` · plays ${b.len} frames (${secs(b.len)})` : ""} · crop ${b.crop.w}×${b.crop.h} at ${b.crop.x},${b.crop.y}</small></figcaption></figure>`; };
    const show = p.role === "vertical" ? [["vertical", spec.vertical]] as const : p.role === "carousel" ? [["slides", spec.slides]] as const : p.role === "single" ? [["single", [spec.single]]] as const : [["vertical", spec.vertical], ["slides", spec.slides], ["single", [spec.single]]] as const;
    body("cuts")!.innerHTML = `<p class="muted">Cut from <a class="link" href="#/piece/${src.id}">${esc(src.title ?? src.id)}</a> by <code>studio/derive.ts</code>: every beat re-renders the episode frame inside the box shown${spec.line ? ", ending on the line-art quokka" : ""}.</p>` +
      show.map(([k, beats]) => `<h3>${k === "vertical" ? "9:16 vertical beats" : k === "slides" ? "Carousel slides" : "Card"}</h3><div class="cutbeats">${(beats as Beat[]).map((b, i) => crop(b, `${k === "single" ? "Card" : k === "slides" ? "Slide" : "Beat"} ${k === "single" ? "" : i + 1}`)).join("")}</div>`).join("");
  }
  // brief · prompt · run · source · files (fetched lazily)
  const briefFile = p.brief ?? main_?.brief;
  if (briefFile) json<Record<string, unknown>>(m(briefFile)).then((b) => { const st = (b.story ?? {}) as Record<string, string>, feats = (b.features ?? []) as { claim: string; source: string }[], scenes = (b.scenes ?? []) as { id: string; len: number; template: string }[];
    body("brief")!.innerHTML = `<dl class="facts wide">${[["Logline", b.logline], ["Setup", st.setup], ["Turn", st.turn], ["Payoff", st.payoff], ["Token", b.token], ["Atmosphere", b.atmosphere], ["Visits", ([] as string[]).concat((b.visits as string[]) ?? []).join(", ")], ["Style", b.style], ["Cast", ([] as string[]).concat((b.cast as string[]) ?? []).join(" · ")], ["Music", typeof b.music === "string" ? b.music : JSON.stringify(b.music)], ["Next", b.next]].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(String(v))}</dd>`).join("")}</dl>
      <h3>Claims (every caption must come from these)</h3><div class="table"><table><thead><tr><th>Claim</th><th>Source</th></tr></thead><tbody>${feats.map((f) => `<tr><td>${esc(f.claim)}</td><td>${esc(f.source)}</td></tr>`).join("")}</tbody></table></div>
      <h3>Scenes</h3><div class="table"><table><thead><tr><th>Scene</th><th>Frames</th><th>Template</th></tr></thead><tbody>${scenes.map((sc) => `<tr><td>${esc(sc.id)}</td><td>${sc.len} (${secs(sc.len)})</td><td>${esc(sc.template)}</td></tr>`).join("")}</tbody></table></div>
      <p><a class="link" href="${m(briefFile)}" target="_blank">${esc(briefFile)}</a></p>`; }).catch(failed(body("brief")));
  const promptFile = p.prompt ?? main_?.prompt;
  if (promptFile) text(m(promptFile)).then((t) => (body("prompt")!.innerHTML = `<p class="muted">Generated by <code>tools/brief-to-prompt.mjs</code> from the brief: the preamble that worked, plus this episode. <a class="link" href="${m(promptFile)}" target="_blank">${esc(promptFile)}</a></p><div class="doc">${embedded(markdown(t))}</div>`)).catch(failed(body("prompt")));
  const run = p.run ?? main_?.run;
  if (run) text(m(run.file)).then((t) => (body("run")!.innerHTML = `<div class="doc">${embedded(markdown(t))}</div>`)).catch(failed(body("run")));
  body("source")!.innerHTML = p.module ? `<p class="muted"><a class="link" href="${m(p.module)}" target="_blank">${esc(p.module)}</a> · host <a class="link" href="${m(p.host)}" target="_blank">${esc(p.host)}</a></p><pre class="code" id="code">Loading…</pre>` : `<p class="muted">No module.</p>`;
  if (p.module) text(m(p.module)).then((t) => ($("#code").innerHTML = t.split("\n").map((l, i) => `<span class="ln">${i + 1}</span>${esc(l)}`).join("\n"))).catch(failed(main.querySelector("#code")));
  const files = [["Module", p.module], ["Host page", p.host], ["Brief", briefFile], ["Prompt", promptFile], ["Agent run", run?.file], ["Golden", p.golden?.file], ["Render", p.video?.file], ["Poster", p.video?.poster ?? undefined]].filter(([, v]) => v) as [string, string][];
  body("files")!.innerHTML = `<dl class="facts wide">${files.map(([k, v]) => `<dt>${k}</dt><dd><a class="link" href="${fileUrl(v)}" target="_blank">${esc(v)}</a></dd>`).join("")}${p.slides?.length ? `<dt>Exports</dt><dd><code>${esc(p.slides[0]!.replace(/\/[^/]+$/, "/"))}</code></dd>` : ""}${p.video ? `<dt>Render sha256</dt><dd><code>${p.video.sha}…</code></dd>` : ""}</dl>
    <p class="actions">${p.golden && !STATIC ? `<button class="ghost" id="verify">Verify golden now</button>` : ""}<span id="verify-out" class="muted"></span></p>
    <p class="muted">Re-make it: <code>node tools/studio.mjs render ${esc(p.id)} &amp;&amp; node tools/studio.mjs check ${esc(p.id)} &amp;&amp; node tools/golden.mjs ${esc(p.id)}</code> (from <code>motion/</code>).</p>`;
  const vb = main.querySelector<HTMLButtonElement>("#verify");
  if (vb) vb.onclick = async () => { vb.disabled = true; $("#verify-out").textContent = "Rendering the golden frames… (up to a minute)";
    try { const r = await json<{ ok: boolean; output: string }>(`/api/motion/verify/${p.id}`, { method: "POST" }); if (r.ok) cue("done"); $("#verify-out").innerHTML = `${r.ok ? chip("SAME", "ok") : chip("DIFFERS", "bad")} <code>${esc(r.output)}</code>`; }
    catch (e) { failed(main.querySelector("#verify-out"))(e); } finally { vb.disabled = false; } };
}

// ---------------------------------------------------------------- brand
async function brand() {
  const [b, t, c, atm] = await Promise.all([json<Record<string, any>>(m("brand/brand.json")), json<{ themes: { id: string; family: string; mode: string; label: string; roles: Record<string, string> }[] }>(m("brand/themes.json")), json<{ looks: { id: string; pose: string; style: string; accessory: string }[] }>(m("brand/companions.json")), json<{ id: string; label: string; family: string; dark: boolean; drift: number; why: string; key: number; melody: number }[]>(api("atmospheres"))]);
  const looks = await json<string[]>(api("looks"));
  const fams = [...new Set(t.themes.map((x) => x.family))];
  const reel = byId("atmosphereReel");
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Brand</nav><header class="page-head"><h1>Brand &amp; atmospheres</h1><p>The one seam a piece reads its look from: <a class="link" href="${m("brand/brand.json")}" target="_blank">brand/brand.json</a> (copy, palette, fonts with sha256 locks, character), <a class="link" href="${m("brand/themes.json")}" target="_blank">themes.json</a> (the app's twelve environments) and <a class="link" href="${m("brand/companions.json")}" target="_blank">companions.json</a>.</p></header>
  <section class="sec"><h2>Copy</h2><dl class="facts wide">${["product", "wordmark", "tagline", "url", "platform", "cta", "promise", "voice"].filter((k) => b[k] !== undefined).map((k) => `<dt>${k}</dt><dd>${esc(String(b[k]))}</dd>`).join("")}</dl></section>
  <section class="sec"><h2>Palette <small>(the kit's <code>C</code>)</small></h2><div class="swatches">${Object.entries(b.palette as Record<string, string>).map(([k, v]) => `<div class="swatch"><i style="background:${esc(v)}"></i><b>${esc(k)}</b><code>${esc(v)}</code></div>`).join("")}</div></section>
  <section class="sec"><h2>Type</h2><div class="type-specimens"><p style="font-family:'General Sans';font-weight:600;letter-spacing:${b.fonts.tracking ?? -0.045}em;font-size:44px">Room to think. Files you keep.</p><p style="font-family:'Baloo 2';font-weight:600;font-size:44px">rotli</p></div>
    <div class="table"><table><thead><tr><th>Font</th><th>File</th><th>sha256 lock</th></tr></thead><tbody>${(b.fonts.files as { spec: string; file: string; sha256: string }[]).map((f) => `<tr><td>${esc(f.spec)}</td><td><code>${esc(f.file)}</code></td><td><code>${f.sha256.slice(0, 16)}…</code></td></tr>`).join("")}</tbody></table></div><p class="muted">Headline tracking ${b.fonts.tracking ?? -0.045}em (rotli.co). A render whose font file doesn't match its lock refuses to build.</p></section>
  <section class="sec"><h2>Theme families <small>(${t.themes.length} environments)</small></h2><ul class="families">${fams.map((f) => `<li><b>${esc(f)}</b>${t.themes.filter((x) => x.family === f).map((x) => `<div class="env" style="background:${x.roles.ground};color:${x.roles.text};border-color:${x.roles.border}"><span>${esc(x.label)}</span><span class="dots">${["surface", "surface-2", "tint", "accent", "accent-text", "success", "text-muted"].map((r) => `<i title="${r} ${x.roles[r]}" style="background:${x.roles[r]}"></i>`).join("")}</span></div>`).join("")}</li>`).join("")}</ul></section>
  <section class="sec"><h2>Atmospheres <small>(<code>studio/atmospheres.ts</code>)</small></h2>${reel?.video ? `<p><a class="link" href="#/piece/atmosphereReel">Watch the atmosphere reel</a> · <a class="link" href="${m("out/atmosphere-board.png")}" target="_blank">board</a></p>` : ""}
    <div class="table"><table><thead><tr><th>Id</th><th>Mood</th><th>Family</th><th>Ground</th><th>Music</th><th>Used for</th></tr></thead><tbody>${atm.map((a) => `<tr><td><code>${esc(a.id)}</code></td><td>${esc(a.label)}</td><td>${esc(a.family)}</td><td>${a.dark ? "deep" : "light"} · drift ${a.drift}</td><td>key +${a.key} · melody ${["tune", "walking", "lilting"][a.melody] ?? a.melody}</td><td>${esc(a.why)}</td></tr>`).join("")}</tbody></table></div></section>
  <section class="sec"><h2>Companion looks <small>(rendered from the app's real &lt;Character&gt;)</small></h2><div class="looks">${c.looks.filter((l) => looks.includes(`${l.id}.png`)).map((l) => `<figure><img src="${s(`library/companion-looks/${l.id}.png`)}" alt="" loading="lazy"><figcaption>${esc(l.id)}</figcaption></figure>`).join("")}</div><p class="muted">${c.looks.length - c.looks.filter((l) => looks.includes(`${l.id}.png`)).length} listed look(s) not rendered yet: <code>bun run sync:companions</code>.</p></section>`;
}

// ---------------------------------------------------------------- docs-style pages
type Doc = { label: string; path: string; group?: string };
async function docPage(title: string, intro: string, docs: Doc[], active?: string) {
  const current = docs.find((d) => d.path === active) ?? docs[0]!;
  const groups = [...new Set(docs.map((d) => d.group ?? ""))];
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › ${esc(title)}</nav><header class="page-head"><h1>${esc(title)}</h1><p>${intro}</p></header>
    <div class="doc-layout"><aside class="doc-list">${groups.map((g) => `${g ? `<span class="group-name">${esc(g)}</span>` : ""}${docs.filter((d) => (d.group ?? "") === g).map((d) => `<a href="${location.hash.split("?")[0]}?doc=${encodeURIComponent(d.path)}" ${d === current ? 'aria-current="page"' : ""}>${esc(d.label)}</a>`).join("")}`).join("")}</aside>
    <article class="doc" id="doc"><p class="muted">Loading…</p></article></div>`;
  const url = current.path.startsWith("skill:") ? "" : fileUrl(current.path);
  const body = current.path.startsWith("skill:") ? (await json<{ name: string; where: string; path: string; text: string }[]>(api("skills"))).find((k) => `skill:${k.where}:${k.name}` === current.path)?.text ?? "" : await text(url).catch((e) => `**Could not load:** ${e}`);
  $("#doc").innerHTML = `<p class="doc-path"><code>${esc(current.path.replace(/^skill:(\w+):/, "$1 skill: "))}</code>${url ? ` · <a class="link" href="${url}" target="_blank">raw</a>` : ""}</p>${/(\.(json|ts|mjs|py)|LICENSE|NOTICE)$/.test(current.path) ? `<pre class="code">${esc(body)}</pre>` : embedded(markdown(body))}`;
}
const param = (k: string) => new URLSearchParams(location.hash.split("?")[1] ?? "").get(k) ?? undefined;

async function workflows() {
  const prompts = M.series.flatMap((x) => (x.episodes ?? []).map((e) => byId(e.main ?? "")?.prompt).filter(Boolean)) as string[];
  const briefs = M.pieces.filter((p) => p.brief).map((p) => p.brief!) ;
  await docPage("Workflows & prompts", "How any piece is made, and made again. A brief (JSON) plus the preamble becomes the agent prompt, deterministically; the review checklist gates every sheet.", [
    { label: "How to make a piece", path: "workflows/README.md", group: "Process" }, { label: "Agent preamble", path: "workflows/agent-preamble.md", group: "Process" }, { label: "Review checklist", path: "workflows/review-checklist.md", group: "Process" }, { label: "Season One bible", path: "season/bible.md", group: "Process" },
    ...prompts.map((p) => ({ label: p.replace(/^workflows\/prompts\//, "").replace(".prompt.md", " prompt"), path: p, group: "Episode prompts" })),
    ...briefs.map((b) => ({ label: b.replace(/^season\/episodes\//, "").replace(".json", " brief"), path: b, group: "Episode briefs" })),
  ], param("doc"));
}
async function runs() {
  const list = M.pieces.filter((p) => p.run).sort((a, b) => a.run!.launched.localeCompare(b.run!.launched));
  const tok = list.reduce((a, p) => a + p.run!.tokens, 0), min = list.reduce((a, p) => a + p.run!.minutes, 0);
  await docPage("Requests & agent runs", `Every request, in the owner's words, and every agent that built a piece: its full prompt, follow-ups and unedited report. ${list.length} runs · ${(tok / 1e6).toFixed(2)}M tokens · ${min.toFixed(0)} agent-minutes. Recovered from the session transcript by <code>tools/extract-runs.mjs</code>.`, [
    { label: "The owner's requests", path: "workflows/runs/requests.md", group: "Requests" }, { label: "Frame reviews by other models", path: "workflows/runs/reviews.md", group: "Requests" },
    ...list.map((p) => ({ label: `${p.run!.description.replace(/^Build /, "")} · ${(p.run!.tokens / 1000).toFixed(0)}k`, path: p.run!.file, group: "Agent runs" })),
  ], param("doc"));
}
async function skills() {
  const all = await json<{ name: string; where: string; path: string }[]>(api("skills"));
  const globals = all.filter((k) => k.where !== "studio").length;
  await docPage("Skills", `The instructions agents follow here. They live in <code>.claude/skills/</code>, where Claude Code finds them.${globals ? ` ${globals} global skill(s) this studio relies on are listed read-only.` : ""} The render engine's own skill is anidoodle (credited under Docs &amp; licences).`, [
    { label: "AGENTS.md (studio guide)", path: "../AGENTS.md", group: "Studio" }, ...all.map((k) => ({ label: k.name, path: `skill:${k.where}:${k.name}`, group: k.where === "studio" ? "Studio" : "Global (read-only)" })),
  ], param("doc"));
}
async function tools() {
  const list = await json<{ file: string; about: string }[]>(api("tools"));
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Tools</nav><header class="page-head"><h1>Tools</h1><p>Every command in the studio, with the usage notes from its own header. Motion tools run with Node from <code>motion/</code>; studio scripts run with Bun from the studio root.</p></header>
    <ul class="tools">${list.map((t) => { const lines = (t.about || "(no header)").split("\n").filter((l) => !/^Derived from anidoodle/.test(l)), [first, ...rest] = lines; return `<li><details><summary><code>${esc(t.file)}</code><span>${esc(first ?? "")}</span></summary><pre>${esc(rest.join("\n").trim() || first || "")}</pre><p class="meta"><a class="link" href="${t.file.startsWith("motion/") ? m(t.file.slice(7)) : s(t.file)}" target="_blank">Open ${esc(t.file)}</a></p></details></li>`; }).join("")}</ul>`;
}
async function docs() {
  await docPage("Docs & licences", "What the studio is, what it proved, what's still Rotli-shaped, and the licences it ships under.", [
    { label: "Evaluation", path: "EVALUATION.md", group: "Motion room" }, { label: "Motion room README", path: "README.md", group: "Motion room" }, { label: "Launch month plan", path: "../launch/rotli-launch-month.md", group: "Motion room" },
    { label: "Studio README", path: "../README.md", group: "Studio" }, { label: "Films", path: "../films/README.md", group: "Studio" },
    { label: "Licence (MIT)", path: "../LICENSE", group: "Licences" }, { label: "NOTICE", path: "../NOTICE", group: "Licences" }, { label: "anidoodle (Apache-2.0): attribution", path: "third_party/anidoodle/README.md", group: "Licences" }, { label: "anidoodle LICENSE", path: "third_party/anidoodle/LICENSE", group: "Licences" },
  ], param("doc"));
}
async function doc(path: string) { await docPage(path.replace(/^\.\.\//, ""), "", [{ label: path, path }], path); }

// ---------------------------------------------------------------- isolation
async function isolation(fresh = false) {
  if (STATIC) { main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Isolation</nav><header class="page-head"><h1>Isolation audit</h1><p>The audit reads the product repos, worktrees and branches on the Mac, so it only runs there: <code>bun scripts/check-isolation.ts</code>, or the Isolation page of the local studio (<code>bun start</code> → 127.0.0.1:4500/motion). This hosted copy is a static, read-only snapshot served by its own Railway project; it shares nothing with rotli.co.</p></header>`; return; }
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Isolation</nav><header class="page-head"><h1>Isolation audit</h1><p>Proof that the studio's work stays in <code>~/rotli-studio</code>: its code only reads declared sources; no render sits in a product repo, worktree or branch; the live sites reference none; and what lives outside the studio does so on purpose. Read-only: <code>bun scripts/check-isolation.ts</code>.</p><p><button class="ghost" id="again">Run again</button> <span class="muted" id="when">${fresh ? "" : "Running (walks the product repos, ~10 s)…"}</span></p></header><div id="iso"></div>`;
  $("#again").onclick = () => isolation(true);
  if (fresh) $("#when").textContent = "Running…";
  type Rep = { when: string; status: string; products: string[]; worktrees: string[]; checks: { title: string; status: string; findings: { level: string; text: string; evidence?: string[] }[] }[] };
  const r = await json<Rep>(`/api/motion/isolation${fresh ? "?fresh=1" : ""}`).catch((e) => ({ error: String(e) }) as unknown as Rep);
  if (!r.checks) { $("#iso").innerHTML = `<p class="error">${esc(JSON.stringify(r))}</p>`; return; }
  $("#when").textContent = `Last run ${new Date(r.when).toLocaleString()} · products ${r.products.join(", ")} · ${r.worktrees.length} worktrees`;
  $("#iso").innerHTML = `<p class="banner ${r.status.toLowerCase()}">Overall: <b>${r.status}</b>${r.status === "PASS" ? " — nothing leaked." : " — read the findings below; each says where, and whether it predates the studio."}</p>` + r.checks.map((c) => `<section class="sec iso-check"><h2>${chip(c.status, c.status.toLowerCase())} ${esc(c.title)}</h2><ul class="findings">${c.findings.map((f) => `<li>${chip(f.level, f.level.toLowerCase())} ${esc(f.text)}${f.evidence?.length ? `<details><summary>${f.evidence.length} item(s)</summary><pre>${esc(f.evidence.join("\n"))}</pre></details>` : ""}</li>`).join("")}</ul></section>`).join("");
}

// ---------------------------------------------------------------- router
function notFound() { main.innerHTML = `<p class="empty">Nothing here. <a class="link" href="#/">Back to the studio</a>.</p>`; }
async function route() {
  const g = ++gen;
  const h = location.hash || "#/", [path] = h.split("?"), parts = path!.replace(/^#\/?/, "").split("/");
  stopPlayers?.(); stopPlayers = null;
  const turned = routed; if (turned) cue(parts[0] === "piece" ? "open" : "page"); routed = true;
  const pieceId = parts[0] === "piece" ? parts[1] : undefined;
  renderNav(pieceId ? `#/series/${byId(pieceId)?.series ?? ""}` : path!, pieceId);
  document.body.classList.toggle("is-home", !parts[0]);
  document.querySelectorAll<HTMLAnchorElement>(".topnav a").forEach((a) => { if (path!.startsWith(a.getAttribute("href")!)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  try {
    if (!parts[0]) { home(); stopPlayers = mountFilmPlayers(main); }
    else if (parts[0] === "library") library();
    else if (parts[0] === "posts") await posts();
    else if (parts[0] === "sound") await sound();
    else if (parts[0] === "series") series(parts[1] ?? "");
    else if (parts[0] === "piece") await piece(parts[1] ?? "");
    else if (parts[0] === "brand") await brand();
    else if (parts[0] === "workflows") await workflows();
    else if (parts[0] === "runs") await runs();
    else if (parts[0] === "skills") await skills();
    else if (parts[0] === "tools") await tools();
    else if (parts[0] === "docs") await docs();
    else if (parts[0] === "doc") await doc(decodeURIComponent(parts.slice(1).join("/")));
    else if (parts[0] === "isolation") await isolation();
    else notFound();
  } catch (e) { if (e instanceof Stale || g !== gen) return; main.innerHTML = `<p class="error">Could not load this page: ${esc(String(e))}. <button class="link" type="button" onclick="location.reload()">Retry</button></p>`; }
  if (turned && !h.includes("#sec-")) { const h1 = main.querySelector<HTMLElement>("h1"); if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); } }
  if (!h.includes("#sec-")) main.scrollTo?.(0, 0);
  document.title = parts[0] ? `${main.querySelector("h1")?.textContent?.trim() ?? "rotli"} · rotli studio` : "rotli studio";
}
let routed = false; // the first render is not a page turn
// in-page section links (#sec-…) must not trigger the router
document.addEventListener("click", (e) => {
  const skip = (e.target as HTMLElement).closest<HTMLAnchorElement>("a.skip"); if (skip) { e.preventDefault(); main.focus(); return; }
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#sec-"]'); if (!a) return; e.preventDefault(); document.getElementById(a.getAttribute("href")!.slice(1))?.scrollIntoView({ behavior: smooth() }); });
window.addEventListener("hashchange", route);
try { M = await json<Manifest>(api("manifest")); }
catch (e) { main.innerHTML = `<p class="error">The studio could not load its catalogue (${esc(String(e))}). <button class="link" type="button" onclick="location.reload()">Retry</button></p>`; throw e; }
mountSound(document.getElementById("sound-toggle") as HTMLButtonElement);
if (STATIC) document.getElementById("create-link")?.remove(); // the content editor only runs on the Mac
route();
