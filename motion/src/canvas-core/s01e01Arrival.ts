// SEASON ONE · 01 — ARRIVAL (60 s). Brief: season/episodes/s01e01.json
// Setup: at dawn the quokka steps off the ferry; thoughts drift past on the sea wind like loose pages.
// Turn (frame 555): it presses ⌥C and the first thought (Trip ideas, the season's token) lands in its
// satchel, Captures. Payoff: at the hut, ⌥Space opens a calm window where every caught thought waits.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { rng } from "./core";
import { hopAlong } from "./rotli/actor";
import { bike, ferry, jetty, sign } from "./rotli/island";
import { card } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { lowerThird } from "./studio/series";
import { C, LIGHT, actor, chapterCard, easeInOut, easeOut, fillRR, intertitle, pop, seg, sceneStart, story, storyEnd, text, thought, type Scene, type S } from "./studio/story";
import { keys, pointer } from "./studio/ui";

const T = LIGHT;
// ---------------------------------------------------------------- scenes
const PAGES = [{ t: "Trip ideas", token: true }, { t: "Ferry times" }, { t: "Call Sam" }, { t: "Salt lakes" }];
const CATCH = [95, 185, 265, 345]; // local frames in the catch scene where ⌥C lands
const cold: Scene = { id: "cold", len: 270, draw: (ctx, env, s) => {
  // the ferry glides in; the quokka rides the deck, then hops to the jetty; pages blow past
  jetty(ctx, s.f, 380, 930, 822); sign(ctx, s.f, 860, 822, "THOMSON BAY"); bike(ctx, s.f, 1500, 1000, 1.1);
  const fx = 250 - 700 * (1 - easeOut(s.t(0, 90))); ferry(ctx, s.f, fx, 812, 1);
  const h = hopAlong(s.l, [[150, fx + 60, 772], [172, 600, 822], [194, 880, 822], [218, 1120, 930]], 110);
  const onDeck = s.l < 150, x = onDeck ? fx + 60 : h.x, y = onDeck ? 772 : h.y;
  actor(ctx, env, s.f, { pose: s.l < 150 ? "base" : s.l < 220 ? "walking" : "attention", x, y, h: 320, lift: h.lift, squash: h.squash });
  const r = rng(5); PAGES.concat(PAGES).forEach((p, i) => { const t0 = 20 + i * 28, k = (s.l - t0) / 110; if (k < 0 || k > 1) return;
    card(ctx, { x: -150 + k * 2200, y: 250 + r() * 380 + Math.sin(k * 8 + i) * 50, rot: Math.sin(k * 9 + i) * 0.6, scale: p.token ? 0.8 : 0.55, title: p.token ? p.t : "", token: p.token, lines: 2, seed: 10 + i, frame: s.f }); });
  thought(ctx, s, 1120, 640, "question", s.t(226, 244));
} };
const chapter: Scene = { id: "chapter", len: 120, atm: "linen-morning", draw: (ctx, env, s) => { chapterCard(ctx, env, s, { no: 1, title: ["Arrival."], pose: "waving" }); } };
const catchScene: Scene = { id: "catch", len: 450, draw: (ctx, env, s) => {
  // on the beach: each page blows in from the left; ⌥C; it shrinks into the satchel (the inbox pose's envelope)
  const QX = 1180, QY = 960;
  PAGES.forEach((p, i) => { const t0 = CATCH[i] - 60, fly = seg(s.l, t0, CATCH[i]), into = easeOut(seg(s.l, CATCH[i], CATCH[i] + 16)); if (fly <= 0 || into >= 1) return;
    const x = -200 + (QX - 60 + 200) * easeOut(fly) - 40 * into, y = 420 + i * 30 - Math.sin(fly * Math.PI) * 120 + into * 300;
    card(ctx, { x, y, rot: (1 - fly) * 0.7 * (i % 2 ? -1 : 1), scale: (p.token ? 1 : 0.8) * (1 - into * 0.85), title: p.t, token: p.token, lines: 2, seed: 20 + i, frame: s.f }); });
  const last = CATCH.filter((c) => s.l >= c).length, since = last ? s.l - CATCH[last - 1] : 99;
  actor(ctx, env, s.f, { pose: last ? "inbox" : "attention", x: QX, y: QY, h: 380, squash: since < 8 ? 1 - 0.1 * Math.sin((since / 8) * Math.PI) : 1, lean: Math.sin(s.f / 10) * 2 });
  // the chord, pressed on each catch
  const press = CATCH.map((c) => (s.l >= c - 6 && s.l < c + 8 ? 1 - Math.abs(s.l - c) / 8 : 0)).reduce((a, b) => Math.max(a, b), 0);
  if (s.l > 60) keys(ctx, 700, 150, ["⌥", "C"], Math.max(0, press), 64);
  // the Captures counter
  const n = last; if (n) { fillRR(ctx, 890, 162, 250, 70, 35, C.surface, C.ink, 3); text(ctx, `Captures  ${n}`, 1015, 208, { size: 32, weight: 600, align: "center" }); }
  if (s.l >= CATCH[0] && s.l < CATCH[0] + 60) thought(ctx, s, QX, QY - 330, "heart", s.t(CATCH[0] + 4, CATCH[0] + 20));
  if (s.l >= CATCH[0]) lowerThird(ctx, s.l, CATCH[0], s.len, "Quick capture with ⌥C, from anywhere.", "The thought lands in Captures.");
} };
const captures: Scene = { id: "captures", len: 420, atm: "linen-morning", draw: (ctx, env, s) => {
  // inside: the Captures list, the four thoughts waiting, "filed later"
  const X = 180, Y = 120, Wd = 1560, Hd = 780;
  fillRR(ctx, X + 10, Y + 16, Wd, Hd, 26, "rgba(58,48,40,0.12)"); fillRR(ctx, X, Y, Wd, Hd, 26, T.roles.surface, C.ink, 4);
  ctx.save(); ctx.beginPath(); ctx.roundRect(X, Y, Wd, Hd, 26); ctx.clip(); ctx.fillStyle = T.roles.ground; ctx.fillRect(X, Y, 320, Hd); ctx.restore();
  ["#e8836f", "#e8c46f", "#9cc27e"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X + 32 + i * 28, Y + 32, 9, 0, 6.29); ctx.fill(); });
  text(ctx, "Home", X + 36, Y + 110, { size: 28, weight: 600 }); ["All notes", "Captures", "Tasks"].forEach((n, i) => { const yy = Y + 170 + i * 56; if (i === 1) fillRR(ctx, X + 20, yy - 34, 280, 50, 12, T.roles.tint); text(ctx, n, X + 52, yy, { size: 28, weight: i === 1 ? 600 : 500, color: i === 1 ? T.roles.text : T.roles["text-muted"] }); if (i === 1) text(ctx, "4", X + 280, yy, { size: 24, align: "right", color: T.roles["accent-text"], weight: 600 }); });
  text(ctx, "Captures", X + 390, Y + 120, { size: 60, weight: 600, spacing: -2.4 }); text(ctx, "caught with ⌥C · the Librarian files them later", X + 392, Y + 170, { size: 28, color: T.roles["text-muted"] });
  PAGES.forEach((p, i) => { const k = pop(s.t(20 + i * 22, 36 + i * 22)); if (k <= 0) return; const yy = Y + 250 + i * 118;
    ctx.save(); ctx.translate(X + 390, yy); ctx.scale(1, k); fillRR(ctx, 0, 0, 1080, 96, 16, p.token ? T.roles.tint : T.roles.surface, T.roles.border, 2);
    ctx.fillStyle = p.token ? C.clay : T.roles["text-muted"]; ctx.fillRect(24, 24, 6, 48); text(ctx, p.t, 56, 60, { size: 34, weight: 600 }); text(ctx, ["just now", "1 min ago", "3 min ago", "5 min ago"][i], 1050, 60, { size: 26, align: "right", color: T.roles["text-muted"] }); ctx.restore(); });
  // a glint at the lighthouse: someone will file these tonight
  const g = s.t(300, 330); if (g > 0) { thought(ctx, s, 1640, 980, "lighthouse", g, { side: -1, scale: 0.9 }); }
  actor(ctx, env, s.f, { pose: "notes", x: 1740, y: 1050, h: 300, lean: Math.sin(s.f / 9) * 2 });
  lowerThird(ctx, s.l, 40, s.len, "Every caught thought waits in Captures,", "to be filed later.");
} };
const hut: Scene = { id: "hut", len: 330, draw: (ctx, env, s) => {
  // back on the beach at the hut: ⌥Space opens the window over the island, ⌥Space hides it, again
  const presses = [60, 150, 225], open = (l: number) => presses.filter((p) => l >= p).length % 2 === 1;
  actor(ctx, env, s.f, { pose: open(s.l) ? "notes" : "base", x: 1500, y: 980, h: 360, lean: Math.sin(s.f / 10) * 2 });
  const p = presses.reduce((a, c) => Math.max(a, s.l >= c - 6 && s.l < c + 8 ? 1 - Math.abs(s.l - c) / 8 : 0), 0);
  keys(ctx, 1180, 170, ["⌥", "Space"], p, 64);
  const lastP = presses.filter((q) => s.l >= q).pop() ?? -99, k = open(s.l) ? pop(seg(s.l, lastP, lastP + 14)) : 1 - easeOut(seg(s.l, lastP, lastP + 8));
  if (k > 0.01) { ctx.save(); ctx.translate(620, 520); ctx.scale(k, k); ctx.globalAlpha = Math.min(1, k * 1.3);
    fillRR(ctx, -470, -300, 940, 600, 24, T.roles.surface, C.ink, 4); ["#e8836f", "#e8c46f", "#9cc27e"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-440 + i * 26, -272, 8, 0, 6.29); ctx.fill(); });
    text(ctx, "Trip ideas", -390, -170, { size: 56, weight: 600, spacing: -2 }); ["book the ferry", "pack a snorkel", "find the pink lake"].forEach((t, i) => { fillRR(ctx, -390, -110 + i * 64, 30, 30, 8, T.roles.surface, T.roles["text-muted"], 3); text(ctx, t, -344, -86 + i * 64, { size: 32 }); });
    ctx.restore(); }
  lowerThird(ctx, s.l, 30, s.len, "⌥Space opens or hides Rotli,", "from anywhere on your Mac.");
} };
const payoff: Scene = { id: "payoff", len: 90, atm: "linen-morning", draw: (ctx, env, s) => intertitle(ctx, s, ["Caught. Kept.", "Filed later."], { hi: "Kept" }) };
const end: Scene = { id: "end", len: 120, atm: "linen-morning", draw: (ctx, env, s) => storyEnd(ctx, env, s, { next: "Plain Words", pose: "waving" }) };

const SCENES = [cold, chapter, catchScene, captures, hut, payoff, end];
export const s01e01Arrival: Film = story({ id: "s01e01Arrival", no: 1, title: "Arrival", atmosphere: "island-dawn", scenes: SCENES,
  score: { pops: [...CATCH.map((c, i) => [sceneStart(SCENES, "catch") + c, [79, 81, 84, 86][i]] as [number, number]), ...[60, 150, 225].map((c) => [sceneStart(SCENES, "hut") + c, 91] as [number, number])], thumps: [sceneStart(SCENES, "cold") + 172, sceneStart(SCENES, "cold") + 218] } });

const C0 = sceneStart(SCENES, "catch"), CP = sceneStart(SCENES, "captures"), HU = sceneStart(SCENES, "hut");
export const s01e01Derive: DeriveSpec = {
  no: 1, series: "season-one", label: "Rotli · Season One · 01",
  vertical: [
    { frame: 60, len: 180, crop: { x: 300, y: 120, w: 1320, h: 900 }, title: "A quiet island.", sub: "Thoughts blowing everywhere.", hi: "quiet" },
    { frame: C0 + 60, len: 300, crop: { x: 620, y: 110, w: 1200, h: 960 }, title: "Catch it with ⌥C.", sub: "It lands in Captures.", hi: "⌥C" },
    { frame: CP + 40, len: 210, crop: { x: 540, y: 160, w: 1220, h: 700 }, title: "Filed later.", sub: "Every thought waits in Captures.", hi: "later" },
    { frame: HU + 40, len: 210, crop: { x: 140, y: 180, w: 1700, h: 860 }, title: "⌥Space, anywhere.", sub: "Open or hide Rotli.", hi: "anywhere" },
  ],
  slides: [
    { frame: 200, crop: { x: 300, y: 120, w: 1320, h: 900 }, title: "A quiet island.", sub: "Thoughts blowing everywhere.", hi: "quiet" },
    { frame: C0 + 120, crop: { x: 620, y: 110, w: 1200, h: 960 }, title: "Catch it with ⌥C.", sub: "It lands in Captures.", hi: "⌥C" },
    { frame: CP + 200, crop: { x: 540, y: 160, w: 1220, h: 700 }, title: "Filed later.", sub: "Every thought waits in Captures.", hi: "later" },
    { frame: HU + 100, crop: { x: 140, y: 180, w: 1700, h: 860 }, title: "⌥Space, anywhere.", sub: "Open or hide Rotli.", hi: "anywhere" },
  ],
  single: { frame: C0 + 360, crop: { x: 300, y: 120, w: 1500, h: 900 }, title: "Arrival.", sub: "Catch a thought before it blows away.", hi: "Arrival" },
};
