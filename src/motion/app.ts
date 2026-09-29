// The Motion room: every series, episode, cut and piece in motion/, broken down to its scenes, the
// brief and prompt that asked for it, the agent run that built it, its source and its golden. Plus the
// brand, workflows, skills, tools, docs and the isolation audit. Read-only; hash-routed.
import { esc, markdown } from "./md";
import { filmPlayer, mountFilmPlayers } from "./player";
import { chooseTrack, cue, mountSound, nowPlaying } from "./sound";
import { wizard } from "./wizard";

type Shot = { id: string; start: number; end: number; template?: string };
type Beat = {
  frame: number;
  crop: { x: number; y: number; w: number; h: number };
  title: string;
  sub?: string;
  hi?: string;
  len?: number;
};
type Run = {
  piece: string;
  description: string;
  launched: string;
  model: string | null;
  followUps: number;
  tokens: number;
  minutes: number;
  file: string;
};
type Piece = {
  id: string;
  kind: "video" | "carousel" | "still";
  slug: string;
  format: string;
  about?: string;
  caption?: string;
  sealed?: boolean;
  role: "episode" | "vertical" | "carousel" | "single" | "piece" | "study";
  episode: string | null;
  size?: Size | null;
  study?: string;
  series: string | null;
  module: string | null;
  host: string;
  meta: { W: number; H: number; fps: number; durationFrames: number; family?: string } | null;
  shots: Shot[];
  error: string | null;
  derive: { no: number; label?: string; line?: boolean; vertical: Beat[]; slides: Beat[]; single: Beat } | null;
  brief?: string;
  title?: string;
  logline?: string;
  atmosphere?: string;
  style?: string;
  next?: string;
  features?: { claim: string; source: string }[];
  prompt?: string;
  portable?: string;
  run?: Run;
  golden?: { file: string; frames: number; audio: boolean };
  video?: { file: string; poster: string | null; bytes: number; rendered: string; sha: string };
  slides?: string[];
  posterFrame?: number;
  /** the designed thumbnail (motion/tools/thumbnails.mjs): Rotli's videos have one */
  thumbnail?: string;
};
type Episode = {
  code: string;
  main: string | null;
  title: string;
  cuts: Partial<Record<"vertical" | "carousel" | "single", string>>;
};
type Study = {
  id: string;
  no: number;
  title: string;
  family: string | null;
  subject: "oriel" | "learn" | "fun";
  primary: string;
  sizes: Partial<Record<Size, string>>;
  brief: string;
};
type Series = {
  id: string;
  title: string;
  kind: "episodes" | "set" | "studies";
  shape: string;
  logline: string;
  docs: string[];
  schedule?: string;
  sealed: boolean;
  episodes?: Episode[];
  pieces?: string[];
  studies?: Study[];
  /** the studies' field notes (series/studies/notes/), newest first */
  notes?: { path: string; date: string; title: string; summary: string; minutes: number }[];
};
type Size = "landscape" | "vertical" | "square" | "portrait";
const SIZE_LABEL: Record<Size, string> = {
  landscape: "Landscape 16:9",
  vertical: "Vertical 9:16",
  square: "Square 1:1",
  portrait: "Portrait 4:5",
};
type Manifest = { generated: string; pieces: Piece[]; series: Series[] };

// STATIC: the hosted, read-only snapshot (scripts/export-site.ts). No server: API answers are .json files,
// and anything that renders, verifies or audits on this Mac is left out.
const STATIC = document.querySelector("meta[name='studio-static']") !== null;
const api = (name: string) => (STATIC ? `/api/motion/${name}.json` : `/api/motion/${name}`);
const $ = (s: string) => document.querySelector<HTMLElement>(s)!;
const main = $("#main"),
  nav = $("#nav");
let M: Manifest;
const byId = (id: string) => M.pieces.find((p) => p.id === id);
// Every navigation bumps `gen`; a fetch started under an older navigation throws Stale when it resolves, so
// a slow response for page A can never be written into page B.
let gen = 0;
class Stale extends Error {}
const text = async (url: string) => {
  const g = gen,
    r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const t = await r.text();
  if (g !== gen) throw new Stale();
  return t;
};
const json = async <T>(url: string, init?: RequestInit) => {
  const g = gen,
    r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const v = (await r.json()) as T;
  if (g !== gen) throw new Stale();
  return v;
};
/** a section that failed to load says so (and a stale one says nothing) */
const failed = (el: HTMLElement | null) => (e: unknown) => {
  if (!(e instanceof Stale) && el)
    el.innerHTML = `<p class="error">Could not load this: ${esc(String(e))}. <button class="link retry" type="button">Retry</button></p>`;
};
const smooth = (): ScrollBehavior => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
/** Markdown shown inside a page that already has its h1: every heading steps down one level */
const embedded = (html: string) =>
  html.replace(
    /<(\/?)h([1-5])(\b[^>]*)>/g,
    (_, slash: string, n: string, rest: string) => `<${slash}h${Number(n) + 1}${rest}>`,
  );
const secs = (frames: number, fps = 30) => `${(frames / fps).toFixed(frames % fps ? 1 : 0)} s`;
const tc = (f: number, fps = 30) =>
  `${Math.floor(f / fps / 60)}:${String(Math.floor(f / fps) % 60).padStart(2, "0")}.${String(f % fps).padStart(2, "0")}`;
const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
const m = (path: string) => `/m/${path}`;
const s = (path: string) => `/s/${path.replace(/^\.\.\//, "")}`;
const fileUrl = (p: string) => (p.startsWith("../") ? s(p) : m(p));
// posters: a Rotli video's designed thumbnail; otherwise (studies, or a thumbnail not drawn yet) a frame from the
// longest scene (the render's own .jpg is its last frame, the end card)
const poster = (p: Piece | undefined) =>
  !p
    ? ""
    : p.thumbnail
      ? m(p.thumbnail)
      : p.video && p.posterFrame !== undefined
        ? `/api/motion/thumb/${p.slug}/${p.posterFrame}.jpg`
        : p.video?.poster
          ? m(p.video.poster)
          : p.slides?.[0]
            ? s(p.slides[0])
            : "";
const epNo = (code: string) => code.replace(/^(s\d\de|ep)/, ""); // "01" in both series
const chip = (t: string, cls = "") => `<span class="chip ${cls}">${esc(t)}</span>`;
const seriesOf = (id: string | null) => M.series.find((x) => x.id === id);
/** "21 studies": counted from the manifest, so the copy never goes stale */
const studyCount = () => `${seriesOf("studies")?.studies?.length ?? 0} studies`;
const studies = () => seriesOf("studies")?.studies ?? [];
/** a piece made for Rotli, or one of the studies (everything that is not Rotli's) */
const isStudy = (p: Piece) => p.series === "studies";
// the families the studies are grouped by (each brief's "family"), in the order the Studies page shows them
const FAMILIES: { id: string; label: string; blurb: string }[] = [
  {
    id: "product",
    label: "Product & UI",
    blurb: "Launch films and ads: interfaces that float, morph, stack and sell.",
  },
  { id: "type", label: "Type & lyrics", blurb: "Words as the picture: kinetic type, posters, grids and a song." },
  { id: "explain", label: "Explainers & data", blurb: "Diagrams, maps, charts and steps that make one idea obvious." },
  {
    id: "learn",
    label: "Science & learning",
    blurb: "Short lessons on real topics, every fact sourced on the study's page.",
  },
  {
    id: "shape",
    label: "Shapes & generative",
    blurb: "One shape, many shapes, fields and loops: motion as the subject.",
  },
  {
    id: "print",
    label: "Print & illustration",
    blurb: "Hand-made looks in code: riso, paper, ink, glass and cut-outs.",
  },
  { id: "character", label: "Characters & hosts", blurb: "A mascot, a host or a puppet who carries the piece." },
  { id: "screen", label: "Retro & screen", blurb: "Pixels, terminals, boards, glitches and neon." },
];
const famLabel = (id: string | null | undefined) => FAMILIES.find((f) => f.id === id)?.label ?? "Other";
const SUBJECT: Record<Study["subject"], { label: string; chip: string; note: [string, string] }> = {
  oriel: {
    label: "For Oriel",
    chip: "Oriel · imaginary",
    note: [
      "Oriel is imaginary.",
      "It is a scheduling assistant invented for the studies, so they can show a product without claiming anything about a real one. It has no website, no app and no company; every claim in this piece is made up.",
    ],
  },
  learn: {
    label: "Real topics",
    chip: "Real topic",
    note: [
      "A real topic.",
      "Every fact on screen is listed with its source under Brief, and hedged the way the source hedges it.",
    ],
  },
  fun: {
    label: "Just for fun",
    chip: "Just for fun",
    note: ["Made for fun.", "No product and no claims: every name in it is invented."],
  },
};
const studyOfPiece = (p: Piece) => studies().find((x) => x.id === p.study);

// ---------------------------------------------------------------- nav: one tree, Rotli's work apart from the studies
function renderNav(active: string) {
  const link = (key: string, href: string, label: string, count?: number) =>
    `<a href="${href}"${key === active ? ' aria-current="page"' : ""}><span>${esc(label)}</span>${count !== undefined ? `<small>${count}</small>` : ""}</a>`;
  const group = (name: string, body: string) =>
    `<div class="group"><span class="group-name">${name}</span>${body}</div>`;
  const rotli = M.pieces.filter((p) => !isStudy(p));
  nav.innerHTML =
    link("home", "#/", "Home") +
    link("library", "#/library", "Library", M.pieces.length) +
    group(
      "Studies",
      link("studies", "#/series/studies", "Studies", studies().length) +
        link("journal", "#/journal", "Journal", seriesOf("studies")?.notes?.length ?? 0) +
        link("prompts", "#/prompts", "Prompt library"),
    ) +
    group(
      "Rotli",
      link("series", "#/series", "Series", M.series.filter((x) => x.kind !== "studies").length) +
        link(
          "carousels",
          "#/carousels",
          "Carousels",
          rotli.filter((p) => p.kind !== "video" && p.slides?.length).length,
        ) +
        link("wallpapers", "#/wallpapers", "Wallpapers") +
        link("brand", "#/brand", "Brand kit"),
    ) +
    group(
      "Make your own",
      link("use", "#/use", "Make one for your product") +
        link("workflows", "#/workflows", "Prompts & briefs") +
        link("runs", "#/runs", "Agent runs", M.pieces.filter((p) => p.run).length) +
        link("sound", "#/sound", "Sound") +
        link("skills", "#/skills", "Skills") +
        link("tools", "#/tools", "Tools"),
    ) +
    group(
      "About",
      link("posts", "#/posts", "Published") +
        link("docs", "#/docs", "Docs & licences") +
        (STATIC ? "" : link("isolation", "#/isolation", "Isolation audit")),
    );
}
/** which one nav row a route belongs to */
function navKey(parts: string[]) {
  const [a = "", b = ""] = parts;
  if (!a) return "home";
  if (a === "series") return b === "studies" ? "studies" : "series";
  if (a === "piece") return byId(b)?.series === "studies" ? "studies" : "series";
  if (a === "doc") return "docs";
  if (a === "note") return "journal";
  return a;
}

// ---------------------------------------------------------------- home: the landing page
// the landing poster: the island at the ferry, full size (the scene thumbnails are only 640 px wide)
export const HERO_POSTER_FRAME = 45;
let stopPlayers: (() => void) | null = null;
const stats = () => {
  const vids = M.pieces.filter((p) => p.kind === "video" && p.meta);
  return {
    pieces: M.pieces.length,
    episodes: M.series.reduce((a, x) => a + (x.episodes?.length ?? 0), 0),
    minutes: vids.reduce((a, p) => a + p.meta!.durationFrames / p.meta!.fps, 0) / 60,
    goldens: M.pieces.filter((p) => p.golden).length,
    runs: M.pieces.filter((p) => p.run).length,
  };
};
const seriesRows = (h: 2 | 3 = 3, which = (x: Series) => x.kind !== "studies") =>
  `<ul class="rows">${M.series
    .filter(which)
    .map((x) => {
      const first = x.episodes
        ? byId(x.episodes[0]?.main ?? "")
        : x.studies
          ? byId(x.studies[0]?.primary ?? "")
          : byId(x.pieces?.[0] ?? "");
      // a 9:16 cover in the 16:9 slot shows its picture, not its title band (the row names the series beside it)
      const tall = !!first?.meta && first.meta.H > first.meta.W;
      return `<li><a class="row" href="#/series/${x.id}"><img${tall ? ' class="tall"' : ""} src="${poster(first)}" alt="" loading="lazy"><div><h${h} class="row-title">${esc(x.title)}${x.sealed ? chip("sealed", "lock") : ""}</h${h}><p>${esc(x.logline)}</p><p class="meta">${esc(x.shape)}</p></div><span class="go" aria-hidden="true">→</span></a></li>`;
    })
    .join("")}</ul>`;
/** the size a study shows in a grid: landscape if it has one, so a grid of studies lines up */
const tilePiece = (st: Study) =>
  byId(st.sizes.landscape ?? st.sizes.square ?? st.sizes.portrait ?? st.primary) ?? byId(st.primary);
const sizeShort = (z: string) => SIZE_LABEL[z as Size]?.split(" ")[1] ?? z;
function studyTile(st: Study, h: 2 | 3 = 3) {
  const p = tilePiece(st);
  if (!p) return "";
  const len =
    p.meta && p.kind === "video"
      ? secs(p.meta.durationFrames, p.meta.fps)
      : p.slides?.length
        ? `${p.slides.length} slides`
        : "";
  const meta = [Object.keys(st.sizes).map(sizeShort).join(" · "), len].filter(Boolean).join(" · ");
  return `<li><a class="study-tile" href="#/piece/${st.primary}"${p.video ? ` data-preview="${esc(m(p.video.file))}"` : ""}><span class="tile-media${p.meta && p.meta.W < p.meta.H * 1.2 ? " contain" : ""}"><img src="${poster(p)}" alt="" loading="lazy"></span>
    <h${h} class="tile-title"><span class="num">${String(st.no).padStart(2, "0")}</span>${esc(st.title)}</h${h}><span class="tile-meta"><span class="subject ${st.subject}">${esc(SUBJECT[st.subject]?.chip ?? "")}</span>${esc(meta)}</span></a></li>`;
}
/** hovering (or focusing) a study tile plays its render, muted; never under reduced motion or Save-Data */
function mountPreviews(root: HTMLElement) {
  const quiet =
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  if (quiet || matchMedia("(hover: none)").matches) return;
  root.querySelectorAll<HTMLAnchorElement>("[data-preview]").forEach((a) => {
    const box = a.querySelector<HTMLElement>(".tile-media")!;
    const start = () => {
      if (box.querySelector("video")) return;
      const v = document.createElement("video");
      Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true, src: a.dataset.preview! });
      v.setAttribute("aria-hidden", "true");
      box.append(v);
      void v.play().catch(() => v.remove());
    };
    const stop = () => box.querySelector("video")?.remove();
    a.addEventListener("pointerenter", start);
    a.addEventListener("focus", start);
    a.addEventListener("pointerleave", stop);
    a.addEventListener("blur", stop);
  });
}
function home() {
  const film = byId("rotliStory"),
    n = stats(),
    all = studies();
  // the showcase: the newest study of every family, so the landing shows the studio's range and never goes stale
  const show = FAMILIES.map((f) => all.filter((x) => x.family === f.id).at(-1)).filter(Boolean) as Study[];
  const bySubject = (k: Study["subject"]) => all.filter((x) => x.subject === k).length;
  main.innerHTML = `<section class="hero">
      <h1>Rotli, <span class="ink">drawn in code.</span></h1>
      <p class="lede">Rotli is the calm notes app for your Mac. This is its studio: every film, episode, carousel and card here is drawn frame by frame in code, and everything that made them is open: the briefs, the prompts, the agent runs and the tools that make them again.</p>
      <div class="ctas"><a class="button lg" href="#/piece/rotliStory">Watch the film</a><a class="button ghost lg" href="#/series/studies">Explore ${all.length} studies</a></div>
      <p class="fine">Open source · MIT · ${n.pieces} pieces, ${n.minutes.toFixed(0)} minutes of film</p>
    </section>
    ${
      film?.video
        ? `<section class="film">${filmPlayer(m(film.video.file), `/api/motion/poster/${film.slug}/${HERO_POSTER_FRAME}.jpg`, "The Rotli Story: a 60-second film of a quokka on Rottnest, from the ferry to the sunset")}
      <p class="film-caption"><span><b>The Rotli Story</b> · 60 s · a quokka on Rottnest, from the ferry to the sunset</span><a class="link" href="#/piece/rotliStory">Scene by scene →</a></p></section>`
        : ""
    }
    <section class="band"><div class="inner">
      <h2>A whole studio, not only Rotli.</h2>
      <p class="intro">Rotli is the first client. The same engine has drawn ${all.length} other techniques, each a study with its brief, its prompt and a scored critique: ${bySubject("oriel")} for Oriel, an imaginary app; ${bySubject("learn")} short lessons on real topics; ${bySubject("fun")} just for fun. Hover one to watch it.</p>
      <ul class="study-grid showcase">${show.map((st) => studyTile(st)).join("")}</ul>
      <p class="fam-links">${FAMILIES.map((f) => {
        const c = all.filter((x) => x.family === f.id).length;
        return c ? `<a href="#/series/studies?family=${f.id}">${esc(f.label)} <small>${c}</small></a>` : "";
      }).join("")}</p>
      <div class="ctas left"><a class="button" href="#/series/studies">Browse all ${all.length} studies</a><a class="button ghost" href="#/use">Make one for your product</a></div>
    </div></section>
    <section class="band tinted"><div class="inner">
      <h2>Made for Rotli.</h2>
      <p class="intro">Rotli's own series: each groups its episodes with the cuts made from them, a vertical for Reels and Shorts, a carousel and a card. Open any piece to see its scenes, the brief behind it and the run that built it.</p>
      ${seriesRows()}
      <p class="beyond-line">And free <a class="link" href="#/wallpapers">wallpapers</a> with the quokka, made in your browser, and the <a class="link" href="#/brand">brand kit</a> they are drawn from.</p>
    </div></section>
    <section class="band"><div class="inner split">
      <div><h2>Make one for your product.</h2><p class="intro">Answer a few questions. You get a prompt that has Claude, or any capable model, interview you for what's missing, fetch your logo, colours and fonts from your site, write a brief for you to approve, then build and review the piece.</p>
        <div class="ctas left"><a class="button lg" href="#/use">Start</a><a class="button ghost lg" href="#/prompts">Copy a study's prompt</a></div></div>
      <ol class="steps light">
        <li><b>Answer</b><p>Your product, the goal, the sizes, a style from the studies, what it may say.</p></li>
        <li><b>Paste</b><p>The prompt asks the rest one question at a time and gathers your assets.</p></li>
        <li><b>Approve</b><p>A brief of beats and exact copy, before a single frame is drawn.</p></li>
        <li><b>Review</b><p>Eight timestamps checked against the same rubric the studies pass.</p></li>
      </ol>
    </div></section>
    <section class="band deep"><div class="inner">
      <h2>How a piece gets made.</h2>
      <p class="intro">The same five steps for every episode and study, so any piece can be made again from its files.</p>
      <ol class="steps">
        <li><b>A brief</b><p>A JSON file holds the story, the look, the beats on a beat grid and every claim a caption may make, each with its source.</p></li>
        <li><b>A prompt</b><p>The brief plus the shared rules becomes the agent's prompt, deterministically (<code>study-prompt</code>, <code>brief-to-prompt</code>).</p></li>
        <li><b>A build</b><p>An agent draws the piece in code on the studio's engine and renders review sheets. Every run is kept, prompt and report.</p></li>
        <li><b>A critique</b><p>A second reader scores the sheets on seven criteria, hook to sync, and nothing ships under 8.</p></li>
        <li><b>A golden</b><p>Sampled frames and the audio are hashed. After any change to shared code, the goldens prove what moved; the first film can never change.</p></li>
      </ol>
    </div></section>
    <section class="band"><div class="inner split">
      <div><h2>Open, all the way down.</h2><p class="intro">The studio is public under the MIT licence, like Rotli. The render engine began as anidoodle by Alex Greenshpun (Apache-2.0).</p>
        <ul class="numbers"><li><b>${n.pieces}</b>pieces</li><li><b>${all.length}</b>studies</li><li><b>${n.goldens}</b>goldens</li><li><b>${n.runs}</b>agent runs</li></ul></div>
      <ul class="links">
        <li><a href="#/journal">Journal →</a><p>Long-form field notes: what we tried, measured and learned making motion with models.</p></li>
        <li><a href="#/prompts">Prompt library →</a><p>A prompt for every study: paste it into Claude and get a piece in that style.</p></li>
        <li><a href="#/runs">Agent runs →</a><p>Every request in the owner's words, and each agent's prompt, follow-ups and report.</p></li>
        <li><a href="https://github.com/SethMed7/rotli-studio" target="_blank" rel="noreferrer">Source on GitHub →</a><p>The engine, tools, skills and every piece's code.</p></li>
      </ul>
    </div></section>
    <footer class="site-foot"><span>rotli studio · ${STATIC ? `snapshot of ${new Date(M.generated).toLocaleDateString()}` : "running on this Mac"}</span><span><a href="https://rotli.co" target="_blank" rel="noreferrer">rotli.co</a> · <a href="#/docs?doc=..%2FLICENSE">MIT</a> · <a href="#/docs?doc=..%2FNOTICE">Notices</a></span></footer>`;
  mountPreviews(main);
}

// ---------------------------------------------------------------- library: every series
function library() {
  const n = stats(),
    size = param("size") as Size | undefined,
    made = param("for") as "rotli" | "studies" | undefined,
    mine = (p: Piece) => !made || (made === "studies") === isStudy(p),
    all = M.pieces.filter((p) => mine(p) && (!size || p.size === size));
  const q = (z: Size | undefined, f: string | undefined) => {
    const u = new URLSearchParams();
    if (f) u.set("for", f);
    if (z) u.set("size", z);
    return `#/library${u.size ? `?${u}` : ""}`;
  };
  const sizeTab = (z: Size | undefined, label: string) =>
    `<a href="${q(z, made)}"${z === size ? ' aria-current="page"' : ""}>${label} <small>${M.pieces.filter((p) => mine(p) && (!z || p.size === z)).length}</small></a>`;
  const forTab = (f: "rotli" | "studies" | undefined, label: string) =>
    `<a href="${q(size, f)}"${f === made ? ' aria-current="page"' : ""}>${label} <small>${M.pieces.filter((p) => (!f || (f === "studies") === isStudy(p)) && (!size || p.size === size)).length}</small></a>`;
  const order = M.series.map((x) => x.id),
    sorted = [...all].sort((a, b) => order.indexOf(a.series ?? "") - order.indexOf(b.series ?? ""));
  const len = (p: Piece) =>
    p.kind === "video" && p.meta
      ? secs(p.meta.durationFrames, p.meta.fps)
      : p.slides?.length
        ? `${p.slides.length} ${p.slides.length === 1 ? "image" : "slides"}`
        : p.kind;
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Library</nav><header class="page-head"><h1>Library</h1><p>Every piece the studio has made, in every size: Rotli's films and cuts, and the studies. ${n.pieces} pieces · ${n.minutes.toFixed(1)} minutes of video · ${n.goldens} locked by goldens.</p></header>
    <div class="filter-bar"><nav class="cut-tabs" aria-label="Filter by what it was made for">${forTab(undefined, "Everything")}${forTab("rotli", "Rotli")}${forTab("studies", "Studies")}</nav>
    <nav class="cut-tabs" aria-label="Filter by size">${sizeTab(undefined, "All sizes")}${(["landscape", "vertical", "square", "portrait"] as Size[]).map((z) => sizeTab(z, SIZE_LABEL[z])).join("")}</nav></div>
    <div class="pieces">${sorted.map((p) => `<a class="piece-link" href="#/piece/${p.id}"><img src="${poster(p)}" alt="" loading="lazy"><b>${esc(pieceTitle(p))}${p.sealed ? chip("sealed", "lock") : ""}</b><p class="meta">${esc([p.size ? SIZE_LABEL[p.size] : p.format, len(p), isStudy(p) ? `Study ${String(studyOfPiece(p)?.no ?? "").padStart(2, "0")}` : seriesOf(p.series)?.title.replace(/:.*/, "")].filter(Boolean).join(" · "))}</p></a>`).join("")}</div>
    ${sorted.length ? "" : `<p class="empty">Nothing in this size yet.</p>`}
    <p class="foot">Manifest built ${new Date(M.generated).toLocaleString()}${STATIC ? " · a read-only snapshot of the studio." : ` · <button class="link" id="rebuild">Rebuild</button> after rendering or editing <code>pieces.json</code> / <code>series.json</code>.`}</p>`;
  if (!STATIC)
    $("#rebuild").onclick = async () => {
      M = await json<Manifest>("/api/motion/manifest", { method: "POST" });
      route();
    };
}
/** a piece's human title: the episode or study title plus its cut or size */
function pieceTitle(p: Piece) {
  const cut = { vertical: "vertical", carousel: "carousel", single: "card" } as Record<string, string>;
  if (p.role === "study") {
    const st = seriesOf("studies")?.studies?.find((x) => x.id === p.study);
    return `${p.title ?? p.id}${st && st.primary !== p.id && p.size ? ` · ${p.size}` : ""}`;
  }
  if (cut[p.role]) {
    const x = seriesOf(p.series),
      ep = x?.episodes?.find((e) => e.code === p.episode);
    return `${ep?.title.replace(/\.$/, "") ?? p.id} · ${cut[p.role]}`;
  }
  return p.title ?? p.id;
}
// ---------------------------------------------------------------- downloads: everything needed to post a piece
// hosted: the zips are assets of the studio-media release (scripts/media.ts); locally the server builds them
const zipUrl = (p: Piece) =>
  STATIC
    ? `https://github.com/SethMed7/rotli-studio/releases/download/studio-media/${p.slug}.zip`
    : `/api/motion/zip/${p.slug}.zip`;
function downloads(p: Piece) {
  const items: string[] = [];
  if (p.video) {
    const size = p.meta ? `${p.meta.W} × ${p.meta.H}` : "";
    items.push(
      `<a class="button" href="${m(p.video.file)}" download="${esc(p.slug)}.mp4">Download video <small>${esc(size)} · ${mb(p.video.bytes)}</small></a>`,
    );
    if (p.video.poster)
      items.push(`<a class="button ghost" href="${m(p.video.poster)}" download="${esc(p.slug)}.jpg">Poster</a>`);
    if (p.thumbnail)
      items.push(
        `<a class="button ghost" href="${m(p.thumbnail)}" download="${esc(p.slug)}-thumbnail.jpg">Thumbnail</a>`,
      );
  }
  if (p.slides?.length)
    items.push(
      `<a class="button" href="${zipUrl(p)}" download="${esc(p.slug)}.zip">Download ${p.slides.length > 1 ? `all ${p.slides.length} slides` : "image"} <small>.zip</small></a>`,
    );
  if (p.caption)
    items.push(
      `<button class="button ghost copy" type="button" data-label="Copy caption" data-copy="${esc(p.caption)}">Copy caption</button>`,
    );
  return items.length ? `<div class="downloads">${items.join("")}</div>` : "";
}
/** a button that copies text to the clipboard (one delegated handler; the hosted CSP allows no inline script) */
const copyButton = (text: string, label: string, primary = false) =>
  `<p class="actions"><button class="button ${primary ? "" : "ghost "}copy" type="button" data-label="${esc(label)}" data-copy="${esc(text)}">${esc(label)}</button></p>`;
// ---------------------------------------------------------------- prompt library: prompts anyone can copy into a model
async function promptLibrary() {
  const list = studies()
    .map((st) => ({ st, p: byId(st.primary)! }))
    .filter((x) => x.p?.portable);
  const texts = new Map(await Promise.all(list.map(async ({ st, p }) => [st.id, await text(m(p.portable!))] as const)));
  const row = ({ st, p }: (typeof list)[number]) => {
    const t = texts.get(st.id)!;
    return `<li><div class="row"><img src="${poster(tilePiece(st))}" alt="" loading="lazy"><div><h3 class="row-title"><span class="num">${String(st.no).padStart(2, "0")}</span>${esc(st.title)}<span class="subject ${st.subject}">${esc(SUBJECT[st.subject].chip)}</span></h3><p>${esc(p.logline ?? "")}</p><p class="meta">${esc(
      Object.keys(st.sizes)
        .map((z) => SIZE_LABEL[z as Size])
        .join(" · "),
    )}</p>
          <div class="downloads"><button class="button copy" type="button" data-label="Copy prompt" data-copy="${esc(t)}">Copy prompt</button><a class="button ghost" href="#/piece/${p.id}">See the study</a></div>
          <details class="maintainer"><summary>Read the prompt</summary><pre class="prompt">${esc(t)}</pre></details></div></div></li>`;
  };
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Prompt library</nav><header class="page-head"><h1>Prompt library</h1><p>Copy a prompt, paste it into Claude, and get a piece in that style: one HTML file, no setup, nothing from this repository. Each is written from a study's brief, and the study shows what it makes. Want one fitted to your product? <a class="link" href="#/use">Make one for your product →</a></p></header>
    ${FAMILIES.map((f) => ({ f, rows: list.filter(({ st }) => st.family === f.id) }))
      .filter((g) => g.rows.length)
      .map(
        ({ f, rows }) =>
          `<section class="sec"><h2>${esc(f.label)} <small>${rows.length}</small></h2><ul class="rows prompts">${rows.map(row).join("")}</ul></section>`,
      )
      .join("")}`;
}
// ---------------------------------------------------------------- carousels: every slide post, ready to download
function carousels() {
  const all = M.pieces.filter((p) => p.kind !== "video" && p.slides?.length).reverse(), // newest first
    rotli = all.filter((p) => !isStudy(p)),
    fromStudies = all.filter(isStudy);
  const list = (ps: Piece[]) =>
    `<ul class="carousels">${ps
      .map(
        (p) => `<li>
          <div class="carousel-head"><h3><a href="#/piece/${p.id}">${esc(pieceTitle(p))}</a></h3><p class="meta">${esc([p.size ? SIZE_LABEL[p.size] : p.format, `${p.slides!.length} ${p.slides!.length === 1 ? "image" : "slides"}`, isStudy(p) ? "Studies" : seriesOf(p.series)?.title.replace(/:.*/, "")].filter(Boolean).join(" · "))}</p></div>
          <div class="strip">${p.slides!.map((f, i) => `<a href="${s(f)}" download="${esc(p.slug)}-${String(i + 1).padStart(2, "0")}.png" title="Download slide ${i + 1}"><img src="${s(f)}" alt="${esc(slideAlt(p, byId(seriesOf(p.series)?.episodes?.find((e) => e.code === p.episode)?.main ?? ""), i, p.slides!.length))}" loading="lazy"></a>`).join("")}</div>
          ${p.caption ? `<p class="caption">${esc(p.caption)}</p>` : ""}
          ${downloads(p)}
        </li>`,
      )
      .join("")}</ul>`;
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Carousels</nav><header class="page-head"><h1>Carousels</h1><p>Rotli's carousels and cards, newest first, with their slides, their caption and one download for the lot. ${rotli.length} posts.</p></header>
    <section class="sec"><h2>Rotli</h2>${list(rotli)}</section>
    ${fromStudies.length ? `<section class="sec"><h2>From the studies <small>(imaginary product)</small></h2>${list(fromStudies)}</section>` : ""}`;
}
// ---------------------------------------------------------------- wallpapers: free downloads, one screen at a time
// ---------------------------------------------------------------- wallpapers: the maker (motion/src/site/wallpaperMaker.ts)
// its own bundle, fetched only here: locally the server builds /build/wallpapers.js; the snapshot names its hashed
// copy in a meta tag
async function wallpapers() {
  const url = document.querySelector<HTMLMetaElement>("meta[name='wallpapers-js']")?.content ?? "/build/wallpapers.js";
  const { mountWallpapers } = (await import(url)) as { mountWallpapers: (main: HTMLElement, narrow: boolean) => void };
  mountWallpapers(main, matchMedia("(max-width: 700px)").matches);
}
// ---------------------------------------------------------------- series: the index of Rotli's series
function seriesIndex() {
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Series</nav><header class="page-head"><h1>Series</h1><p>Rotli's own films and the cuts made from them, series by series. Everything here is about Rotli, the calm notes app for your Mac, and quotes rotli.co.</p></header>
    ${seriesRows(2)}
    <section class="beyond"><h2>Not about Rotli</h2><p>The same studio in ${studyCount()}: an imaginary product, real topics and pieces made for fun, each its own technique in every size. <a class="link" href="#/series/studies">Studies →</a></p></section>`;
}

// ---------------------------------------------------------------- posts: what has been published, as links
type Post = { platform: string; url: string; date: string; text: string; pieces: string[] };
/** "@RotliCo" from a post URL, so an entry with no text still says whose post it is */
const handleOf = (url: string) => url.match(/^https:\/\/(?:x|twitter)\.com\/(\w+)\//)?.[1];
async function posts() {
  const data = await json<{ posts: Post[]; accounts: { platform: string; match: string }[] }>(s("publish/posts.json"));
  const when = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const accounts = [
    ...new Set(data.accounts.map((a) => a.match.match(/com\/(\w+)\/status/)?.[1]).filter(Boolean) as string[]),
  ];
  const list = [...data.posts].sort((a, b) => b.date.localeCompare(a.date));
  const shared = new Set(list.flatMap((p) => p.pieces)).size;
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Published</nav><header class="page-head"><h1>Published</h1><p>Where the studio's work has been posted: ${list.length} post${list.length === 1 ? "" : "s"}, sharing ${shared} piece${shared === 1 ? "" : "s"}. Each links to the post on its platform, with the pieces it shares.</p>
    ${accounts.length ? `<p class="follow">Follow along: ${accounts.map((h) => `<a class="button ghost" href="https://x.com/${esc(h)}" target="_blank" rel="noreferrer">@${esc(h)} on X</a>`).join("")}</p>` : ""}
    <details class="maintainer"><summary>How a post gets here</summary><p>Only links to the owner's own accounts are accepted: <code>bun scripts/link-post.ts &lt;url&gt; [--piece &lt;id&gt;]</code> checks the URL against the account patterns in <code>publish/posts.json</code>, and the change reaches this page only through a push by the repository owner. The check is on the link's account handle; the post itself stays on its platform.</p></details></header>
    ${
      list.length
        ? `<ol class="posts">${list
            .map((p) => {
              const h = handleOf(p.url),
                pcs = p.pieces.map(byId).filter(Boolean) as Piece[],
                lead = pcs[0];
              return `<li class="post"><div class="post-when"><time datetime="${esc(p.date)}">${esc(when(p.date))}</time><span class="chip">${esc(p.platform)}${h ? ` · @${esc(h)}` : ""}</span></div>
      <div class="post-body"><p class="post-text">${p.text ? esc(p.text) : `A post by @${esc(h ?? p.platform)}.`}</p>
        ${lead ? `<a class="post-lead" href="#/piece/${lead.id}"><img src="${poster(lead)}" alt="" loading="lazy"><span><b>${esc(pieceTitle(lead))}</b><small>${esc([lead.meta && lead.kind === "video" ? secs(lead.meta.durationFrames, lead.meta.fps) : "", isStudy(lead) ? "Study" : seriesOf(lead.series)?.title.replace(/:.*/, "")].filter((x) => x && x !== pieceTitle(lead)).join(" · "))}</small></span></a>` : ""}
        ${
          pcs.length > 1
            ? `<div class="post-pieces">${pcs
                .slice(1)
                .map(
                  (pc) =>
                    `<a href="#/piece/${pc.id}"><img src="${poster(pc)}" alt="" loading="lazy"><span>${esc(pieceTitle(pc))}</span></a>`,
                )
                .join("")}</div>`
            : ""
        }
        ${p.url.startsWith("https://") ? `<p class="actions"><a class="button ghost" href="${esc(p.url)}" target="_blank" rel="noreferrer">Open on ${esc(p.platform)} ↗</a></p>` : ""}</div></li>`;
            })
            .join("")}</ol>`
        : `<p class="empty">Nothing linked yet.</p>`
    }`;
}

// ---------------------------------------------------------------- sound: the studio's playlist and effects, with their prompts
type SoundEntry = {
  id: string;
  kind: string;
  title: string;
  use: string;
  prompt: string;
  file: string;
  seconds: number;
  playlist?: { family: string; theme: string; bpm: number; key: string };
};
// the Sound page's "Play in the studio" buttons follow the player, wherever the change came from
addEventListener("studio-track", () => markPlaying());
function markPlaying() {
  const { track, playing } = nowPlaying();
  main.querySelectorAll<HTMLButtonElement>("button[data-track]").forEach((b) => {
    const on = playing && b.dataset.track === track;
    b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? "Playing in the studio" : "Play in the studio";
  });
}
async function sound() {
  const [cat, themes] = await Promise.all([
    json<{ made: string; sounds: SoundEntry[] }>("/sound/catalog.json"),
    json<{ themes: { id: string; roles: Record<string, string> }[] }>(m("brand/themes.json")),
  ]);
  const row = (x: SoundEntry) => {
    const pl = x.playlist,
      th = pl && themes.themes.find((t) => t.id === pl.theme);
    const meta = pl
      ? `<span class="family">${th ? `<i style="background:${esc(th.roles.ground!)}"></i><i style="background:${esc(th.roles.accent!)}"></i>` : ""}${esc(pl.family)}</span> · ${esc(pl.key)} · ${pl.bpm} bpm · ${x.seconds.toFixed(0)} s, loops`
      : `effect · ${x.seconds.toFixed(1)} s · ${esc(x.use)}`;
    return `<li class="sound" id="sound-${esc(x.id)}"><div class="sound-head"><h3>${esc(x.title)}</h3><p class="meta">${meta}</p>${pl ? `<p class="muted">${esc(x.use.replace(/^the playlist's [^:]+: /, ""))}</p>` : ""}</div>
      <div class="sound-play"><audio controls preload="none" src="/${esc(x.file)}" aria-label="Play ${esc(x.title)}"></audio>${pl ? `<button class="button ghost" type="button" data-track="${esc(x.id)}" aria-pressed="false">Play in the studio</button>` : ""}</div>
      <details><summary>The prompt</summary><div class="doc" data-prompt="${esc(x.prompt)}"></div></details>
      <p class="meta"><a class="link" href="/${esc(x.prompt)}" target="_blank">${esc(x.prompt)}</a> · <a class="link" href="/${esc(x.file)}" download>Download ${esc(x.id)}.m4a</a></p></li>`;
  };
  const music = cat.sounds.filter((x) => x.kind === "music"),
    fx = cat.sounds.filter((x) => x.kind !== "music");
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Sound</nav><header class="page-head"><h1>Sound</h1><p>The studio's music and effects, composed in code like the films: no samples and no AI audio model. Each one has the prompt it was made from and the recipe that realizes it (<code>sound/src/recipes.ts</code>); <code>bun sound/tools/render.ts</code> makes the same files every time. Turn them on with <b>Sound</b> in the top bar; the music steps aside whenever a film plays with sound.</p></header>
    <section class="sec"><h2>Playlist <small>(${music.length} tracks, one for each theme family)</small></h2><p class="muted">Every track is built on the films' phrase and music-box melody, in its own key, tempo, instruments and room, and mastered to the same loudness. With sound on, each track plays twice and the next one fades in; <b>Play in the studio</b> starts from any of them. Blossom, the app's seventh family, gets its track when its theme is synced into the studio.</p>
    <ul class="sounds">${music.map(row).join("")}</ul></section>
    <section class="sec"><h2>Effects</h2><ul class="sounds">${fx.map(row).join("")}</ul></section>
    <p class="foot">${esc(cat.made)}.</p>`;
  main
    .querySelectorAll<HTMLButtonElement>("button[data-track]")
    .forEach((b) => b.addEventListener("click", () => chooseTrack(b.dataset.track!)));
  markPlaying();
  main.querySelectorAll<HTMLElement>("[data-prompt]").forEach((el) => {
    void text(`/${el.dataset.prompt}`)
      .then((t) => (el.innerHTML = embedded(embedded(markdown(t)))))
      .catch(failed(el));
  });
}

// ---------------------------------------------------------------- series
function series(id: string) {
  const x = seriesOf(id);
  if (!x) return notFound();
  const docs = [...x.docs, ...(x.schedule ? [x.schedule] : [])];
  const head = `<nav class="crumbs"><a href="#/">Studio</a> › ${x.kind === "studies" ? "" : `<a href="#/series">Series</a> › `}${esc(x.title.replace(/:.*/, ""))}</nav><header class="page-head"><h1>${esc(x.title)}${x.sealed ? chip("sealed", "lock") : ""}</h1><p>${esc(x.logline)}</p><p class="meta">${esc(x.shape)}</p>${docs.length ? `<p class="docs">${docs.map((d) => `<a href="#/doc/${encodeURIComponent(d)}">${esc(d.replace(/^\.\.\//, ""))}</a>`).join("")}</p>` : ""}</header>`;
  if (x.studies) {
    const subject = param("subject") as Study["subject"] | undefined,
      family = param("family"),
      shown = x.studies.filter((st) => (!subject || st.subject === subject) && (!family || st.family === family));
    const tab = (k: Study["subject"] | undefined, label: string) =>
      `<a href="#/series/studies${k ? `?subject=${k}` : ""}"${k === subject && !family ? ' aria-current="page"' : ""}>${label} <small>${k ? x.studies!.filter((st) => st.subject === k).length : x.studies!.length}</small></a>`;
    const fams = FAMILIES.map((f) => ({ f, list: shown.filter((st) => st.family === f.id) })).filter(
      (g) => g.list.length,
    );
    const latest = x.notes?.[0];
    main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Studies</nav>
      <header class="page-head"><h1>Studies</h1><p>${x.studies.length} motion techniques, one engine. Each study is one style drawn in code in at least two sizes, with its brief, the exact prompt that built it, a portable prompt anyone can copy, and the critique that shaped it. Start here before pointing the studio at your own product.</p></header>
      <aside class="note-oriel"><p><b>Oriel is imaginary.</b> Most studies advertise Oriel, a scheduling assistant we invented so the pieces can show a product without claiming anything about a real one: no website, no app, no company. The rest need no product at all: short lessons on real topics, every fact sourced, and pieces made just for fun.</p></aside>
      <div class="filter-bar"><nav class="cut-tabs" aria-label="Filter by subject">${tab(undefined, "All")}${tab("oriel", SUBJECT.oriel.label)}${tab("learn", SUBJECT.learn.label)}${tab("fun", SUBJECT.fun.label)}</nav>
      ${family ? `<p class="meta">Showing ${esc(famLabel(family))} · <a class="link" href="#/series/studies">show every family</a></p>` : `<nav class="fam-jump" aria-label="Families">${fams.map(({ f, list }) => `<a href="#sec-fam-${f.id}">${esc(f.label)} <small>${list.length}</small></a>`).join("")}</nav>`}</div>
      ${fams
        .map(
          ({ f, list }) =>
            `<section class="sec fam" id="sec-fam-${f.id}"><h2>${esc(f.label)} <small>${list.length}</small></h2><p class="muted fam-blurb">${esc(f.blurb)}</p><ul class="study-grid">${list.map((st) => studyTile(st)).join("")}</ul></section>`,
        )
        .join("")}
      ${shown.length ? "" : `<p class="empty">No study matches. <a class="link" href="#/series/studies">Show all</a>.</p>`}
      <section class="sec studies-more"><h2>How the studies are made</h2>
        <ul class="links">
          ${latest ? `<li><a href="#/note/${encodeURIComponent(latest.path.split("/").pop()!)}">${esc(latest.title)} →</a><p>From the journal · ${latest.minutes} min read. ${esc(latest.summary)}</p></li>` : ""}
          ${docs.map((d) => `<li><a href="#/doc/${encodeURIComponent(d)}">${esc(d.replace(/^\.\.\//, ""))} →</a></li>`).join("")}
        </ul></section>`;
    mountPreviews(main);
  } else if (x.episodes) {
    const total = x.episodes.reduce((a, e) => a + (byId(e.main ?? "")?.run?.tokens ?? 0), 0);
    main.innerHTML =
      head +
      `<ol class="episodes">${x.episodes
        .map((e) => {
          const p = byId(e.main ?? "");
          if (!p) return "";
          const cut = (k: "vertical" | "carousel" | "single", label: string) => {
            const c = byId(e.cuts[k] ?? "");
            return c
              ? `<a class="cut" href="#/piece/${c.id}"><img src="${poster(c)}" alt="${label} for ${esc(e.title)}" loading="lazy"><span>${label}</span></a>`
              : "";
          };
          const built = p.run
            ? `agent · ${(p.run.tokens / 1000).toFixed(0)}k tokens · ${p.run.minutes} min`
            : p.id.startsWith("s01e01") || p.id.startsWith("ep01")
              ? "hand-built reference"
              : "";
          const bits = [
            p.meta ? secs(p.meta.durationFrames) : "",
            p.atmosphere ?? "",
            p.style ? `${p.style} style` : "",
            p.shots.length ? `${p.shots.length} scenes` : "",
            built,
            p.golden ? "golden locked" : "no golden",
          ].filter(Boolean);
          return `<li class="episode"><a class="ep-poster" href="#/piece/${p.id}" tabindex="-1" aria-hidden="true"><img src="${poster(p)}" alt="" loading="lazy"></a>
        <div class="ep-body"><h2><span class="num">${epNo(e.code)}</span><a href="#/piece/${p.id}">${esc(e.title)}</a></h2><p>${esc(p.logline ?? p.about ?? "")}</p><p class="meta">${bits.map(esc).join(" · ")}</p></div>
        <div class="cuts">${cut("vertical", "9:16")}${cut("carousel", "carousel")}${cut("single", "card")}</div></li>`;
        })
        .join("")}</ol>
      ${total ? `<p class="foot">Agent cost for this series: ${(total / 1e6).toFixed(2)}M tokens across ${x.episodes.filter((e) => byId(e.main ?? "")?.run).length} runs; episode 01 is the hand-built reference.</p>` : ""}`;
  } else {
    main.innerHTML =
      head +
      `<div class="pieces">${(x.pieces ?? [])
        .map((pid) => {
          const p = byId(pid)!;
          return `<a class="piece-link" href="#/piece/${p.id}"><img src="${poster(p)}" alt="" loading="lazy"><b>${esc(p.title ?? p.id)}${p.sealed ? chip("sealed", "lock") : ""}</b><p class="meta">${esc(p.kind)} · ${esc(p.format)}${p.meta && p.kind === "video" ? ` · ${secs(p.meta.durationFrames)}` : ""}</p><p>${esc(p.about ?? "")}</p></a>`;
        })
        .join("")}</div>`;
  }
}

// ---------------------------------------------------------------- piece
/** a slide's description: cover, the beat it was cut from (derive spec), or the closing card */
const sentences = (...parts: (string | undefined)[]) =>
  parts
    .filter(Boolean)
    .map((x) => x!.trim())
    .map((x, i, all) => (i < all.length - 1 && !/[.!?:]$/.test(x) ? `${x}.` : x))
    .join(" ");
function slideAlt(p: Piece, ep: Piece | undefined, i: number, n: number): string {
  const spec = ep?.derive,
    title = p.title ?? ep?.title ?? p.id;
  if (p.role === "single" && spec) return `${title}: ${sentences(spec.single.title, spec.single.sub)}`;
  if (p.role === "carousel" && spec) {
    // four slides, one beat each: the cover carries the first beat, the last carries the sign-off (studio/derive.ts)
    const b = spec.slides[i];
    if (b)
      return `Slide ${i + 1} of ${n}${i === 0 ? `, cover: ${title}.` : ":"} ${sentences(b.title, b.sub)}${i === n - 1 ? " Signed rotli.co." : ""}`;
  }
  return n > 1 ? `Slide ${i + 1} of ${n} of ${title}: ${p.about ?? ""}` : `${title}: ${p.about ?? ""}`;
}
async function piece(id: string) {
  const p = byId(id);
  if (!p) return notFound();
  const x = seriesOf(p.series),
    ep = x?.episodes?.find((e) => e.code === p.episode),
    main_ = ep ? byId(ep.main ?? "") : undefined,
    fps = p.meta?.fps ?? 30;
  const st = x?.studies?.find((s) => s.id === p.study);
  // previous / next in the series (episodes, studies, or the set's order)
  const seq = x?.episodes
    ? x.episodes.map((e) => ({ id: e.main ?? "", label: `${epNo(e.code)} · ${e.title}` }))
    : x?.studies
      ? x.studies.map((s) => ({ id: s.primary, label: `${String(s.no).padStart(2, "0")} · ${s.title}` }))
      : (x?.pieces ?? []).map((id) => ({ id, label: pieceTitle(byId(id)!) }));
  const at = seq.findIndex((q) => q.id === (ep?.main ?? (st ? st.primary : p.id))),
    prev = at > 0 ? seq[at - 1] : undefined,
    next = at >= 0 ? seq[at + 1] : undefined;
  const pager =
    x && at >= 0 && seq.length > 1
      ? `<nav class="pager" aria-label="In this series"><span>${x.episodes ? `${esc(x.title.replace(/:.*/, ""))} · ${at + 1} of ${seq.length}` : `${at + 1} of ${seq.length} in ${esc(x.title)}`}</span>${prev ? `<a href="#/piece/${prev.id}">← ${esc(prev.label)}</a>` : ""}${next ? `<a href="#/piece/${next.id}">${esc(next.label)} →</a>` : ""}</nav>`
      : "";
  const sizeTabs = st
    ? `<nav class="cut-tabs" aria-label="Sizes of this study">${(Object.entries(st.sizes) as [Size, string][]).map(([z, id]) => `<a href="#/piece/${id}"${id === p.id ? ' aria-current="page"' : ""}>${esc(SIZE_LABEL[z])}</a>`).join("")}</nav>`
    : "";
  const cutTabs = st
    ? sizeTabs
    : ep
      ? `<nav class="cut-tabs" aria-label="Formats of this episode">${[
          ["episode", ep.main],
          ["vertical", ep.cuts.vertical],
          ["carousel", ep.cuts.carousel],
          ["single", ep.cuts.single],
        ]
          .filter(([, v]) => v)
          .map(
            ([k, v]) =>
              `<a href="#/piece/${v}"${v === p.id ? ' aria-current="page"' : ""}>${k === "episode" ? "Episode" : k === "single" ? "Card" : k![0]!.toUpperCase() + k!.slice(1)}</a>`,
          )
          .join("")}</nav>`
      : "";
  const media =
    p.kind === "video" && p.video
      ? `<div class="player" style="--ar:${p.meta ? `${p.meta.W}/${p.meta.H}` : "16/9"}"><video id="video" controls preload="metadata" playsinline src="${m(p.video.file)}" poster="${poster(p)}"></video></div>`
      : p.slides?.length
        ? `<div class="slides">${p.slides.map((f, i) => `<a href="${s(f)}" target="_blank"><img src="${s(f)}" alt="${esc(slideAlt(p, main_, i, p.slides!.length))}" loading="lazy"><span aria-hidden="true">${i + 1}</span></a>`).join("")}</div>`
        : `<p class="empty">Not rendered yet: <code>node tools/studio.mjs render ${esc(p.id)}</code></p>`;
  const facts: [string, string][] = [
    ["Kind", `${p.kind} · ${p.format}`],
    ...(st ? [["Study", `${String(st.no).padStart(2, "0")} · ${famLabel(st.family)}`] as [string, string]] : []),
    ...(p.meta
      ? [
          ["Size", `${p.meta.W} × ${p.meta.H}`] as [string, string],
          [
            "Length",
            p.kind === "video"
              ? `${secs(p.meta.durationFrames, fps)} · ${p.meta.durationFrames} frames @ ${p.meta.fps} fps`
              : `${p.shots.length} slide(s)`,
          ] as [string, string],
        ]
      : []),
    ...(p.meta?.family ? [["Theme family", p.meta.family] as [string, string]] : []),
    ...(p.atmosphere ? [["Atmosphere", p.atmosphere] as [string, string]] : []),
    ...(p.style ? [[p.role === "study" ? "Palette" : "Style", p.style] as [string, string]] : []),
    ["Golden", p.golden ? `${p.golden.frames} frames${p.golden.audio ? " + audio" : ""} locked` : "none"],
    ...(p.video
      ? [["Render", `${mb(p.video.bytes)} · ${new Date(p.video.rendered).toLocaleString()}`] as [string, string]]
      : []),
    ...(p.run
      ? [
          [
            "Built by",
            `agent · ${p.run.model ?? "inherited model"} · ${p.run.tokens.toLocaleString()} tokens · ${p.run.minutes} min`,
          ] as [string, string],
        ]
      : []),
  ];
  const sections: [string, string][] = [
    ["breakdown", p.kind === "video" ? "Breakdown" : "Slides"],
    ...(p.derive || (main_?.derive && p.role !== "episode") ? [["cuts", "Cuts"] as [string, string]] : []),
    ...(p.brief || main_?.brief ? [["brief", "Brief"] as [string, string]] : []),
    ...(p.portable ? [["portable", "Portable prompt"] as [string, string]] : []),
    ...(p.prompt || main_?.prompt ? [["prompt", "Agent prompt"] as [string, string]] : []),
    ...((p.run ?? main_?.run) ? [["run", "Agent run"] as [string, string]] : []),
    ["source", "Source"],
    ["files", "Files & checks"],
  ];
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › ${x ? `<a href="#/series/${x.id}">${esc(x.title.replace(/:.*/, ""))}</a> › ` : ""}${ep ? `${epNo(ep.code)} · ${esc(ep.title)}` : esc(p.title ?? p.id)}</nav>
    <header class="page-head piece-head">${pager}<h1>${esc(p.title ?? (ep ? `${ep.title}` : p.id))}${p.sealed ? chip("sealed", "lock") : ""}</h1><p>${esc(p.logline ?? p.about ?? "")}</p>${p.error ? `<p class="error">Import error: ${esc(p.error)}</p>` : ""}</header>
    ${st ? `<aside class="note-oriel subject-${st.subject}"><p><b>${esc(SUBJECT[st.subject].note[0])}</b> ${esc(SUBJECT[st.subject].note[1])} <a class="link" href="#/series/studies?family=${esc(st.family ?? "")}">More ${esc(famLabel(st.family))} →</a></p></aside>` : ""}
    ${cutTabs}<div class="piece-top"><div>${media}${downloads(p)}</div><dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
    <nav class="section-tabs">${sections.map(([k, v]) => `<a href="#sec-${k}">${v}</a>`).join("")}</nav>
    ${sections.map(([k, v]) => `<section id="sec-${k}" class="sec"><h2>${v}</h2><div class="sec-body" data-sec="${k}"><p class="muted">Loading…</p></div></section>`).join("")}`;
  const body = (k: string) => main.querySelector<HTMLElement>(`[data-sec="${k}"]`);
  // breakdown: a timeline the width of the piece, then one card per scene
  const video = main.querySelector<HTMLVideoElement>("#video");
  if (p.kind === "video" && p.meta) {
    const D = p.meta.durationFrames;
    body("breakdown")!.innerHTML =
      `<div class="timeline">${p.shots.map((sh) => `<button style="flex:${sh.end - sh.start}" data-seek="${sh.start}" aria-label="Seek to ${esc(sh.id)}, ${tc(sh.start, fps)}" title="${esc(sh.id)} · ${tc(sh.start, fps)}–${tc(sh.end, fps)}"><span>${esc(sh.id)}</span></button>`).join("")}<i class="playhead" id="playhead"></i></div>
      <div class="scenes">${p.shots
        .map((sh, i) => {
          const mid = Math.floor((sh.start + sh.end) / 2);
          return `<article class="scene"><button class="frame" style="aspect-ratio:${p.meta!.W}/${p.meta!.H}" data-seek="${sh.start}" aria-label="Seek to scene ${i + 1}, ${esc(sh.id)}, at ${tc(sh.start, fps)}"><img src="/api/motion/thumb/${p.slug}/${mid}.jpg" alt="" loading="lazy"></button>
        <div><b>${i + 1}. ${esc(sh.id)}</b><small>${tc(sh.start, fps)} – ${tc(sh.end, fps)} · ${secs(sh.end - sh.start, fps)} · frames ${sh.start}–${sh.end - 1}</small>${sh.template ? `<p>${esc(sh.template)}</p>` : ""}${STATIC ? "" : `<a class="link" href="/api/motion/frame/${p.id}/${mid}.png" target="_blank">Exact frame ${mid} (full size render)</a>`}</div></article>`;
        })
        .join("")}</div>`;
    main.querySelectorAll<HTMLElement>("[data-seek]").forEach(
      (b) =>
        (b.onclick = () => {
          if (video) {
            video.currentTime = Number(b.dataset.seek) / fps + 0.001;
            video.scrollIntoView({ block: "nearest", behavior: smooth() });
          }
        }),
    );
    const head = $("#playhead");
    video?.addEventListener(
      "timeupdate",
      () => (head.style.left = `${Math.min(100, ((video.currentTime * fps) / D) * 100)}%`),
    );
  } else
    body("breakdown")!.innerHTML = p.slides?.length
      ? `<p class="muted">${p.slides.length} slide(s) exported to <code>exports/${esc(p.slug)}/${esc(p.format)}/</code>${p.caption ? "; caption below." : "."}</p>${p.caption ? `<blockquote>${esc(p.caption)}</blockquote>` : ""}`
      : `<p class="muted">No exports yet.</p>`;
  // cuts: how each vertical beat / slide / card is cut from the episode (source frame + crop box)
  const spec = p.derive ?? main_?.derive,
    src = p.role === "episode" ? p : main_;
  if (spec && src && body("cuts")) {
    const crop = (b: Beat, label: string) => {
      const W = src.meta?.W ?? 1920,
        H = src.meta?.H ?? 1080;
      return `<figure class="cutbeat"><div class="frame" style="aspect-ratio:${W}/${H}"><img src="/api/motion/thumb/${src.slug}/${b.frame}.jpg" alt="" loading="lazy"><i style="left:${(b.crop.x / W) * 100}%;top:${(b.crop.y / H) * 100}%;width:${(b.crop.w / W) * 100}%;height:${(b.crop.h / H) * 100}%"></i></div>
      <figcaption><b>${esc(label)}: ${esc(b.title)}</b>${b.sub ? `<small>${esc(b.sub)}</small>` : ""}<small>episode frame ${b.frame}${b.len ? ` · plays ${b.len} frames (${secs(b.len)})` : ""} · crop ${b.crop.w}×${b.crop.h} at ${b.crop.x},${b.crop.y}</small></figcaption></figure>`;
    };
    const show =
      p.role === "vertical"
        ? ([["vertical", spec.vertical]] as const)
        : p.role === "carousel"
          ? ([["slides", spec.slides]] as const)
          : p.role === "single"
            ? ([["single", [spec.single]]] as const)
            : ([
                ["vertical", spec.vertical],
                ["slides", spec.slides],
                ["single", [spec.single]],
              ] as const);
    body("cuts")!.innerHTML =
      `<p class="muted">Cut from <a class="link" href="#/piece/${src.id}">${esc(src.title ?? src.id)}</a> by <code>studio/derive.ts</code>: every beat re-renders the episode frame inside the box shown${spec.line ? ", ending on the line-art quokka" : ""}.</p>` +
      show
        .map(
          ([k, beats]) =>
            `<h3>${k === "vertical" ? "9:16 vertical beats" : k === "slides" ? "Carousel slides" : "Card"}</h3><div class="cutbeats">${(beats as Beat[]).map((b, i) => crop(b, `${k === "single" ? "Card" : k === "slides" ? "Slide" : "Beat"} ${k === "single" ? "" : i + 1}`)).join("")}</div>`,
        )
        .join("");
  }
  // brief · prompt · run · source · files (fetched lazily)
  const briefFile = p.brief ?? main_?.brief;
  if (briefFile && st)
    json<Record<string, unknown>>(m(briefFile))
      .then((b) => {
        const beats = (b.story ?? []) as { from: number; to: number; what: string }[];
        body("brief")!.innerHTML = `<dl class="facts wide">${[
          ["Style", b.style],
          ["Learns from", b.learnsFrom],
          ["Sizes", b.sizes],
          ["Sound", b.sound],
          ["Teaches", b.teaches],
          [
            "Timing",
            `${b.frames} frames at ${b.fps} fps, ${b.bpm} bpm (a beat is ${(60 / Number(b.bpm)) * Number(b.fps)} frames)`,
          ],
        ]
          .map(([k, v]) => `<dt>${k}</dt><dd>${esc(String(v ?? ""))}</dd>`)
          .join("")}</dl>
      ${
        Array.isArray(b.facts) && b.facts.length
          ? `<h3>Facts on screen, with sources</h3><div class="table"><table><thead><tr><th>Claim</th><th>Source</th></tr></thead><tbody>${(b.facts as { claim: string; source: string }[]).map((f) => `<tr><td>${esc(f.claim)}</td><td>${f.source.startsWith("https://") ? `<a class="link" href="${esc(f.source)}" target="_blank" rel="noreferrer">${esc(f.source.replace(/^https:\/\/(www\.)?/, "").slice(0, 60))}</a>` : esc(f.source)}</td></tr>`).join("")}</tbody></table></div>`
          : ""
      }
      <h3>Beats</h3><div class="table"><table><thead><tr><th>Frames</th><th>What happens</th></tr></thead><tbody>${beats.map((x) => `<tr><td>${x.from}–${x.to} (${secs(x.to - x.from, Number(b.fps))})</td><td>${esc(x.what)}</td></tr>`).join("")}</tbody></table></div>
      <p><a class="link" href="${m(briefFile)}" target="_blank">${esc(briefFile)}</a></p>`;
      })
      .catch(failed(body("brief")));
  else if (briefFile)
    json<Record<string, unknown>>(m(briefFile))
      .then((b) => {
        const st = (b.story ?? {}) as Record<string, string>,
          feats = (b.features ?? []) as { claim: string; source: string }[],
          scenes = (b.scenes ?? []) as { id: string; len: number; template: string }[];
        body("brief")!.innerHTML = `<dl class="facts wide">${[
          ["Logline", b.logline],
          ["Setup", st.setup],
          ["Turn", st.turn],
          ["Payoff", st.payoff],
          ["Token", b.token],
          ["Atmosphere", b.atmosphere],
          ["Visits", ([] as string[]).concat((b.visits as string[]) ?? []).join(", ")],
          ["Style", b.style],
          ["Cast", ([] as string[]).concat((b.cast as string[]) ?? []).join(" · ")],
          ["Music", typeof b.music === "string" ? b.music : JSON.stringify(b.music)],
          ["Next", b.next],
        ]
          .filter(([, v]) => v)
          .map(([k, v]) => `<dt>${k}</dt><dd>${esc(String(v))}</dd>`)
          .join("")}</dl>
      <h3>Claims (every caption must come from these)</h3><div class="table"><table><thead><tr><th>Claim</th><th>Source</th></tr></thead><tbody>${feats.map((f) => `<tr><td>${esc(f.claim)}</td><td>${esc(f.source)}</td></tr>`).join("")}</tbody></table></div>
      <h3>Scenes</h3><div class="table"><table><thead><tr><th>Scene</th><th>Frames</th><th>Template</th></tr></thead><tbody>${scenes.map((sc) => `<tr><td>${esc(sc.id)}</td><td>${sc.len} (${secs(sc.len)})</td><td>${esc(sc.template)}</td></tr>`).join("")}</tbody></table></div>
      <p><a class="link" href="${m(briefFile)}" target="_blank">${esc(briefFile)}</a></p>`;
      })
      .catch(failed(body("brief")));
  const promptFile = p.prompt ?? main_?.prompt;
  if (promptFile)
    text(m(promptFile))
      .then(
        (t) =>
          (body("prompt")!.innerHTML =
            `<p class="muted">Generated by <code>tools/${st ? "study-prompt" : "brief-to-prompt"}.mjs</code> from the brief: the ${st ? "study rules" : "preamble that worked"}, plus this ${st ? "study" : "episode"}. <a class="link" href="${m(promptFile)}" target="_blank">${esc(promptFile)}</a></p>${copyButton(t, "Copy prompt")}<div class="doc">${embedded(markdown(t))}</div>`),
      )
      .catch(failed(body("prompt")));
  if (p.portable)
    text(m(p.portable))
      .then(
        (t) =>
          (body("portable")!.innerHTML =
            `<p class="muted">Paste this into Claude (or any capable model) to make a piece in this style: one HTML file, no setup, nothing from this repository. It is written from the same brief as the study.</p>${copyButton(t, "Copy prompt", true)}<pre class="prompt">${esc(t)}</pre>`),
      )
      .catch(failed(body("portable")));
  const run = p.run ?? main_?.run;
  if (run)
    text(m(run.file))
      .then((t) => (body("run")!.innerHTML = `<div class="doc">${embedded(markdown(t))}</div>`))
      .catch(failed(body("run")));
  body("source")!.innerHTML = p.module
    ? `<p class="muted"><a class="link" href="${m(p.module)}" target="_blank">${esc(p.module)}</a> · host <a class="link" href="${m(p.host)}" target="_blank">${esc(p.host)}</a></p><pre class="code" id="code">Loading…</pre>`
    : `<p class="muted">No module.</p>`;
  if (p.module)
    text(m(p.module))
      .then(
        (t) =>
          ($("#code").innerHTML = t
            .split("\n")
            .map((l, i) => `<span class="ln">${i + 1}</span>${esc(l)}`)
            .join("\n")),
      )
      .catch(failed(main.querySelector("#code")));
  const files = [
    ["Module", p.module],
    ["Host page", p.host],
    ["Brief", briefFile],
    ["Prompt", promptFile],
    ["Agent run", run?.file],
    ["Golden", p.golden?.file],
    ["Render", p.video?.file],
    ["Poster", p.video?.poster ?? undefined],
    ["Thumbnail", p.thumbnail],
  ].filter(([, v]) => v) as [string, string][];
  body("files")!.innerHTML =
    `<dl class="facts wide">${files.map(([k, v]) => `<dt>${k}</dt><dd><a class="link" href="${fileUrl(v)}" target="_blank">${esc(v)}</a></dd>`).join("")}${p.slides?.length ? `<dt>Exports</dt><dd><code>${esc(p.slides[0]!.replace(/\/[^/]+$/, "/"))}</code></dd>` : ""}${p.video ? `<dt>Render sha256</dt><dd><code>${p.video.sha}…</code></dd>` : ""}</dl>
    <p class="actions">${p.golden && !STATIC ? `<button class="ghost" id="verify">Verify golden now</button>` : ""}<span id="verify-out" class="muted"></span></p>
    <p class="muted">Re-make it: <code>node tools/studio.mjs render ${esc(p.id)} &amp;&amp; node tools/studio.mjs check ${esc(p.id)} &amp;&amp; node tools/golden.mjs ${esc(p.id)}</code> (from <code>motion/</code>).</p>`;
  const vb = main.querySelector<HTMLButtonElement>("#verify");
  if (vb)
    vb.onclick = async () => {
      vb.disabled = true;
      $("#verify-out").textContent = "Rendering the golden frames… (up to a minute)";
      try {
        const r = await json<{ ok: boolean; output: string }>(`/api/motion/verify/${p.id}`, { method: "POST" });
        if (r.ok) cue("done");
        $("#verify-out").innerHTML =
          `${r.ok ? chip("SAME", "ok") : chip("DIFFERS", "bad")} <code>${esc(r.output)}</code>`;
      } catch (e) {
        failed(main.querySelector("#verify-out"))(e);
      } finally {
        vb.disabled = false;
      }
    };
}

// ---------------------------------------------------------------- brand
async function brand() {
  const [b, t, c, atm] = await Promise.all([
    json<Record<string, any>>(m("brand/brand.json")),
    json<{ themes: { id: string; family: string; mode: string; label: string; roles: Record<string, string> }[] }>(
      m("brand/themes.json"),
    ),
    json<{ looks: { id: string; pose: string; style: string; accessory: string }[] }>(m("brand/companions.json")),
    json<
      {
        id: string;
        label: string;
        family: string;
        dark: boolean;
        drift: number;
        why: string;
        key: number;
        melody: number;
      }[]
    >(api("atmospheres")),
  ]);
  const looks = await json<string[]>(api("looks"));
  const pack = await json<{
    name: string;
    product: string;
    note: string;
    fonts: { files: { spec: string; file: string }[] };
    palettes: Record<string, Record<string, string>>;
  }>(m("brand/packs/studio/pack.json"));
  const fams = [...new Set(t.themes.map((x) => x.family))];
  const reel = byId("atmosphereReel");
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Brand kit</nav><header class="page-head"><h1>Brand kit</h1><p>Rotli's pack first, then the neutral pack the studies use. Rotli's pieces read their look from <a class="link" href="${m("brand/brand.json")}" target="_blank">brand/brand.json</a> (copy, palette, fonts with sha256 locks, character), <a class="link" href="${m("brand/themes.json")}" target="_blank">themes.json</a> (the app's twelve environments) and <a class="link" href="${m("brand/companions.json")}" target="_blank">companions.json</a>.</p></header>
  <section class="sec"><h2>Copy</h2><dl class="facts wide">${[
    "product",
    "wordmark",
    "tagline",
    "url",
    "platform",
    "cta",
    "promise",
    "voice",
  ]
    .filter((k) => b[k] !== undefined)
    .map((k) => `<dt>${k}</dt><dd>${esc(String(b[k]))}</dd>`)
    .join("")}</dl></section>
  <section class="sec"><h2>Palette <small>(the kit's <code>C</code>)</small></h2><div class="swatches">${Object.entries(
    b.palette as Record<string, string>,
  )
    .map(
      ([k, v]) =>
        `<div class="swatch"><i style="background:${esc(v)}"></i><b>${esc(k)}</b><code>${esc(v)}</code></div>`,
    )
    .join("")}</div></section>
  <section class="sec"><h2>Type</h2><div class="type-specimens"><p style="font-family:'General Sans';font-weight:600;letter-spacing:${b.fonts.tracking ?? -0.045}em;font-size:44px">Room to think. Files you keep.</p><p style="font-family:'Baloo 2';font-weight:600;font-size:44px">rotli</p></div>
    <div class="table"><table><thead><tr><th>Font</th><th>File</th><th>sha256 lock</th></tr></thead><tbody>${(b.fonts.files as { spec: string; file: string; sha256: string }[]).map((f) => `<tr><td>${esc(f.spec)}</td><td><code>${esc(f.file)}</code></td><td><code>${f.sha256.slice(0, 16)}…</code></td></tr>`).join("")}</tbody></table></div><p class="muted">Headline tracking ${b.fonts.tracking ?? -0.045}em (rotli.co). A render whose font file doesn't match its lock refuses to build.</p></section>
  <section class="sec"><h2>Theme families <small>(${t.themes.length} environments)</small></h2><ul class="families">${fams
    .map(
      (f) =>
        `<li><b>${esc(f)}</b>${t.themes
          .filter((x) => x.family === f)
          .map(
            (x) =>
              `<div class="env" style="background:${x.roles.ground};color:${x.roles.text};border-color:${x.roles.border}"><span>${esc(x.label)}</span><span class="dots">${["surface", "surface-2", "tint", "accent", "accent-text", "success", "text-muted"].map((r) => `<i title="${r} ${x.roles[r]}" style="background:${x.roles[r]}"></i>`).join("")}</span></div>`,
          )
          .join("")}</li>`,
    )
    .join("")}</ul></section>
  <section class="sec"><h2>Atmospheres <small>(<code>studio/atmospheres.ts</code>)</small></h2>${reel?.video ? `<p><a class="link" href="#/piece/atmosphereReel">Watch the atmosphere reel</a> · <a class="link" href="${m("out/atmosphere-board.png")}" target="_blank">board</a></p>` : ""}
    <div class="table"><table><thead><tr><th>Id</th><th>Mood</th><th>Family</th><th>Ground</th><th>Music</th><th>Used for</th></tr></thead><tbody>${atm.map((a) => `<tr><td><code>${esc(a.id)}</code></td><td>${esc(a.label)}</td><td>${esc(a.family)}</td><td>${a.dark ? "deep" : "light"} · drift ${a.drift}</td><td>key +${a.key} · melody ${["tune", "walking", "lilting"][a.melody] ?? a.melody}</td><td>${esc(a.why)}</td></tr>`).join("")}</tbody></table></div></section>
  <section class="sec"><h2>The neutral pack <small>(<code>brand/packs/studio/</code>, used by the studies)</small></h2><p class="muted">${esc(pack.note)}</p>
    ${Object.entries(pack.palettes)
      .map(
        ([id, pal]) =>
          `<h3>${esc(id)}</h3><div class="swatches">${Object.entries(pal)
            .map(
              ([k, v]) =>
                `<div class="swatch"><i style="background:${esc(v)}"></i><b>${esc(k)}</b><code>${esc(v)}</code></div>`,
            )
            .join("")}</div>`,
      )
      .join("")}
    <p class="muted">Fonts: ${pack.fonts.files.map((f) => esc(f.spec.replace("@", " "))).join(" · ")} (OFL). <a class="link" href="#/use">Use it for your product →</a></p></section>
  <section class="sec"><h2>Companion looks <small>(rendered from the app's real &lt;Character&gt;)</small></h2><div class="looks">${c.looks
    .filter((l) => looks.includes(`${l.id}.png`))
    .map(
      (l) =>
        `<figure><img src="${s(`library/companion-looks/${l.id}.png`)}" alt="" loading="lazy"><figcaption>${esc(l.id)}</figcaption></figure>`,
    )
    .join(
      "",
    )}</div><p class="muted">${c.looks.length - c.looks.filter((l) => looks.includes(`${l.id}.png`)).length} listed look(s) not rendered yet: <code>bun run sync:companions</code>.</p></section>`;
}

// ---------------------------------------------------------------- docs-style pages
type Doc = { label: string; path: string; group?: string };
async function docPage(title: string, intro: string, docs: Doc[], active?: string) {
  const current = docs.find((d) => d.path === active) ?? docs[0]!;
  const groups = [...new Set(docs.map((d) => d.group ?? ""))];
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › ${esc(title)}</nav><header class="page-head"><h1>${esc(title)}</h1><p>${intro}</p></header>
    <div class="doc-layout"><aside class="doc-list">${groups
      .map(
        (g) =>
          `${g ? `<span class="group-name">${esc(g)}</span>` : ""}${docs
            .filter((d) => (d.group ?? "") === g)
            .map(
              (d) =>
                `<a href="${location.hash.split("?")[0]}?doc=${encodeURIComponent(d.path)}" ${d === current ? 'aria-current="page"' : ""}>${esc(d.label)}</a>`,
            )
            .join("")}`,
      )
      .join("")}</aside>
    <article class="doc" id="doc"><p class="muted">Loading…</p></article></div>`;
  const url = current.path.startsWith("skill:") ? "" : fileUrl(current.path);
  const body = current.path.startsWith("skill:")
    ? ((await json<{ name: string; where: string; path: string; text: string }[]>(api("skills"))).find(
        (k) => `skill:${k.where}:${k.name}` === current.path,
      )?.text ?? "")
    : await text(url).catch((e) => `**Could not load:** ${e}`);
  $("#doc").innerHTML =
    `<p class="doc-path"><code>${esc(current.path.replace(/^skill:(\w+):/, "$1 skill: "))}</code>${url ? ` · <a class="link" href="${url}" target="_blank">raw</a>` : ""} · <button class="link copy" type="button" data-label="Copy" data-copy="${esc(body)}">Copy</button></p>${/(\.(json|ts|mjs|py)|LICENSE|NOTICE)$/.test(current.path) ? `<pre class="code">${esc(body)}</pre>` : embedded(markdown(body))}`;
}
const param = (k: string) => new URLSearchParams(location.hash.split("?")[1] ?? "").get(k) ?? undefined;

async function workflows() {
  const prompts = M.series.flatMap((x) =>
    (x.episodes ?? []).map((e) => byId(e.main ?? "")?.prompt).filter(Boolean),
  ) as string[]; // episode prompts
  const briefs = M.pieces.filter((p) => p.brief).map((p) => p.brief!);
  await docPage(
    "Prompts & briefs",
    "How any piece is made, and made again. A brief (JSON) plus the preamble becomes the agent prompt, deterministically; the review checklist gates every sheet.",
    [
      { label: "How to make a piece", path: "workflows/README.md", group: "Process" },
      { label: "Agent preamble", path: "workflows/agent-preamble.md", group: "Process" },
      { label: "Review checklist", path: "workflows/review-checklist.md", group: "Process" },
      { label: "Season One bible", path: "series/season-one/bible.md", group: "Process" },
      ...prompts.map((p) => ({
        label: p.replace(/^series\/[\w-]+\/prompts\//, "").replace(".prompt.md", " prompt"),
        path: p,
        group: "Episode prompts",
      })),
      ...briefs
        .filter((b) => !b.startsWith("series/studies/"))
        .map((b) => ({
          label: b.replace(/^series\/[\w-]+\/episodes\//, "").replace(".json", " brief"),
          path: b,
          group: "Episode briefs",
        })),
      { label: "Studies bible", path: "series/studies/bible.md", group: "Studies" },
      { label: "Study rules (preamble)", path: "workflows/study-preamble.md", group: "Studies" },
      ...(seriesOf("studies")?.studies ?? []).flatMap((st) => [
        {
          label: `${String(st.no).padStart(2, "0")} ${st.title}: prompt`,
          path: `series/studies/prompts/${st.id}.prompt.md`,
          group: "Studies",
        },
        { label: `${String(st.no).padStart(2, "0")} ${st.title}: brief`, path: st.brief, group: "Studies" },
      ]),
    ],
    param("doc"),
  );
}
async function runs() {
  const list = M.pieces.filter((p) => p.run).sort((a, b) => a.run!.launched.localeCompare(b.run!.launched));
  const tok = list.reduce((a, p) => a + p.run!.tokens, 0),
    min = list.reduce((a, p) => a + p.run!.minutes, 0);
  await docPage(
    "Agent runs",
    `Every request, in the owner's words, and every agent that built a piece: its full prompt, follow-ups and unedited report. ${list.length} runs · ${(tok / 1e6).toFixed(2)}M tokens · ${min.toFixed(0)} agent-minutes. Recovered from the session transcript by <code>tools/extract-runs.mjs</code>.`,
    [
      { label: "The owner's requests", path: "workflows/runs/requests.md", group: "Requests" },
      { label: "Frame reviews by other models", path: "workflows/runs/reviews.md", group: "Requests" },
      ...list.map((p) => ({
        label: `${p.run!.description.replace(/^Build /, "")} · ${(p.run!.tokens / 1000).toFixed(0)}k`,
        path: p.run!.file,
        group: "Agent runs",
      })),
    ],
    param("doc"),
  );
}
async function skills() {
  const all = await json<{ name: string; where: string; path: string }[]>(api("skills"));
  const globals = all.filter((k) => k.where !== "studio").length;
  await docPage(
    "Skills",
    `The instructions agents follow here. They live in <code>.claude/skills/</code>, where Claude Code finds them.${globals ? ` ${globals} global skill(s) this studio relies on are listed read-only.` : ""} The render engine's own skill is anidoodle (credited under Docs &amp; licences).`,
    [
      { label: "AGENTS.md (studio guide)", path: "../AGENTS.md", group: "Studio" },
      ...all.map((k) => ({
        label: k.name,
        path: `skill:${k.where}:${k.name}`,
        group: k.where === "studio" ? "Studio" : "Global (read-only)",
      })),
    ],
    param("doc"),
  );
}
async function tools() {
  const list = await json<{ file: string; about: string }[]>(api("tools"));
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Tools</nav><header class="page-head"><h1>Tools</h1><p>Every command in the studio, with the usage notes from its own header. Motion tools run with Node from <code>motion/</code>; studio scripts run with Bun from the studio root.</p></header>
    <ul class="tools">${list
      .map((t) => {
        const lines = (t.about || "(no header)").split("\n").filter((l) => !l.startsWith("Derived from anidoodle")),
          [first, ...rest] = lines;
        return `<li><details><summary><code>${esc(t.file)}</code><span>${esc(first ?? "")}</span></summary><pre>${esc(rest.join("\n").trim() || first || "")}</pre><p class="meta"><a class="link" href="${t.file.startsWith("motion/") ? m(t.file.slice(7)) : s(t.file)}" target="_blank">Open ${esc(t.file)}</a></p></details></li>`;
      })
      .join("")}</ul>`;
}
async function use() {
  await wizard({
    main,
    step: Number(param("step") ?? 1) - 1,
    studies: studies().map((st) => ({
      id: st.id,
      no: st.no,
      title: st.title,
      family: st.family ?? "",
      subject: st.subject,
      poster: poster(tilePiece(st)),
      piece: st.primary,
      brief: st.brief,
    })),
    families: FAMILIES,
    brief: (path) => json<Record<string, unknown>>(m(path)),
    go: (step) => (location.hash = `#/use?step=${step + 1}`),
  });
}
async function docs() {
  await docPage(
    "Docs & licences",
    "What the studio is, what it proved, what's still Rotli-shaped, and the licences it ships under.",
    [
      { label: "Evaluation: what ports to other products", path: "../docs/evaluation.md", group: "Motion room" },
      { label: "Motion room README", path: "README.md", group: "Motion room" },
      { label: "Launch month plan", path: "../docs/launch/rotli-launch-month.md", group: "Motion room" },
      { label: "Studio README", path: "../README.md", group: "Studio" },
      { label: "Contributing", path: "../CONTRIBUTING.md", group: "Studio" },
      { label: "Changelog", path: "../CHANGELOG.md", group: "Studio" },
      { label: "Security", path: "../SECURITY.md", group: "Studio" },
      { label: "Agent rules", path: "../AGENTS.md", group: "Studio" },
      { label: "Architecture", path: "../ARCHITECTURE.md", group: "Studio" },
      { label: "Design rules", path: "../DESIGN.md", group: "Studio" },
      { label: "Archive (first films)", path: "../archive/README.md", group: "Studio" },
      { label: "Next stage (proposal)", path: "../docs/proposals/2026-09-25-next-stage.md", group: "Proposals" },
      {
        label: "Codex review 2026-09-25: triage",
        path: "../docs/reviews/2026-09-25-codex-astra/triage.md",
        group: "Reviews",
      },
      { label: "Security review", path: "../docs/reviews/2026-09-25-codex-astra/security.md", group: "Reviews" },
      {
        label: "Architecture review",
        path: "../docs/reviews/2026-09-25-codex-astra/architecture.md",
        group: "Reviews",
      },
      { label: "Product and UX review", path: "../docs/reviews/2026-09-25-codex-astra/product.md", group: "Reviews" },
      { label: "Licence (MIT)", path: "../LICENSE", group: "Licences" },
      { label: "NOTICE", path: "../NOTICE", group: "Licences" },
      { label: "anidoodle (Apache-2.0): attribution", path: "third_party/anidoodle/README.md", group: "Licences" },
      { label: "anidoodle LICENSE", path: "third_party/anidoodle/LICENSE", group: "Licences" },
    ],
    param("doc"),
  );
}
// ---------------------------------------------------------------- journal: the field notes, long-form
const noteFile = (path: string) => path.split("/").pop()!;
function journal() {
  const notes = seriesOf("studies")?.notes ?? [];
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Journal</nav><header class="page-head"><h1>Journal</h1><p>Long-form field notes from the studio: what we tried, how we measured it, and what we would tell you before you start making motion with a model. Every number can be re-run from the repository.</p></header>
    ${
      notes.length
        ? `<ol class="journal">${notes
            .map(
              (n, i) =>
                `<li><a class="entry" href="#/note/${encodeURIComponent(noteFile(n.path))}"><span class="meta">Field note ${String(notes.length - i).padStart(2, "0")} · ${esc(n.date)} · ${n.minutes} min read</span><h2>${esc(n.title)}</h2><p>${esc(n.summary)}</p><span class="link">Read →</span></a></li>`,
            )
            .join("")}</ol>`
        : `<p class="empty">No notes yet.</p>`
    }`;
}
/** a field note (series/studies/notes/<file>.md): an article, set for reading, with its contents beside it */
async function note(file: string) {
  const notes = seriesOf("studies")?.notes ?? [],
    at = notes.findIndex((n) => noteFile(n.path) === file),
    meta = notes[at];
  if (!meta) return notFound();
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › <a href="#/journal">Journal</a> › Field note ${String(notes.length - at).padStart(2, "0")}</nav><div class="note-layout"><article class="doc note" id="doc"><p class="muted">Loading…</p></article><aside class="toc" id="toc" aria-label="On this page"></aside></div>`;
  const body = await text(m(meta.path)).catch((e) => `**Could not load:** ${e}`);
  // a note is its own page, so its "# " title stays the page's h1 (other docs sit under a page title and are demoted);
  // every h2 gets an id the contents rail links to (#sec-… links scroll, they never route)
  const heads: string[] = [];
  const html = markdown(body).replace(/<h2 id="[^"]*">([\s\S]*?)<\/h2>/g, (_, t: string) => {
    heads.push(t);
    return `<h2 id="sec-n${heads.length}">${t}</h2>`;
  });
  const newer = notes[at - 1],
    older = notes[at + 1];
  $("#doc").innerHTML =
    html.replace(
      /(<\/h1>)/,
      `$1<p class="note-meta">${esc(meta.date)} · ${meta.minutes} min read · <button class="link copy" type="button" data-label="Copy the markdown" data-copy="${esc(body)}">Copy the markdown</button></p>`,
    ) +
    `<nav class="note-pager" aria-label="More notes">${older ? `<a href="#/note/${encodeURIComponent(noteFile(older.path))}"><small>Older</small>${esc(older.title)}</a>` : "<span></span>"}${newer ? `<a class="next" href="#/note/${encodeURIComponent(noteFile(newer.path))}"><small>Newer</small>${esc(newer.title)}</a>` : `<a class="next" href="#/journal"><small>Back to</small>The journal</a>`}</nav>
    <p class="doc-path"><a class="link" href="${m(meta.path)}" target="_blank">${esc(meta.path)}</a></p>`;
  if (heads.length > 2)
    $("#toc").innerHTML =
      `<h2>On this page</h2><ol>${heads.map((h, i) => `<li><a href="#sec-n${i + 1}">${h.replace(/<[^>]+>/g, "")}</a></li>`).join("")}</ol>`;
}
async function doc(path: string) {
  await docPage(path.replace(/^\.\.\//, ""), "", [{ label: path, path }], path);
}

// ---------------------------------------------------------------- isolation
async function isolation(fresh = false) {
  if (STATIC) {
    main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Isolation audit</nav><header class="page-head"><h1>Isolation audit</h1><p>The audit reads the product repos, worktrees and branches on the Mac, so it only runs there: <code>bun scripts/check-isolation.ts</code>, or the Isolation page of the local studio (<code>bun start</code> → 127.0.0.1:4500/motion). This hosted copy is a static, read-only snapshot served by its own Railway project; it shares nothing with rotli.co.</p></header>`;
    return;
  }
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Isolation audit</nav><header class="page-head"><h1>Isolation audit</h1><p>Proof that the studio's work stays in <code>~/rotli-studio</code>: its code only reads declared sources; no render sits in a product repo, worktree or branch; the live sites reference none; and what lives outside the studio does so on purpose. Read-only: <code>bun scripts/check-isolation.ts</code>.</p><p><button class="ghost" id="again">Run again</button> <span class="muted" id="when">${fresh ? "" : "Running (walks the product repos, ~10 s)…"}</span></p></header><div id="iso"></div>`;
  $("#again").onclick = () => isolation(true);
  if (fresh) $("#when").textContent = "Running…";
  type Rep = {
    when: string;
    status: string;
    products: string[];
    worktrees: string[];
    checks: { title: string; status: string; findings: { level: string; text: string; evidence?: string[] }[] }[];
  };
  const r = await json<Rep>(`/api/motion/isolation${fresh ? "?fresh=1" : ""}`).catch(
    (e) => ({ error: String(e) }) as unknown as Rep,
  );
  if (!r.checks) {
    $("#iso").innerHTML = `<p class="error">${esc(JSON.stringify(r))}</p>`;
    return;
  }
  $("#when").textContent =
    `Last run ${new Date(r.when).toLocaleString()} · products ${r.products.join(", ")} · ${r.worktrees.length} worktrees`;
  $("#iso").innerHTML =
    `<p class="banner ${r.status.toLowerCase()}">Overall: <b>${r.status}</b>${r.status === "PASS" ? " — nothing leaked." : " — read the findings below; each says where, and whether it predates the studio."}</p>` +
    r.checks
      .map(
        (c) =>
          `<section class="sec iso-check"><h2>${chip(c.status, c.status.toLowerCase())} ${esc(c.title)}</h2><ul class="findings">${c.findings.map((f) => `<li>${chip(f.level, f.level.toLowerCase())} ${esc(f.text)}${f.evidence?.length ? `<details><summary>${f.evidence.length} item(s)</summary><pre>${esc(f.evidence.join("\n"))}</pre></details>` : ""}</li>`).join("")}</ul></section>`,
      )
      .join("");
}

// ---------------------------------------------------------------- router
function notFound() {
  main.innerHTML = `<p class="empty">Nothing here. <a class="link" href="#/">Back to the studio</a>.</p>`;
}
async function route() {
  if (!M) return; // a hash change while the catalogue is still loading: the first render will pick it up
  const g = ++gen;
  const h = location.hash || "#/",
    [path] = h.split("?"),
    parts = path!.replace(/^#\/?/, "").split("/");
  stopPlayers?.();
  stopPlayers = null;
  const turned = routed;
  if (turned) cue(parts[0] === "piece" ? "open" : "page");
  routed = true;
  renderNav(navKey(parts));
  document.body.classList.toggle("is-home", !parts[0]);
  document.querySelectorAll<HTMLAnchorElement>(".topnav a").forEach((a) => {
    if (path!.startsWith(a.getAttribute("href")!)) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  try {
    if (!parts[0]) {
      home();
      stopPlayers = mountFilmPlayers(main);
    } else if (parts[0] === "library") library();
    else if (parts[0] === "carousels") carousels();
    else if (parts[0] === "wallpapers") await wallpapers();
    else if (parts[0] === "prompts") await promptLibrary();
    else if (parts[0] === "posts") await posts();
    else if (parts[0] === "sound") await sound();
    else if (parts[0] === "series") {
      if (parts[1]) series(parts[1]);
      else seriesIndex();
    } else if (parts[0] === "use") await use();
    else if (parts[0] === "piece") await piece(parts[1] ?? "");
    else if (parts[0] === "brand") await brand();
    else if (parts[0] === "workflows") await workflows();
    else if (parts[0] === "runs") await runs();
    else if (parts[0] === "skills") await skills();
    else if (parts[0] === "tools") await tools();
    else if (parts[0] === "docs") await docs();
    else if (parts[0] === "doc") await doc(decodeURIComponent(parts.slice(1).join("/")));
    else if (parts[0] === "note") await note(decodeURIComponent(parts[1] ?? ""));
    else if (parts[0] === "journal") journal();
    else if (parts[0] === "isolation") await isolation();
    else notFound();
  } catch (e) {
    if (e instanceof Stale || g !== gen) return;
    main.innerHTML = `<p class="error">Could not load this page: ${esc(String(e))}. <button class="link retry" type="button">Retry</button></p>`;
  }
  if (turned && !h.includes("#sec-")) {
    const h1 = main.querySelector<HTMLElement>("h1");
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
  }
  if (!h.includes("#sec-")) main.scrollTo?.(0, 0);
  document.title = parts[0]
    ? `${main.querySelector("h1")?.textContent?.trim() ?? "rotli"} · rotli studio`
    : "rotli studio";
}
let routed = false; // the first render is not a page turn
// in-page section links (#sec-…) must not trigger the router
document.addEventListener("click", (e) => {
  const copy = (e.target as HTMLElement).closest<HTMLButtonElement>("button.copy");
  if (copy) {
    void navigator.clipboard.writeText(copy.dataset.copy ?? "").then(
      () => {
        copy.textContent = "Copied";
        setTimeout(() => (copy.textContent = copy.dataset.label ?? "Copy"), 1600);
      },
      () => (copy.textContent = "Copy failed"),
    );
    return;
  }
  if ((e.target as HTMLElement).closest("button.retry")) {
    location.reload();
    return;
  } // no inline handlers: the hosted CSP forbids them
  const skip = (e.target as HTMLElement).closest<HTMLAnchorElement>("a.skip");
  if (skip) {
    e.preventDefault();
    main.focus();
    return;
  }
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#sec-"]');
  if (!a) return;
  e.preventDefault();
  document.getElementById(a.getAttribute("href")!.slice(1))?.scrollIntoView({ behavior: smooth() });
});
window.addEventListener("hashchange", route);
try {
  M = await json<Manifest>(api("manifest"));
} catch (e) {
  main.innerHTML = `<p class="error">The studio could not load its catalogue (${esc(String(e))}). <button class="link retry" type="button">Retry</button></p>`;
  throw e;
}
mountSound(document.getElementById("sound-toggle") as HTMLButtonElement);
route();
