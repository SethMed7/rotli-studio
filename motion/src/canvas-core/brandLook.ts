// BRAND LOOK: the one still that proves a brand pack before anything is animated (anidoodle's "one look
// still"). Product-agnostic: it only reads brand/brand.json + brand/themes.json through the kit, so a second
// product's studio renders its own look with no code change. Left: the hero (base ground, the pattern if the
// brand has one, the display headline at the brand's tracking, a claim, a lower third). Right: the band with a
// surface card in the theme's roles, the palette, and the deep band with the lockup.
import type { Film } from "./film";
import { C, FONT, TRACK, fillRR, ink, measure, text } from "./rotli/kit";
import { lockup } from "./studio/brandmarks";
import { envGround } from "./studio/grounds";
import { lowerThird } from "./studio/series";
import { BRAND, FONTS, THEME_LIST, firstFamily, useFamily } from "./studio/stage";

useFamily(firstFamily());
export const brandLook: Film = { meta: { title: "brandLook", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: 15, raster: "cpu" }, assets: { images: {}, fonts: FONTS }, shots: [{ id: "look", start: 0, end: 15, draw: (ctx, l, env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  envGround(ctx, l, "base");
  // the tagline, wrapped to the hero column at the brand's tracking (at most three lines)
  const size = 96, maxW = 980, words: string[] = [];
  for (const w of (BRAND.tagline || BRAND.product).split(/\s+/)) { const cur = words[words.length - 1]; if (cur && measure(ctx, `${cur} ${w}`, size, 600, FONT.display, size * TRACK) <= maxW && !/\.$/.test(cur)) words[words.length - 1] = `${cur} ${w}`; else words.push(w); }
  words.splice(3);
  words.forEach((w, i) => text(ctx, w, 110, 330 + i * 108, { size, weight: 600, font: FONT.display, color: C.cocoa, spacing: size * TRACK }));
  const last = words[words.length - 1]; ink(ctx, [[110, 330 + (words.length - 1) * 108 + 24], [110 + Math.min(900, measure(ctx, last, size, 600, FONT.display, size * TRACK)), 330 + (words.length - 1) * 108 + 20]], { w: 9, color: C.clay, seed: 3, frame: l });
  text(ctx, `${BRAND.product} · ${BRAND.url}`, 112, 330 + words.length * 108 + 30, { size: 34, color: C.muted });
  lowerThird(ctx, 60, 0, 999, "A lower third, in the brand's words.", "Every caption is a claim from the site.");
  // right: the band, a surface card in the theme's roles, the palette, the deep band + lockup
  ctx.fillStyle = C.surface2; ctx.fillRect(1180, 0, 740, 620);
  const t = THEME_LIST[0].roles; fillRR(ctx, 1240, 70, 620, 330, 22, t.surface, t.border, 3); text(ctx, "A note, in this brand", 1280, 140, { size: 38, weight: 600, font: FONT.display, color: t.text, spacing: 38 * TRACK });
  ["Plain text underneath", "The accent marks what matters", "Muted for the quiet parts"].forEach((s, i) => { fillRR(ctx, 1280, 180 + i * 62, 30, 30, 8, i === 0 ? t.success : t.surface, i === 0 ? t.success : t["text-muted"], 3); text(ctx, s, 1328, 205 + i * 62, { size: 28, color: i === 2 ? t["text-muted"] : t.text }); });
  ctx.fillStyle = t.accent; ctx.fillRect(1280, 372, 190, 4);
  [C.linen, C.surface2, C.peach, C.clay, C.cocoa, C.night].forEach((c, i) => { fillRR(ctx, 1240 + i * 104, 450, 88, 88, 44, c, C.cocoa, 3); });
  text(ctx, "ground · band · tint · accent · text · deep", 1240, 580, { size: 22, color: C.muted });
  ctx.fillStyle = C.night; ctx.fillRect(1180, 620, 740, 460);
  lockup(ctx, 1550, 800, 1, l, { s: 0.55, ink: C.nightText, url: true });
} }] };
