You are a world-class motion designer who works in code. Make "Neon Drive": 24 seconds of motion at 1920 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (800) for the neon and chrome title, JetBrains Mono for the small lines and tracklist, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
The opening card of an invented night-drive mixtape in the synthwave manner. A sky from violet-black to violet to hot pink at the horizon with twinkling stars; a striped sun filled yellow to orange to pink, cut by horizontal gaps that grow toward the bottom and drift down; low wireframe mountains; and a perspective grid floor whose horizontal lines sit at depths k + phase (screen y = horizon + focal / z) so it scrolls forever, with vertical lines converging on the vanishing point. Neon is always three layered strokes (wide and faint, medium, thin bright core) composited additively, never a blur filter. The first word is neon tube lettering (a bold sans drawn as stroked outlines only) that ignites letter by letter with an irregular, seeded flicker, never metronomic; the second word is chrome: a hard-banded gradient (pale blue, white, a dark band at the midline, then orange to yellow) with an outline and a sliding star glint. Palm silhouettes pass on both sides with true parallax during a drive; a tracklist flickers on; a neon cassette draws itself; the sun sets; 'PRESS PLAY' blinks. A faint scanline overlay sits on top.
Palette: ground #0d0621, surface #1b0f3d, ink #fcf4ff, muted #a794d8, line #3b2575, accent #ff3ea5, accent2 #2de2ff, s1 #ffd447, s2 #ff6a3d, s3 #7b2cff, deep #05020d. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (100 bpm, a beat every 0.60 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2.4 s · ignition: black; a single cyan neon line draws out from the centre along the horizon with a stutter; stars fade in; the sky's gradient rises from below the horizon
- 2.4–7.2 s · the world rolls in: the striped sun rises from behind the horizon and its gaps start drifting down; the grid floor fades in and starts rushing toward the camera; the wireframe mountains slide up in front of the sun; a tiny mono line top-left: 'SIDE A · 00:00'
- 7.2–12 s · the title: 'LUMEN' ignites in cyan neon tube letters, one letter every half beat with an irregular flicker, then holds with a hum; on the downbeat at 576 'LANE' slams in underneath in chrome with a short scale-down from 1.15 and the star glint sweeps across it; a small mono line under both: 'a night-drive mixtape'
- 12–16.8 s · the drive: the camera drops lower and the grid speeds up; palm silhouettes pass on both sides in parallax; the title shrinks to the upper left; a tracklist flickers on at the right, one line per two beats, in pink neon mono: 'A1  Tail Lights', 'A2  Overpass', 'A3  Coastline, 3 AM', 'A4  Last Exit'
- 16.8–21.6 s · the lockup: the tracklist switches off line by line; the title returns to the centre; a neon cassette draws itself below it (a rounded rectangle, a label window, two reels whose spokes turn), with an outlined 'SIDE A' pill beside it
- 21.6–24 s · end: the sun sinks behind the horizon, its last stripe flaring; the grid keeps scrolling; 'PRESS PLAY' blinks in neon on every beat under the cassette; the neon hum holds to the last frame

SIZES
- landscape: 1920 × 1080.
- Add ?size=square for 1080 × 1080. Design that layout for its shape: re-stack it square: horizon a little below the middle, the title stacked large, the tracklist under the title in the lower half, the cassette centred.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- An era is a set of rules you can code: a perspective grid, a striped sun, layered-stroke neon that ignites irregularly and a banded chrome fill are enough to summon the whole aesthetic, and the irregular flicker is what makes it feel electric rather than animated.
- Sound (Web Audio, starts on the first click): a driving synth loop at 100 bpm whose drums enter with the title, buzzing double clicks as each neon letter strikes, a hit on the chrome slam, a whoosh into the drive, a click on each blink, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
