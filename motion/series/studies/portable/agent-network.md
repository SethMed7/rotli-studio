You are a world-class motion designer who works in code. Make "Agent Network": 24 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: JetBrains Mono for labels and the log, Instrument Serif and Instrument Serif Italic for captions, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A system map: agents are nodes (circles with a small glyph and a mono label) on a dark ground; dotted edges draw between them; messages travel along edges as small glowing packets; thin orbit ellipses spin around the busiest node; a log panel prints each handoff in mono. Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #0b0f0c, surface #131a15, ink #d6ffd9, muted #5f7a63, line #1f2b22, accent #3cff7d, accent2 #ffcc00, deep #0b0f0c. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2.5 s · hook: one node blinks on, labelled 'request: one hour, four people'
- 2.5–7.5 s · four agent nodes appear (Calendar, People, Rooms, Notes) and dotted edges draw to the hub
- 7.5–13.5 s · packets travel: hub → Calendar → People (conflict!) → Calendar; the log prints each handoff
- 13.5–18.5 s · orbit ellipses spin up around the hub as it resolves; one packet turns yellow: 'Thu 15:00'
- 18.5–22 s · all nodes flash green in sequence; the log prints 'booked · 4/4 accepted'
- 22–24 s · sign-off: the network collapses into a single node that becomes 'Oriel'

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: stack the network in the upper two thirds and the log panel below it.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A system reads when you show traffic, not boxes: let packets move along the edges and log every handoff.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm with a blip for every packet hop, a hit when the time resolves and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
