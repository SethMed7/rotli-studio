// DERIVATIVES: one landscape episode becomes a 9:16 vertical cut, a 4:5 carousel and a 4:5 single,
// all by re-rendering the episode's own frames (studio/reframe) under the series captions. The
// aesthetic cannot drift between formats because it is literally the same drawing.
import type { Ctx, Env } from "../core";
import type { Film } from "../film";
import { BRAND, C, HAS_CHARACTER, fillRR, measure, seg, text } from "../rotli/kit";
import { POSES } from "../quokka/poses";
import { envGround } from "./grounds";
import { caption, lockup } from "./brandmarks";
import { reframe } from "./reframe";
import { makeScore } from "./score2";
import { CAPTIONS, drift, host } from "./series";
import { FONTS, FORMATS } from "./stage";
import { useFamilyUI } from "./ui";
/** a derivative dresses in its episode's home family (story episodes carry it in meta; series episodes set it at load) */
const home = (ep: Film) => { if (ep.meta.family) useFamilyUI(ep.meta.family); };

type Box = { x: number; y: number; w: number; h: number };
export type Beat = { frame: number; crop: Box; title: string; sub?: string; hi?: string };
export type DeriveSpec = { no: number; series: string; label?: string; line?: boolean /* line-style episode: the vertical end uses the line-art mark */; vertical: (Beat & { len: number })[]; slides: Beat[]; single: Beat };

const tag = (ctx: Ctx, no: number | string, x: number, y: number) => { const s = typeof no === "string" ? no.replace(/ · /g, "  ·  ") : `Rotli in 30 seconds  ·  ${String(no).padStart(2, "0")}`, w = measure(ctx, s, 26, 600) + 44; fillRR(ctx, x - w / 2, y, w, 52, 26, C.surface, C.ink, 3); text(ctx, s, x, y + 35, { size: 26, weight: 600, align: "center" }); };
/** the episode frame, re-rendered into a rounded frame; a tall crop is narrowed (and centred) to fit `maxH` */
const framed = (ctx: Ctx, env: Env, ep: Film, b: Beat, x0: number, y: number, w0: number, k = 0, maxH = 900) => {
  const w = Math.min(w0, (maxH * b.crop.w) / b.crop.h), x = x0 + (w0 - w) / 2;
  const z = 1 - 0.1 * k, cw = b.crop.w * z, ch = b.crop.h * z, h = (w * b.crop.h) / b.crop.w;
  fillRR(ctx, x - 3, y - 3, w + 6, h + 6, 27, C.ink); CAPTIONS.on = false; reframe(ctx, env, ep, b.frame, { x: b.crop.x + (b.crop.w - cw) / 2, y: b.crop.y + (b.crop.h - ch) / 2, w: cw, h: ch }, { x, y, w, h, r: 24 }); CAPTIONS.on = true; return y + h;
};

/** 9:16: each beat plays `len` frames of the episode from `frame`, under a big caption */
export const verticalCut = (id: string, ep: Film, d: DeriveSpec): Film => {
  const [W, H] = FORMATS.story, starts: number[] = []; let t = 0; for (const b of d.vertical) { starts.push(t); t += b.len; }
  const endLen = 90, total = t + endLen;
  const draw = (ctx: Ctx, l: number, env: Env) => {
    home(ep);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); envGround(ctx, l, "base", { w: W, h: H });
    if (l >= t) { const e = l - t; drift(ctx, env, l, 0.6); lockup(ctx, W / 2, 760, seg(e, 0, 40), l, { s: 0.9 }); text(ctx, (BRAND as { promise?: string }).promise ?? BRAND.tagline, W / 2, 1120, { size: 38, weight: 600, align: "center", color: C.cocoa, alpha: seg(e, 20, 40) }); if (d.line) lineQuokka(ctx, W / 2, 1640 + Math.sin(l / 16) * 6, 420, C.cocoa); else host(ctx, env, l, { x: W / 2, y: 1640, h: 420, pose: "waving" }); return; }
    let i = 0; for (let j = 0; j < starts.length; j++) if (l >= starts[j]) i = j; const b = d.vertical[i], k = l - starts[i];
    tag(ctx, d.label ?? d.no, W / 2, 110); caption(ctx, [b.title], W / 2, 300, seg(k, 0, 16), l, { size: measure(ctx, b.title, 82, 600) > 980 ? 64 : 82, hi: b.hi });
    if (b.sub) text(ctx, b.sub, W / 2, 380, { size: 38, weight: 500, align: "center", color: C.muted, alpha: seg(k, 8, 20) });
    const cw = W - 80, ch = (cw * b.crop.h) / b.crop.w; // the footage floats a little on two periods, so a held frame still moves
    framed(ctx, env, ep, { ...b, frame: b.frame + k }, 40 + Math.sin(l / 23) * 8, Math.max(470, 1080 - Math.min(ch, 1200) / 2) + Math.cos(l / 29) * 6, cw, k / b.len, 1200);
    fillRR(ctx, W / 2 - 150, 1770, 300, 76, 38, C.surface, C.ink, 3); text(ctx, BRAND.url, W / 2, 1820, { size: 34, weight: 600, align: "center" });
  };
  const shots = d.vertical.map((b, i) => ({ id: `beat${i + 1}`, start: starts[i], end: starts[i] + b.len, draw: (c: Ctx, lo: number, e: Env) => draw(c, lo + starts[i], e) }));
  shots.push({ id: "end", start: t, end: total, draw: (c, lo, e) => draw(c, lo + t, e) });
  return { meta: { title: id, W, H, fps: 30, bpm: 120, durationFrames: total, raster: "cpu" }, assets: { images: ep.assets.images, fonts: FONTS }, shots, audio: makeScore({ frames: total, energeticFrom: 60, endAt: Math.floor(total / 60) * 60 - 60, bellAt: [t], pops: starts.map((s, i) => [s, [79, 81, 84, 86, 88][i % 5]] as [number, number]) }) };
};

/** 4:5 carousel: a cover, one slide per beat, and the closing card */
export const carousel = (id: string, ep: Film, d: DeriveSpec, cover: { title: string[]; hi?: string }): Film => {
  const [W, H] = FORMATS["ig-portrait"], n = d.slides.length + 2;
  const draw = (ctx: Ctx, i: number, l: number, env: Env) => {
    home(ep);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    // the site's section rhythm: the cover is the hero (base + file field), beats alternate band and base, the close is the deep band
    envGround(ctx, l, i === n - 1 ? "deep" : i === 0 ? "base" : i % 2 ? "band" : "base", { w: W, h: H, field: i === 0 || i === n - 1 });
    for (let k = 0; k < n; k++) { ctx.fillStyle = k === i ? C.clay : i === n - 1 ? C.nightBorder : C.border; ctx.beginPath(); ctx.arc(W / 2 + (k - (n - 1) / 2) * 30, H - 56, k === i ? 9 : 7, 0, 6.29); ctx.fill(); }
    if (i === 0) { const size = Math.min(96, Math.floor(96 * 960 / Math.max(...cover.title.map((t) => measure(ctx, t, 96, 600))))), lead = size * 1.14; tag(ctx, d.label ?? d.no, W / 2, 150); caption(ctx, cover.title, W / 2, 330 + size * 0.7, 1, l, { size, hi: cover.hi }); const top = 330 + size * 0.7 + cover.title.length * lead - lead * 0.5; framed(ctx, env, ep, d.single, 90, top, 900, 0, 1130 - top); fillRR(ctx, W - 250, H - 150, 190, 64, 32, C.surface, C.ink, 3); text(ctx, "swipe →", W - 155, H - 106, { size: 28, weight: 600, align: "center" }); return; }
    if (i === n - 1) { lockup(ctx, W / 2, 470, 1, l, { s: 0.85, ink: C.nightText }); text(ctx, (BRAND as { promise?: string }).promise ?? BRAND.tagline, W / 2, 760, { size: 36, weight: 600, align: "center", color: C.nightText });
      lineQuokka(ctx, W / 2, 1210, 330, C.nightText); return; }
    const b = d.slides[i - 1]; caption(ctx, [b.title], W / 2, 190, 1, l, { size: measure(ctx, b.title, 72, 600) > 960 ? 58 : 72, hi: b.hi });
    if (b.sub) text(ctx, b.sub, W / 2, 270, { size: 34, weight: 500, align: "center", color: C.muted });
    framed(ctx, env, ep, b, 60, 340, 960, 0, 880);
  };
  return { meta: { title: id, W, H, fps: 30, bpm: 120, durationFrames: n * 15, raster: "cpu" }, assets: { images: ep.assets.images, fonts: FONTS }, shots: Array.from({ length: n }, (_, i) => ({ id: `slide${i + 1}`, start: i * 15, end: i * 15 + 15, draw: (c: Ctx, l: number, e: Env) => draw(c, i, i * 15 + l, e) })) };
};

/** 4:5 single: the one frame that says the episode, under its line */
export const single = (id: string, ep: Film, d: DeriveSpec): Film => {
  const [W, H] = FORMATS["ig-portrait"], b = d.single;
  return { meta: { title: id, W, H, fps: 30, bpm: 120, durationFrames: 15, raster: "cpu" }, assets: { images: ep.assets.images, fonts: FONTS }, shots: [{ id: "single", start: 0, end: 15, draw: (ctx, l, env) => { home(ep);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); envGround(ctx, l, "base", { w: W, h: H }); caption(ctx, [b.title], W / 2, 200, 1, l, { size: measure(ctx, b.title, 76, 600) > 960 ? 60 : 76, hi: b.hi });
    if (b.sub) text(ctx, b.sub, W / 2, 282, { size: 36, weight: 500, align: "center", color: C.muted }); const y = framed(ctx, env, ep, b, 60, 360, 960, 0, 840);
    text(ctx, [BRAND.url, (BRAND as { cta?: string }).cta].filter(Boolean).join("  ·  "), W / 2, Math.min(H - 60, y + 90), { size: 32, weight: 600, align: "center", color: C.clayText }); } }] };
};

/** the site's line-art quokka (the stays_local drawing), stroked in one colour, standing at (x, feet y) */
const lineQuokka = (ctx: Ctx, x: number, y: number, h: number, col: string) => {
  if (!HAS_CHARACTER) return;
  const p = POSES.stays_local, k = h / p.vb; ctx.save(); ctx.translate(x - h / 2, y - h * 0.93); ctx.scale(k, k); ctx.fillStyle = col; for (const d of p.d) ctx.fill(new Path2D(d), p.rule); ctx.restore();
};
