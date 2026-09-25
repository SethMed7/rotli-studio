You are a world-class motion designer who works in code. Make "Kinetic Poster": 12 seconds of motion at 1920 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (800 and 400 italic), loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Type only, full bleed. A saturated orange ground, near-black type set huge and tight, outline letters that fill solid as they land, an italic word for emphasis, a marquee of repeating rows moving in alternating directions, and hard colour-flash title cards (blue, black, paper) cut on the beat. Add motion blur on fast moves by averaging several draws inside the shutter.
Palette: ground #ff4a1c, surface #f4efe6, ink #141414, muted #6f2a18, line #d63d15, accent #2b3dff, accent2 #f4efe6. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–1 s · hook: 'FIND' slams in from the left, letters overshooting into place, a thin rule draws under it
- 1–3 s · 'ONE' drops in as outline letters that fill solid one by one; 'HOUR.' follows in italic, the full stop in the accent blue
- 3–5 s · the three words shear and stack into a tight block; the block scales past the frame, leaving only the full stop
- 5–7 s · a marquee: five rows of 'NO MORE BACK AND FORTH' scroll in alternating directions, outline and solid rows interleaved
- 7–9 s · colour-flash cards on each beat: blue 'ASK', black 'MATCH', paper 'BOOK', each word landing with a squash
- 9–11 s · all three words fly into a line 'ASK · MATCH · BOOK.' that settles; a counter ticks 12 → 1 beside it
- 11–12 s · sign-off: 'Oriel.' in the huge type on the orange, 'find a time that works for everyone' in small italic under it

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: stack the words one per line at a larger size and run the marquee rows taller.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Type can be the whole picture: size, weight, outline and colour changes carry the story, and every change lands on a beat.
- Sound (Web Audio, starts on the first click): a driving loop at 120 bpm with a hit on every slam and colour card, rising noise into the stack and the marquee, and a short sign-off under the name.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
