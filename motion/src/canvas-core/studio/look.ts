// A companion LOOK as an actor: the PNG the app's own <Character> rendered, anchored at its feet,
// with squash, lean, breath and a blink found in the pixels (dark round blobs in the head).
import type { Ctx, Env } from "../core";
import { blinkAt } from "../quokka/rig";
import { HAS_CHARACTER } from "../rotli/kit";

type Meta = { foot: { x: number; y: number }; eyes: { x: number; y: number; r: number; fur: string }[] };
const meta = (env: Env, id: string, img: CanvasImageSource & { width: number; height: number }): Meta => {
  const key = `look-meta:${id}`, hit = env.cache.get(key) as Meta | undefined; if (hit) return hit;
  const N = img.width, L = env.canvas(N, N); L.ctx.drawImage(img, 0, 0); const d = L.ctx.getImageData(0, 0, N, N).data;
  let y0 = N, y1 = 0; for (let i = 0; i < N * N; i++) if (d[i * 4 + 3] > 128) { const y = Math.floor(i / N); if (y < y0) y0 = y; if (y > y1) y1 = y; }
  let fx = 0, fn = 0; for (let y = Math.round(y1 - (y1 - y0) * 0.05); y <= y1; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 128) { fx += x; fn++; }
  // eyes: dark, solid, roundish blobs in the upper head band
  const dark = (i: number) => d[i * 4 + 3] > 200 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 150, seen = new Uint8Array(N * N), blobs: { x0: number; x1: number; y0: number; y1: number; n: number }[] = [];
  const top = y0 + (y1 - y0) * 0.1, bot = y0 + (y1 - y0) * 0.36;
  for (let y = Math.round(top); y < bot; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!dark(i) || seen[i]) continue; const b = { x0: x, x1: x, y0: y, y1: y, n: 0 }, st = [i]; seen[i] = 1; while (st.length) { const j = st.pop()!, jx = j % N, jy = (j - jx) / N; b.n++; b.x0 = Math.min(b.x0, jx); b.x1 = Math.max(b.x1, jx); b.y0 = Math.min(b.y0, jy); b.y1 = Math.max(b.y1, jy); for (const q of [j - 1, j + 1, j - N, j + N]) if (q >= 0 && q < N * N && !seen[q] && dark(q)) { seen[q] = 1; st.push(q); } } blobs.push(b); }
  const cand = blobs.filter((b) => { const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1; return b.n > N * N * 0.0002 && b.n < N * N * 0.003 && b.n / (w * h) > 0.5 && w / h > 0.6 && w / h < 1.7; }).sort((a, b) => a.y0 - b.y0);
  const eyes = cand.filter((b) => Math.abs(b.y0 - cand[0].y0) < N * 0.03).slice(0, 2).map((b) => {
    const x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2, r = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2, s = (Math.round(y - r * 2.4) * N + Math.round(x)) * 4;
    return { x: x / N, y: y / N, r: r / N, fur: `rgb(${d[s]},${d[s + 1]},${d[s + 2]})` };
  });
  const m = { foot: { x: fn ? fx / fn / N : 0.5, y: y1 / N }, eyes }; env.cache.set(key, m); return m;
};

export type LookActor = { id: string; x: number; y: number; h: number; squash?: number; lean?: number; flip?: boolean; alpha?: number; blink?: number | false; f?: number };
export const drawLook = (ctx: Ctx, env: Env, a: LookActor) => {
  if (!HAS_CHARACTER) return;
  const img = env.image?.(`look:${a.id}`) as (CanvasImageSource & { width: number; height: number }) | undefined; if (!img) throw new Error(`look ${a.id} not in the piece's assets`);
  const M = meta(env, a.id, img), sq = (a.squash ?? 1) * (1 + 0.014 * Math.sin(((a.f ?? 0) / 40) * Math.PI * 2)), s = a.h;
  ctx.save(); ctx.globalAlpha *= a.alpha ?? 1; ctx.translate(a.x, a.y); ctx.rotate(((a.lean ?? 0) * Math.PI) / 180); ctx.scale((a.flip ? -1 : 1) / Math.sqrt(sq), sq);
  ctx.translate(-M.foot.x * s, -M.foot.y * s); ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, 0, 0, s, s);
  const b = a.blink === false || /glasses/.test(a.id) ? 0 : (a.blink ?? blinkAt(a.f ?? 0, 84, 5));
  if (b > 0.05) for (const e of M.eyes) { const ex = e.x * s, ey = e.y * s, r = e.r * s; ctx.fillStyle = e.fur; ctx.beginPath(); ctx.ellipse(ex, ey, r * 1.3, r * 1.3 * Math.min(1, b * 1.4), 0, 0, Math.PI * 2); ctx.fill(); if (b > 0.5) { ctx.strokeStyle = "#111214"; ctx.lineWidth = r * 0.45; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(ex, ey - r * 0.6, r * 1.0, Math.PI * 0.22, Math.PI * 0.78); ctx.stroke(); } }
  ctx.restore();
};
