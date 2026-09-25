You are a world-class motion designer who works in code. Make "Pixel Parable": 25 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif and Instrument Serif Italic for captions, Inter for labels, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Pixel art: 8-bit characters built from square pixels (snap every pixel to a 6 px grid, no anti-aliasing) stand on a dark ground strip under a pale sky. A cautionary tale told with pixel props, a swarm of notification icons and a pixel serpent that coils along a path. A few crisp UI cards (not pixelated) cut in to show numbers. Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #12163a, surface #1d2254, ink #f5f1e6, muted #8e93c4, line #2c3270, accent #ff4fa3, accent2 #3ee0c5, sky #f3ede0, deep #12163a. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2.5 s · hook: a pixel manager stands before a team of three at desks; caption 'We rewarded meetings booked.'
- 2.5–7 s · the team books meetings: calendar icons pop out of their desks in a growing swarm; a counter card ticks 12 → 240
- 7–11.5 s · the calendar tower wobbles: a grid of meeting icons flips from teal to magenta one by one ('no-shows'); caption 'so they booked everything'
- 11.5–16 s · a pixel serpent slides along a path through the office, eating the day; caption 'The metric became the goal.'
- 16–21 s · the fix: a UI card shows two metrics side by side ('meetings held' and 'decisions made'), both sparklines rise; the icons flip back to teal
- 21–25 s · sign-off: the team high-fives in pixels; 'Oriel' pixel sign rises; caption 'measure the outcome, not the count'

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: widen the office so the team and the manager share one frame, captions top left.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Pixel art is a grid decision: snap everything to one pixel size and the style holds, even when crisp UI cuts in.
- Sound (Web Audio, starts on the first click): a bright 8-bit style loop at 120 bpm, ticks for every icon pop, a hit when the serpent appears and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
