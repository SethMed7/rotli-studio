// ATMOSPHERE REEL — the library, seen: every atmosphere in studio/atmospheres.ts for 3 s, each showing a
// different story template (intertitle, thought, chapter card, the Librarian, line style, lower third, end
// card) so a new piece can pick by eye. 30 s, 1920x1080.
import type { Film } from "./film";
import { ATMOSPHERES } from "./studio/atmospheres";
import { lowerThird } from "./studio/series";
import { C, LIBRARIAN_LOOKS, actor, chapterCard, fillRR, intertitle, librarian, lineQuokka, story, storyEnd, text, thought, type Scene } from "./studio/story";

const tagline = (ctx: CanvasRenderingContext2D, s: { dark: boolean; atm: { id: string; label: string; why: string; family: string } }) => {
  const col = s.dark ? C.nightText : C.cocoa, w = 760; fillRR(ctx, 72, 60, w, 118, 22, s.dark ? C.nightSurface2 : C.surface, s.dark ? C.nightBorder : C.ink, 3);
  text(ctx, `${s.atm.label}`, 104, 112, { size: 36, weight: 600, color: col, spacing: -1 }); text(ctx, `${s.atm.id} · ${s.atm.family} · ${s.atm.why}`, 104, 152, { size: 22, color: s.dark ? C.nightMuted : C.muted });
};
const demos: Record<string, Scene["draw"]> = {
  "island-dawn": (ctx, env, s) => { actor(ctx, env, s.f, { pose: "waving", x: 1120, y: 950, h: 340 }); thought(ctx, s, 1120, 640, "sun", s.t(10, 28)); },
  "linen-morning": (ctx, env, s) => { intertitle(ctx, s, ["Plain words,", "quietly rendered."], { hi: "rendered" }); },
  "paper-studio": (ctx, env, s) => { lineQuokka(ctx, s, { pose: "notes", x: 960, y: 980, h: 620 }); },
  "grove-burrow": (ctx, env, s) => { actor(ctx, env, s.f, { pose: "inbox", x: 960, y: 980, h: 420 }); thought(ctx, s, 960, 600, "folder", s.t(10, 28)); },
  "night-vault": (ctx, env, s) => { librarian(ctx, env, s, { x: 760, y: 980, h: 520, pose: "knowledge" }); thought(ctx, s, 760, 560, "lighthouse", s.t(10, 28)); },
  "ocean-tide": (ctx, env, s) => { chapterCard(ctx, env, s, { no: 6, title: ["Threads."], pose: "searching" }); },
  "iris-dusk": (ctx, env, s) => { actor(ctx, env, s.f, { pose: "ai_chat", x: 960, y: 980, h: 440 }); lowerThird(ctx, s.l, 8, 90, "Chat reads the vault you are in.", "and answers from what is actually there."); },
  "midnight-rain": (ctx, env, s) => { lineQuokka(ctx, s, { pose: "stays_local", x: 960, y: 1000, h: 560 }); thought(ctx, s, 1080, 520, "lock", s.t(10, 28)); },
  "harbour-day": (ctx, env, s) => { actor(ctx, env, s.f, { pose: "walking", x: 1100, y: 960, h: 340 }); thought(ctx, s, 1100, 640, "globe", s.t(10, 28)); },
  "island-sunset": (ctx, env, s) => { storyEnd(ctx, env, s, { next: "Season Two" }); },
};
const scenes: Scene[] = Object.values(ATMOSPHERES).filter((a) => demos[a.id]).map((a) => ({ id: a.id, len: 90, atm: a.id, transition: "wipe" as const, draw: (ctx, env, s) => { demos[a.id](ctx, env, s); tagline(ctx, s); } }));
scenes[0].transition = "cut";
export const atmosphereReel: Film = story({ id: "atmosphereReel", no: 0, title: "Atmospheres", atmosphere: "island-dawn", scenes, looks: LIBRARIAN_LOOKS, score: { energeticFrom: 120, melody: 1 } });
