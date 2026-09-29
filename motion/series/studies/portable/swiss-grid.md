You are a world-class motion designer who works in code. Make "Swiss Grid": 22 seconds of motion at 1080 × 1350, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1350. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (800, 600 and 400) for everything, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A poster-film for an invented lecture series, 'Grid Week', in the International Typographic Style: off-white paper, black and one red only, with no tints, gradients or shadows. The grid is visible (hairline columns, rows, gutters and baselines with crop marks) and everything obeys it: resting edges sit on module edges, text sits on baselines. Things move only horizontally or vertically, one axis at a time, in fast final snaps with a strong ease-out and no bounce; widths grow in whole-module steps. Type is a grotesque sans set tight, flush left and ragged right, never centred; a giant numeral about four modules tall anchors an asymmetric composition. Red marks one rectangle and the active day. Scenes: the grid draws in; a red module grows and the title drops onto its baseline; five evenings, each a new giant numeral snapping in with a day and session name ('The Module', 'The Margin', 'The Gutter', 'The Baseline', 'The White Space') and a tiny diagram that demonstrates it; then every element snaps into the final poster with the list, the title across the top, the red bar at the bottom and a small info block.
Palette: ground #f2f1ed, surface #ffffff, ink #121212, muted #8b8a86, line #dcdad4, accent #ff3d2e, accent2 #2f6bff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · the grid: column hairlines slide down from the top edge one after another (2 frames apart), then row lines slide in from the left, then the baselines; the crop marks tick into the four corners
- 2–5 s · the title: a red module appears top-left and grows to the right in whole-module snaps until it spans four columns; 'Grid Week' drops onto its baseline beneath it, flush left, in Inter 800; the line 'Five evenings on order' snaps in under it
- 5–7 s · evening 1: the giant numeral '1' snaps in along its column from the left edge; at the lower right, flush left on the grid, 'Mon' then 'The Module'; a small grid diagram beside it lights ONE module red
- 7–9 s · evening 2: the numeral slides out left along its row and '2' snaps in from the right; 'Tue' / 'The Margin'; the diagram's margin band turns red and the modules step inward
- 9–11 s · evening 3: '3' snaps in; 'Wed' / 'The Gutter'; the diagram's gutters flash red one after another
- 11–13 s · evening 4: '4' snaps in; 'Thu' / 'The Baseline'; the diagram's baselines rule in, and the text beside it visibly drops onto them
- 13–15 s · evening 5: '5' snaps in; 'Fri' / 'The White Space'; the diagram clears every module except one, and the empty paper around the numeral widens as the text column snaps one column further right
- 15–19 s · recompose: every element snaps along grid lines into the final poster, one move per half beat: the numeral shrinks into a column of small numerals '1 2 3 4 5' beside the five session titles (a flush-left list), 'Grid Week' grows to span five columns at the top, the red rectangle moves down to the bottom row and stretches across four columns
- 19–22 s · the poster holds: an info block snaps in at the bottom right: 'Hall 2 · every evening at 19:00' and 'Free entry'; the grid hairlines fall back to a quarter of their strength but stay; the active-day square steps down the list once per beat; a slow straight push-in

SIZES
- portrait: 1080 × 1350.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: portrait first on a 6 × 8 grid; landscape on a 12 × 6 grid with the numeral on the left, the day text in the middle and the diagram on the right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A visible grid turns layout into choreography: when every element can only snap along the same lines, even a five-item list feels composed, and the empty space the grid leaves becomes part of the design.
- Sound (Web Audio, starts on the first click): a crisp driving loop at 120 bpm whose drums enter at the title, a click on every snap, a hit on each numeral change and on the recompose, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
