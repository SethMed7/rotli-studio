// ROTLI — "The Quokka Who Kept Everything". 60 s, 1920x1080, 30 fps, 120 bpm (15-frame beat).
// The cue table below IS the timeline: every cut sits on the beat grid, film.validate checks it at load.
// Story, token and reasons: story.md.
import type { Film, Shot } from "./film";
import { shotChat, shotVault, shotViews, shotWrite } from "./rotli/shotsApp";
import { shotFerry, shotNoise, shotSunset } from "./rotli/shotsBeach";
import { shotLibrarian, shotSecure } from "./rotli/shotsNight";
import { score } from "./rotli/score";

const CUT: [string, number, number, (f0: number) => Shot["draw"]][] = [
  ["ferry", 0, 150, shotFerry],
  ["noise", 150, 300, shotNoise],
  ["write", 300, 510, shotWrite], // the turn: ⌥Space lands on frame 300
  ["vault", 510, 720, shotVault],
  ["librarian", 720, 960, shotLibrarian],
  ["views", 960, 1140, shotViews],
  ["secure", 1140, 1350, shotSecure],
  ["chat", 1350, 1560, shotChat],
  ["sunset", 1560, 1800, shotSunset], // bell on 1620, final tonic on 1740
];
const DURATION = 1800;

export const rotliStory: Film = {
  meta: { title: "rotliStory", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: DURATION, raster: "cpu" },
  assets: {
    images: {},
    fonts: {
      "General Sans@500": "assets/fonts/GeneralSans-Medium.woff2",
      "General Sans@600": "assets/fonts/GeneralSans-Semibold.woff2",
      "General Sans@400": "assets/fonts/GeneralSans-Regular.woff2",
      "Baloo 2@600": "assets/fonts/Baloo2-600.ttf",
    },
  },
  shots: CUT.map(([id, start, end, make]) => ({ id, start, end, draw: make(start) })),
  audio: score(DURATION),
};
