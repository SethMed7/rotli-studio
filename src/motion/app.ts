// The Motion room: every series, episode, cut and piece in motion/, broken down to its scenes, the
// brief and prompt that asked for it, the agent run that built it, its source and its golden. Plus the
// brand, workflows, skills, tools, docs and the isolation audit. Read-only; hash-routed.
import { esc, markdown } from "./md";

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
const text = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.text(); };
const json = async <T>(url: string, init?: RequestInit) => { const r = await fetch(url, init); if (!r.ok) throw new Error(`${r.status} ${url}`); return (await r.json()) as T; };
const secs = (frames: number, fps = 30) => `${(frames / fps).toFixed(frames % fps ? 1 : 0)} s`;
const tc = (f: number, fps = 30) => `${Math.floor(f / fps / 60)}:${String(Math.floor(f / fps) % 60).padStart(2, "0")}.${String(f % fps).padStart(2, "0")}`;
const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
const m = (path: string) => `/m/${path}`;
const s = (path: string) => `/s/${path.replace(/^\.\.\//, "")}`;
const fileUrl = (p: string) => (p.startsWith("../") ? s(p) : m(p));
// posters: a frame from the longest scene (the render's own .jpg is its last frame, the end card)
const poster = (p: Piece | undefined) => (!p ? "" : p.video && p.posterFrame !== undefined ? `/api/motion/thumb/${p.slug}/${p.posterFrame}.jpg` : p.video?.poster ? m(p.video.poster) : p.slides?.[0] ? s(p.slides[0]) : "");
const epNo = (code: string) => code.replace(/^s\d\de/, "E").replace(/^ep/, "Ep ");
const chip = (t: string, cls = "") => `<span class="chip ${cls}">${esc(t)}</span>`;
const seriesOf = (id: string | null) => M.series.find((x) => x.id === id);

// ---------------------------------------------------------------- nav
function renderNav(route: string) {
  const link = (href: string, label: string, count?: number | string) => `<a href="${href}" ${route === href || (href !== "#/" && route.startsWith(href + "/")) ? 'aria-current="page"' : ""}><span>${esc(label)}</span>${count !== undefined ? `<small>${count}</small>` : ""}</a>`;
  nav.innerHTML = `${link("#/", "Overview")}
    <h3>Series</h3>${M.series.map((x) => link(`#/series/${x.id}`, x.title.replace(/:.*/, ""), x.episodes ? `${x.episodes.length} ep` : x.pieces?.length)).join("")}
    <h3>How it's made</h3>${link("#/brand", "Brand & atmospheres")}${link("#/workflows", "Workflows & prompts")}${link("#/runs", "Requests & agent runs", M.pieces.filter((p) => p.run).length)}${link("#/skills", "Skills")}${link("#/tools", "Tools")}${link("#/docs", "Docs & evaluation")}
    <h3>Safety</h3>${link("#/isolation", "Isolation audit")}`;
}

// ---------------------------------------------------------------- overview
function overview() {
  const vids = M.pieces.filter((p) => p.kind === "video" && p.meta), minutes = vids.reduce((a, p) => a + p.meta!.durationFrames / 30, 0) / 60;
  const eps = M.series.reduce((a, x) => a + (x.episodes?.length ?? 0), 0);
  main.innerHTML = `<header class="page-head"><h1>Motion room</h1><p>Everything here is drawn by code in <code>motion/</code>: films, story episodes, vertical cuts, carousels and cards. Open a series to see its episodes; open any piece to break it down to scenes, the brief and prompt behind it, the agent run that built it, its source and its golden.</p></header>
  <div class="stats">${[["pieces", M.pieces.length], ["series", M.series.length], ["episodes", eps], ["minutes of video", minutes.toFixed(1)], ["goldens", M.pieces.filter((p) => p.golden).length], ["agent runs", M.pieces.filter((p) => p.run).length]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join("")}</div>
  <div class="series-grid">${M.series.map((x) => { const first = x.episodes ? byId(x.episodes[0]?.main ?? "") : byId(x.pieces?.[0] ?? "");
    return `<a class="series-card" href="#/series/${x.id}"><div class="frame" style="aspect-ratio:16/9"><img src="${poster(first)}" alt="" loading="lazy"></div><div class="series-card-body"><h2>${esc(x.title)}${x.sealed ? chip("sealed", "lock") : ""}</h2><p>${esc(x.logline)}</p><small>${esc(x.shape)}</small></div></a>`; }).join("")}</div>
  <p class="foot">Manifest built ${new Date(M.generated).toLocaleString()}${STATIC ? " · a read-only snapshot of the studio on the Mac." : ` · <button class="link" id="rebuild">Rebuild</button> after rendering or editing <code>pieces.json</code> / <code>series.json</code>.`}</p>`;
  if (!STATIC) $("#rebuild").onclick = async () => { M = await json<Manifest>("/api/motion/manifest", { method: "POST" }); route(); };
}

// ---------------------------------------------------------------- series
function series(id: string) {
  const x = seriesOf(id); if (!x) return notFound();
  const docs = [...x.docs, ...(x.schedule ? [x.schedule] : [])];
  const head = `<nav class="crumbs"><a href="#/">Motion</a> › ${esc(x.title)}</nav><header class="page-head"><h1>${esc(x.title)}${x.sealed ? chip("sealed", "lock") : ""}</h1><p>${esc(x.logline)}</p><p class="muted">${esc(x.shape)}</p>${docs.length ? `<p class="docs">${docs.map((d) => `<a href="#/doc/${encodeURIComponent(d)}">${esc(d.replace(/^\.\.\//, ""))}</a>`).join("")}</p>` : ""}</header>`;
  if (x.episodes) {
    const total = x.episodes.reduce((a, e) => a + (byId(e.main ?? "")?.run?.tokens ?? 0), 0);
    main.innerHTML = head + `<ol class="episodes">${x.episodes.map((e) => { const p = byId(e.main ?? ""); if (!p) return "";
      const cut = (k: "vertical" | "carousel" | "single", label: string) => { const c = byId(e.cuts[k] ?? ""); return c ? `<a class="cut" href="#/piece/${c.id}" title="${label}"><img src="${poster(c)}" alt="${label}" loading="lazy"><span>${label}</span></a>` : ""; };
      return `<li class="episode"><a class="ep-poster" href="#/piece/${p.id}"><img src="${poster(p)}" alt="" loading="lazy"><span>${epNo(e.code)}</span></a>
        <div class="ep-body"><h2><a href="#/piece/${p.id}">${esc(e.title)}</a></h2><p>${esc(p.logline ?? p.about ?? "")}</p>
        <div class="chips">${p.meta ? chip(secs(p.meta.durationFrames)) : ""}${p.atmosphere ? chip(p.atmosphere) : ""}${p.meta?.family ? chip(`family: ${p.meta.family}`) : ""}${p.style ? chip(`style: ${p.style}`) : ""}${p.shots.length ? chip(`${p.shots.length} scenes`) : ""}${p.run ? chip(`agent · ${(p.run.tokens / 1000).toFixed(0)}k tok · ${p.run.minutes} min`, "run") : p.id.startsWith("s01e01") || p.id.startsWith("ep01") ? chip("reference · hand-built", "run") : ""}${p.golden ? chip("golden", "ok") : chip("no golden", "warn")}</div></div>
        <div class="cuts">${cut("vertical", "9:16")}${cut("carousel", "carousel")}${cut("single", "card")}</div></li>`; }).join("")}</ol>
      ${total ? `<p class="foot">Agent cost for this series: ${(total / 1e6).toFixed(2)}M tokens across ${x.episodes.filter((e) => byId(e.main ?? "")?.run).length} runs (episode 1 is the hand-built reference).</p>` : ""}`;
  } else {
    main.innerHTML = head + `<div class="piece-grid">${(x.pieces ?? []).map((pid) => { const p = byId(pid)!; return `<a class="piece-card" href="#/piece/${p.id}"><div class="frame" style="aspect-ratio:${p.meta ? `${p.meta.W}/${p.meta.H}` : "1"}"><img src="${poster(p)}" alt="" loading="lazy"></div><b>${esc(p.id)}${p.sealed ? chip("sealed", "lock") : ""}</b><small>${esc(p.kind)} · ${esc(p.format)}${p.meta && p.kind === "video" ? ` · ${secs(p.meta.durationFrames)}` : ""}</small><p>${esc(p.about ?? "")}</p></a>`; }).join("")}</div>`;
  }
}

// ---------------------------------------------------------------- piece
async function piece(id: string) {
  const p = byId(id); if (!p) return notFound();
  const x = seriesOf(p.series), ep = x?.episodes?.find((e) => e.code === p.episode), main_ = ep ? byId(ep.main ?? "") : undefined;
  const cutTabs = ep ? `<div class="cut-tabs" role="tablist">${[["episode", ep.main], ["vertical", ep.cuts.vertical], ["carousel", ep.cuts.carousel], ["single", ep.cuts.single]].filter(([, v]) => v).map(([k, v]) => `<a role="tab" href="#/piece/${v}" aria-selected="${v === p.id}">${k === "episode" ? "Episode" : k === "single" ? "Card" : k![0]!.toUpperCase() + k!.slice(1)}</a>`).join("")}</div>` : "";
  const media = p.kind === "video" && p.video
    ? `<div class="player" style="--ar:${p.meta ? `${p.meta.W}/${p.meta.H}` : "16/9"}"><video id="video" controls preload="metadata" playsinline src="${m(p.video.file)}" poster="${poster(p)}"></video></div>`
    : p.slides?.length ? `<div class="slides">${p.slides.map((f, i) => `<a href="${s(f)}" target="_blank"><img src="${s(f)}" alt="slide ${i + 1}" loading="lazy"><span>${i + 1}</span></a>`).join("")}</div>`
    : `<p class="empty">Not rendered yet: <code>node tools/studio.mjs render ${esc(p.id)}</code></p>`;
  const facts: [string, string][] = [
    ["Kind", `${p.kind} · ${p.format}`], ...(p.meta ? [["Size", `${p.meta.W} × ${p.meta.H}`] as [string, string], ["Length", p.kind === "video" ? `${secs(p.meta.durationFrames)} · ${p.meta.durationFrames} frames @ ${p.meta.fps} fps` : `${p.shots.length} slide(s)`] as [string, string]] : []),
    ...(p.meta?.family ? [["Theme family", p.meta.family] as [string, string]] : []), ...(p.atmosphere ? [["Atmosphere", p.atmosphere] as [string, string]] : []), ...(p.style ? [["Style", p.style] as [string, string]] : []),
    ["Golden", p.golden ? `${p.golden.frames} frames${p.golden.audio ? " + audio" : ""} locked` : "none"], ...(p.video ? [["Render", `${mb(p.video.bytes)} · ${new Date(p.video.rendered).toLocaleString()}`] as [string, string]] : []),
    ...(p.run ? [["Built by", `agent · ${p.run.model ?? "inherited model"} · ${p.run.tokens.toLocaleString()} tokens · ${p.run.minutes} min`] as [string, string]] : []),
  ];
  const sections: [string, string][] = [["breakdown", p.kind === "video" ? "Breakdown" : "Slides"], ...(p.derive || (main_?.derive && p.role !== "episode") ? [["cuts", "Cuts"] as [string, string]] : []), ...(p.brief || main_?.brief ? [["brief", "Brief"] as [string, string]] : []), ...(p.prompt || main_?.prompt ? [["prompt", "Prompt"] as [string, string]] : []), ...((p.run ?? main_?.run) ? [["run", "Agent run"] as [string, string]] : []), ["source", "Source"], ["files", "Files & checks"]];
  main.innerHTML = `<nav class="crumbs"><a href="#/">Motion</a> › ${x ? `<a href="#/series/${x.id}">${esc(x.title.replace(/:.*/, ""))}</a> › ` : ""}${ep ? `${epNo(ep.code)} ${esc(ep.title)}` : esc(p.id)}</nav>
    <header class="page-head piece-head"><h1>${esc(p.title ?? (ep ? `${ep.title}` : p.id))}${p.sealed ? chip("sealed", "lock") : ""}</h1><p>${esc(p.logline ?? p.about ?? "")}</p>${p.error ? `<p class="error">Import error: ${esc(p.error)}</p>` : ""}</header>
    ${cutTabs}<div class="piece-top">${media}<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
    <nav class="section-tabs">${sections.map(([k, v]) => `<a href="#sec-${k}">${v}</a>`).join("")}</nav>
    ${sections.map(([k, v]) => `<section id="sec-${k}" class="sec"><h2>${v}</h2><div class="sec-body" data-sec="${k}"><p class="muted">Loading…</p></div></section>`).join("")}`;
  const body = (k: string) => main.querySelector<HTMLElement>(`[data-sec="${k}"]`);
  // breakdown: a timeline the width of the piece, then one card per scene
  const video = main.querySelector<HTMLVideoElement>("#video");
  if (p.kind === "video" && p.meta) {
    const D = p.meta.durationFrames;
    body("breakdown")!.innerHTML = `<div class="timeline">${p.shots.map((sh) => `<button style="flex:${sh.end - sh.start}" data-seek="${sh.start}" title="${esc(sh.id)} · ${tc(sh.start)}–${tc(sh.end)}"><span>${esc(sh.id)}</span></button>`).join("")}<i class="playhead" id="playhead"></i></div>
      <div class="scenes">${p.shots.map((sh, i) => { const mid = Math.floor((sh.start + sh.end) / 2);
        return `<article class="scene"><button class="frame" style="aspect-ratio:${p.meta!.W}/${p.meta!.H}" data-seek="${sh.start}"><img src="/api/motion/thumb/${p.slug}/${mid}.jpg" alt="" loading="lazy"></button>
        <div><b>${i + 1}. ${esc(sh.id)}</b><small>${tc(sh.start)} – ${tc(sh.end)} · ${secs(sh.end - sh.start)} · frames ${sh.start}–${sh.end - 1}</small>${sh.template ? `<p>${esc(sh.template)}</p>` : ""}${STATIC ? "" : `<a class="link" href="/api/motion/frame/${p.id}/${mid}.png" target="_blank">Exact frame ${mid} (full size render)</a>`}</div></article>`; }).join("")}</div>`;
    main.querySelectorAll<HTMLElement>("[data-seek]").forEach((b) => (b.onclick = () => { if (video) { video.currentTime = Number(b.dataset.seek) / 30 + 0.001; video.scrollIntoView({ block: "nearest", behavior: "smooth" }); } }));
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
      <p><a class="link" href="${m(briefFile)}" target="_blank">${esc(briefFile)}</a></p>`; }).catch((e) => (body("brief")!.textContent = String(e)));
  const promptFile = p.prompt ?? main_?.prompt;
  if (promptFile) text(m(promptFile)).then((t) => (body("prompt")!.innerHTML = `<p class="muted">Generated by <code>tools/brief-to-prompt.mjs</code> from the brief: the preamble that worked, plus this episode. <a class="link" href="${m(promptFile)}" target="_blank">${esc(promptFile)}</a></p><div class="doc">${markdown(t)}</div>`));
  const run = p.run ?? main_?.run;
  if (run) text(m(run.file)).then((t) => (body("run")!.innerHTML = `<div class="doc">${markdown(t)}</div>`));
  body("source")!.innerHTML = p.module ? `<p class="muted"><a class="link" href="${m(p.module)}" target="_blank">${esc(p.module)}</a> · host <a class="link" href="${m(p.host)}" target="_blank">${esc(p.host)}</a></p><pre class="code" id="code">Loading…</pre>` : `<p class="muted">No module.</p>`;
  if (p.module) text(m(p.module)).then((t) => ($("#code").innerHTML = t.split("\n").map((l, i) => `<span class="ln">${i + 1}</span>${esc(l)}`).join("\n")));
  const files = [["Module", p.module], ["Host page", p.host], ["Brief", briefFile], ["Prompt", promptFile], ["Agent run", run?.file], ["Golden", p.golden?.file], ["Render", p.video?.file], ["Poster", p.video?.poster ?? undefined]].filter(([, v]) => v) as [string, string][];
  body("files")!.innerHTML = `<dl class="facts wide">${files.map(([k, v]) => `<dt>${k}</dt><dd><a class="link" href="${fileUrl(v)}" target="_blank">${esc(v)}</a></dd>`).join("")}${p.slides?.length ? `<dt>Exports</dt><dd><code>${esc(p.slides[0]!.replace(/\/[^/]+$/, "/"))}</code></dd>` : ""}${p.video ? `<dt>Render sha256</dt><dd><code>${p.video.sha}…</code></dd>` : ""}</dl>
    <p class="actions">${p.golden && !STATIC ? `<button class="ghost" id="verify">Verify golden now</button>` : ""}<span id="verify-out" class="muted"></span></p>
    <p class="muted">Re-make it: <code>node tools/studio.mjs render ${esc(p.id)} &amp;&amp; node tools/studio.mjs check ${esc(p.id)} &amp;&amp; node tools/golden.mjs ${esc(p.id)}</code> (from <code>motion/</code>).</p>`;
  const vb = main.querySelector<HTMLButtonElement>("#verify");
  if (vb) vb.onclick = async () => { vb.disabled = true; $("#verify-out").textContent = "Rendering the golden frames… (up to a minute)"; const r = await json<{ ok: boolean; output: string }>(`/api/motion/verify/${p.id}`, { method: "POST" }); $("#verify-out").innerHTML = `${r.ok ? chip("SAME", "ok") : chip("DIFFERS", "bad")} <code>${esc(r.output)}</code>`; vb.disabled = false; };
}

// ---------------------------------------------------------------- brand
async function brand() {
  const [b, t, c, atm] = await Promise.all([json<Record<string, any>>(m("brand/brand.json")), json<{ themes: { id: string; family: string; mode: string; label: string; roles: Record<string, string> }[] }>(m("brand/themes.json")), json<{ looks: { id: string; pose: string; style: string; accessory: string }[] }>(m("brand/companions.json")), json<{ id: string; label: string; family: string; dark: boolean; drift: number; why: string; key: number; melody: number }[]>(api("atmospheres"))]);
  const looks = await json<string[]>(api("looks"));
  const fams = [...new Set(t.themes.map((x) => x.family))];
  const reel = byId("atmosphereReel");
  main.innerHTML = `<nav class="crumbs"><a href="#/">Motion</a> › Brand</nav><header class="page-head"><h1>Brand &amp; atmospheres</h1><p>The one seam a piece reads its look from: <a class="link" href="${m("brand/brand.json")}" target="_blank">brand/brand.json</a> (copy, palette, fonts with sha256 locks, character), <a class="link" href="${m("brand/themes.json")}" target="_blank">themes.json</a> (the app's twelve environments) and <a class="link" href="${m("brand/companions.json")}" target="_blank">companions.json</a>.</p></header>
  <section class="sec"><h2>Copy</h2><dl class="facts wide">${["product", "wordmark", "tagline", "url", "platform", "cta", "promise", "voice"].filter((k) => b[k] !== undefined).map((k) => `<dt>${k}</dt><dd>${esc(String(b[k]))}</dd>`).join("")}</dl></section>
  <section class="sec"><h2>Palette <small>(the kit's <code>C</code>)</small></h2><div class="swatches">${Object.entries(b.palette as Record<string, string>).map(([k, v]) => `<div class="swatch"><i style="background:${esc(v)}"></i><b>${esc(k)}</b><code>${esc(v)}</code></div>`).join("")}</div></section>
  <section class="sec"><h2>Type</h2><div class="type-specimens"><p style="font-family:'General Sans';font-weight:600;letter-spacing:${b.fonts.tracking ?? -0.045}em;font-size:44px">Room to think. Files you keep.</p><p style="font-family:'Baloo 2';font-weight:600;font-size:44px">rotli</p></div>
    <div class="table"><table><thead><tr><th>Font</th><th>File</th><th>sha256 lock</th></tr></thead><tbody>${(b.fonts.files as { spec: string; file: string; sha256: string }[]).map((f) => `<tr><td>${esc(f.spec)}</td><td><code>${esc(f.file)}</code></td><td><code>${f.sha256.slice(0, 16)}…</code></td></tr>`).join("")}</tbody></table></div><p class="muted">Headline tracking ${b.fonts.tracking ?? -0.045}em (rotli.co). A render whose font file doesn't match its lock refuses to build.</p></section>
  <section class="sec"><h2>Theme families <small>(${t.themes.length} environments)</small></h2><div class="families">${fams.map((f) => `<div class="family"><h3>${esc(f)}</h3>${t.themes.filter((x) => x.family === f).map((x) => `<div class="env" style="background:${x.roles.ground};color:${x.roles.text};border-color:${x.roles.border}"><b>${esc(x.label)}</b><span class="dots">${["surface", "surface-2", "tint", "accent", "accent-text", "success", "text-muted"].map((r) => `<i title="${r} ${x.roles[r]}" style="background:${x.roles[r]}"></i>`).join("")}</span></div>`).join("")}</div>`).join("")}</div></section>
  <section class="sec"><h2>Atmospheres <small>(<code>studio/atmospheres.ts</code>)</small></h2>${reel?.video ? `<p><a class="link" href="#/piece/atmosphereReel">Watch the atmosphere reel</a> · <a class="link" href="${m("out/atmosphere-board.png")}" target="_blank">board</a></p>` : ""}
    <div class="table"><table><thead><tr><th>Id</th><th>Mood</th><th>Family</th><th>Ground</th><th>Music</th><th>Used for</th></tr></thead><tbody>${atm.map((a) => `<tr><td><code>${esc(a.id)}</code></td><td>${esc(a.label)}</td><td>${esc(a.family)}</td><td>${a.dark ? "deep" : "light"} · drift ${a.drift}</td><td>key +${a.key} · melody ${["tune", "walking", "lilting"][a.melody] ?? a.melody}</td><td>${esc(a.why)}</td></tr>`).join("")}</tbody></table></div></section>
  <section class="sec"><h2>Companion looks <small>(rendered from the app's real &lt;Character&gt;)</small></h2><div class="looks">${c.looks.filter((l) => looks.includes(`${l.id}.png`)).map((l) => `<figure><img src="${s(`library/companion-looks/${l.id}.png`)}" alt="" loading="lazy"><figcaption>${esc(l.id)}</figcaption></figure>`).join("")}</div><p class="muted">${c.looks.length - c.looks.filter((l) => looks.includes(`${l.id}.png`)).length} listed look(s) not rendered yet: <code>bun run sync:companions</code>.</p></section>`;
}

// ---------------------------------------------------------------- docs-style pages
type Doc = { label: string; path: string; group?: string };
async function docPage(title: string, intro: string, docs: Doc[], active?: string) {
  const current = docs.find((d) => d.path === active) ?? docs[0]!;
  const groups = [...new Set(docs.map((d) => d.group ?? ""))];
  main.innerHTML = `<nav class="crumbs"><a href="#/">Motion</a> › ${esc(title)}</nav><header class="page-head"><h1>${esc(title)}</h1><p>${intro}</p></header>
    <div class="doc-layout"><aside class="doc-list">${groups.map((g) => `${g ? `<h3>${esc(g)}</h3>` : ""}${docs.filter((d) => (d.group ?? "") === g).map((d) => `<a href="${location.hash.split("?")[0]}?doc=${encodeURIComponent(d.path)}" ${d === current ? 'aria-current="page"' : ""}>${esc(d.label)}</a>`).join("")}`).join("")}</aside>
    <article class="doc" id="doc"><p class="muted">Loading…</p></article></div>`;
  const url = current.path.startsWith("skill:") ? "" : fileUrl(current.path);
  const body = current.path.startsWith("skill:") ? (await json<{ name: string; where: string; path: string; text: string }[]>(api("skills"))).find((k) => `skill:${k.where}:${k.name}` === current.path)?.text ?? "" : await text(url).catch((e) => `**Could not load:** ${e}`);
  $("#doc").innerHTML = `<p class="doc-path"><code>${esc(current.path.replace(/^skill:(\w+):/, "$1 skill: "))}</code>${url ? ` · <a class="link" href="${url}" target="_blank">raw</a>` : ""}</p>${/(\.(json|ts|mjs|py)|LICENSE|NOTICE)$/.test(current.path) ? `<pre class="code">${esc(body)}</pre>` : markdown(body)}`;
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
  await docPage("Skills", "The instructions agents follow here. Studio skills live in <code>.claude/skills/</code>; the two global ones are listed read-only (<code>brand-motion-studio</code> is a pointer back into the studio; <code>anidoodle</code> is the third-party skill whose engine the room vendored).", [
    { label: "AGENTS.md (studio guide)", path: "../AGENTS.md", group: "Studio" }, ...all.map((k) => ({ label: k.name, path: `skill:${k.where}:${k.name}`, group: k.where === "studio" ? "Studio" : "Global (read-only)" })),
  ], param("doc"));
}
async function tools() {
  const list = await json<{ file: string; about: string }[]>(api("tools"));
  main.innerHTML = `<nav class="crumbs"><a href="#/">Motion</a> › Tools</nav><header class="page-head"><h1>Tools</h1><p>Every command in the room, with the usage notes from its own header. Motion tools run with Node from <code>motion/</code>; studio scripts run with Bun from the studio root.</p></header>
    <div class="tools">${list.map((t) => `<article class="tool"><h3><a class="link" href="${t.file.startsWith("motion/") ? m(t.file.slice(7)) : s(t.file)}" target="_blank">${esc(t.file)}</a></h3><pre>${esc(t.about || "(no header)")}</pre></article>`).join("")}</div>`;
}
async function docs() {
  await docPage("Docs & evaluation", "What the room is, what it proved, and what's still Rotli-shaped.", [
    { label: "Evaluation (other products)", path: "EVALUATION.md", group: "Motion room" }, { label: "Motion room README", path: "README.md", group: "Motion room" }, { label: "Launch month plan", path: "../launch/rotli-launch-month.md", group: "Motion room" },
    { label: "Studio README", path: "../README.md", group: "Studio" }, { label: "Films", path: "../films/README.md", group: "Studio" },
    { label: "Licence (MIT)", path: "../LICENSE", group: "Licences" }, { label: "NOTICE", path: "../NOTICE", group: "Licences" }, { label: "anidoodle (Apache-2.0): attribution", path: "third_party/anidoodle/README.md", group: "Licences" }, { label: "anidoodle LICENSE", path: "third_party/anidoodle/LICENSE", group: "Licences" },
  ], param("doc"));
}
async function doc(path: string) { await docPage(path.replace(/^\.\.\//, ""), "", [{ label: path, path }], path); }

// ---------------------------------------------------------------- isolation
async function isolation(fresh = false) {
  if (STATIC) { main.innerHTML = `<nav class="crumbs"><a href="#/">Motion</a> › Isolation</nav><header class="page-head"><h1>Isolation audit</h1><p>The audit reads the product repos, worktrees and branches on the Mac, so it only runs there: <code>bun scripts/check-isolation.ts</code>, or the Isolation page of the local studio (<code>bun start</code> → 127.0.0.1:4500/motion). This hosted copy is a static, read-only snapshot served by its own Railway project; it shares nothing with rotli.co.</p></header>`; return; }
  main.innerHTML = `<nav class="crumbs"><a href="#/">Motion</a> › Isolation</nav><header class="page-head"><h1>Isolation audit</h1><p>Proof that the studio's work stays in <code>~/rotli-studio</code>: its code only reads declared sources; no render sits in a product repo, worktree or branch; the live sites reference none; and what lives outside the studio does so on purpose. Read-only: <code>bun scripts/check-isolation.ts</code>.</p><p><button class="ghost" id="again">Run again</button> <span class="muted" id="when">${fresh ? "" : "Running (walks the product repos, ~10 s)…"}</span></p></header><div id="iso"></div>`;
  $("#again").onclick = () => isolation(true);
  if (fresh) $("#when").textContent = "Running…";
  type Rep = { when: string; status: string; products: string[]; worktrees: string[]; checks: { title: string; status: string; findings: { level: string; text: string; evidence?: string[] }[] }[] };
  const r = await json<Rep>(`/api/motion/isolation${fresh ? "?fresh=1" : ""}`).catch((e) => ({ error: String(e) }) as unknown as Rep);
  if (!r.checks) { $("#iso").innerHTML = `<p class="error">${esc(JSON.stringify(r))}</p>`; return; }
  $("#when").textContent = `Last run ${new Date(r.when).toLocaleString()} · products ${r.products.join(", ")} · ${r.worktrees.length} worktrees`;
  $("#iso").innerHTML = `<p class="banner ${r.status.toLowerCase()}">Overall: <b>${r.status}</b>${r.status === "PASS" ? " — nothing leaked." : " — read the findings below; each says where, and whether it predates the studio."}</p>` + r.checks.map((c) => `<section class="sec iso-check"><h2>${chip(c.status, c.status.toLowerCase())} ${esc(c.title)}</h2><ul class="findings">${c.findings.map((f) => `<li>${chip(f.level, f.level.toLowerCase())} ${esc(f.text)}${f.evidence?.length ? `<details><summary>${f.evidence.length} item(s)</summary><pre>${esc(f.evidence.join("\n"))}</pre></details>` : ""}</li>`).join("")}</ul></section>`).join("");
}

// ---------------------------------------------------------------- router
function notFound() { main.innerHTML = `<p class="empty">Nothing here. <a href="#/">Back to the overview</a>.</p>`; }
async function route() {
  const h = location.hash || "#/", [path] = h.split("?"), parts = path!.replace(/^#\/?/, "").split("/");
  renderNav(path!.startsWith("#/piece/") ? `#/series/${byId(parts[1] ?? "")?.series ?? ""}` : path!);
  try {
    if (!parts[0]) overview();
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
  } catch (e) { main.innerHTML = `<p class="error">${esc(String(e))}</p>`; }
  if (!h.includes("#sec-")) main.scrollTo?.(0, 0);
}
// in-page section links (#sec-…) must not trigger the router
document.addEventListener("click", (e) => { const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#sec-"]'); if (!a) return; e.preventDefault(); document.getElementById(a.getAttribute("href")!.slice(1))?.scrollIntoView({ behavior: "smooth" }); });
window.addEventListener("hashchange", route);
M = await json<Manifest>(api("manifest"));
if (STATIC) { document.querySelector('.rooms a[href="/"]')?.remove(); $(".bar-note").textContent = `Read-only snapshot · ${new Date(M.generated).toLocaleDateString()} · not linked from rotli.co`; }
route();
