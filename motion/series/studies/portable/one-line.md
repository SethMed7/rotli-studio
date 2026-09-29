You are a world-class motion designer who works in code. Make "One Line": 30 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (400 and 600) for captions, Instrument Serif Italic for one key word per headline, JetBrains Mono for the small step counter, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A continuous single-line drawing that never lifts. One unbroken ink stroke on a pale green-cream ground draws every subject and morphs from one drawing into the next; the ground is part of it: the stroke enters from the left edge as the soil line, dips to draw the subject and leaves at the right edge, so there is only ever one line on screen. Author each drawing as one open path from edge to edge, resample every path by arc length to the same number of points, draw a drawing on by trimming the path (a small nib dot at the moving end), and morph by interpolating point-for-point with an ease-in-out; keep the point order consistent (soil, subject, soil) so morphs never tangle; a tiny slow wobble keeps held lines alive. The subjects: a bean seed under the soil line, the seed swollen with water, a root coming out first, a stem hooked through the soil, the hook straightening to lift two round seed leaves, true leaves, and a spiral sun at the end of the line. Only two small flat fills, placed behind the line after it outlines them: blue in the water droplets and yellow in the sun. Short captions, one italic serif key word, and a small step counter.
Palette: ground #f1f0e1, surface #ffffff, ink #1f3b2a, muted #5d6f5f, line #d9dcc6, accent #f2a93b, accent2 #3f8fc4, deep #1f3b2a, s1 #8a6a4b. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–4 s · the line arrives: the stroke draws on from the left edge as the soil line, dips to draw the bean seed and leaves at the right; headline 'A seed is a *tiny plant*' then the line 'packed with its own food.'; step '1/6'
- 4–8 s · what it needs: three short marks for water, a wavy line for air and a small thermometer morph briefly out of the soil line and back (all the same stroke); headline 'It needs *water*, air and the right warmth.'
- 8–12.5 s · water: the seed morphs rounder and larger; the three water ticks appear beside it and their droplets fill accent2; headline 'First it *drinks*.' with the line 'The seed swells and its coat splits.'; step '2/6'
- 12.5–17 s · root: the seed outline opens and the line runs down out of it as a root that curves and branches once; headline 'The *root* comes out first.' with the muted line 'It's called the radicle.'; step '3/6'
- 17–21.5 s · hook: the line rises from the seed as a stem bent into a hook and pushes the hook through the soil line; headline 'In a bean, the stem *hooks*' then 'and pulls the seed leaves up through the soil.'; step '4/6'
- 21.5–26 s · leaves: the hook straightens and lifts two round seed leaves; then a pair of pointed true leaves unfolds above them; headline '*Seed leaves* first, then true leaves.'; step '5/6'
- 26–30 s · light: before leaving the frame, the line loops into a spiral sun that fills accent; headline 'When the stored food runs out,' then '*light* takes over.'; step '6/6'; the whole single line holds, wobbling gently, with a slow push-in

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: vertical: the soil line lower in the frame, the subject larger with the root deeper and the plant taller, captions in the top third, the sun above the plant.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- One unbroken line can carry a whole explanation: when every drawing is the same resampled path, each step visibly grows out of the last, which is exactly how a seedling grows.
- Sound (Web Audio, starts on the first click): a soft bright loop at 120 bpm with no drums, a gentle pen scratch while the line draws, a whoosh as each morph arrives, a drip for each droplet, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The topic is real: keep every fact exactly as written above (it is sourced), hedged the way it is hedged. Build it exactly as written first; afterwards, swap in your own topic, colours and words, and source your own facts.
