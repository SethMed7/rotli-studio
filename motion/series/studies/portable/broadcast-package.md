You are a world-class motion designer who works in code. Make "Broadcast Package": 24 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (800 and 600) for names and labels, JetBrains Mono for every number, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A TV sports graphics package for an invented office ping-pong final, played dead straight. One house direction: every element enters from the left and builds in layers (base plate, colour, text, detail, each a few frames after the last) on fast ease-out curves, and leaves by a quick reverse wipe; one house angle: every plate, bar and wipe is a parallelogram skewed 12°. Names and labels are bold uppercase sans with slight tracking; every number is monospace so digits never jitter. Two player colours (a red-orange and a cyan), gold for match point and the win, white type on a dark navy. The live picture is a flat top-down ping-pong table with a closed-form rally: a white ball whose height shows only through its shadow's offset, paddles sliding to meet it. A stinger of five skewed bars sweeps across, covers the frame for two frames while the picture cuts, and clears. A score bug builds top-left (colour chip, surname, score box per player, a strip with the game and a running clock); score changes roll the old digit up and the new one in. A lower third builds from an accent bar, a masked name plate, a second line and a small stat tag, and holds unchanged for four seconds. A full-frame stats board grows diverging bars from a centre spine while numbers count up. A ticker crawls at a constant speed along the bottom. Flat fills only: no gradients, glows or shadows except the ball's.
Palette: ground #0b1026, surface #161d42, ink #ffffff, muted #a3acd0, line #28316a, accent #ff4d2e, accent2 #2fd3ff, gold #ffc93c, table #1f4e8c, deep #05081a. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · the open: the stinger's five bars sweep across; the event mark 'T2' snaps in; the title plate builds from the left: 'TABLE TWO OPEN' over 'THE FINAL'
- 2–6 s · live: the stinger clears to the table; a rally runs; the score bug builds in layers top-left: 'LUND' 9 over 'MARSH' 9, the strip 'G5' with the clock counting
- 6–10 s · the lower third builds and holds: 'LUND' then 'PIA', the strip 'ACCOUNTS · 3RD YEAR ON TABLE TWO', the tag 'SERVE WIN 71%'; the ticker band slides in at the bottom and starts to crawl: 'COFFEE MACHINE ON 3 IS FIXED', 'FOOSBALL SEMIS FRIDAY AT 4', 'LOST: ONE ORANGE BALL', 'TABLE ONE CLOSED FOR RE-TAPING'
- 10–14 s · match point: the lower third wipes out; a long rally; LUND's score rolls 9 → 10 with a flash; a gold tab 'MATCH POINT' slides out beneath the bug
- 14–18 s · the stats board fills the frame (the bug and ticker stay): headers 'LUND' and 'MARSH', rows with diverging bars and counting numbers: 'ACES 4 · 2', 'LONGEST RALLY 23 · 23', 'EDGE BALLS 1 · 5', 'SNACKS ON THE BENCH 3 · 0'
- 18–21 s · the winner: back to the table for one fast point; the score rolls 10 → 11; the stinger sweeps; a gold plate builds: 'LUND WINS' over '11–9 · GAME 5'
- 21–24 s · the bumper: the event mark centred with 'TABLE TWO OPEN' and 'CHAMPION · PIA LUND', the ticker still crawling beneath; the plate holds with a slow push-in until the frame's end

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: rotate the table so the players are top and bottom, keep the bug top-left and the lower third and ticker above the bottom safe margin, stack the stat headers, and keep the house direction left to right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A broadcast package is a grammar, not a set of pictures: one entry direction, one angle, layers that build in the same order every time, and numbers that never jitter make every graphic read as part of one show.
- Sound (Web Audio, starts on the first click): a driving loop at 120 bpm whose drums enter after the open, whooshes for the stinger sweeps, a hit when the live picture lands, a tick for each layer that builds, soft ticks for the ball's bounces, hits for match point and the winning point, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
