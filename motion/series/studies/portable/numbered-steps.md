You are a world-class motion designer who works in code. Make "Numbered Steps": 24 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif and Instrument Serif Italic for captions, Inter for labels, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A listicle reel: giant numerals (1, 2, 3) fill the frame on a solid colour field, each step's words stack beside the numeral, and a small illustrated icon scene demonstrates it; the numeral morphs from one to the next. Bold, flat, poster-like. Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #fff3d1, surface #fffaf0, ink #1d1d1b, muted #7a7466, line #ecdcae, accent #0047ff, accent2 #ff7a1a, deep #1d1d1b. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · hook: '3 steps to a calmer week' in a ladder; three dots count 1-2-3
- 2–8 s · a giant '1' slams in; beside it 'Block your deep work'; an icon of a calendar gets three blue blocks
- 8–14 s · the 1 morphs into a '2'; 'Batch your meetings'; scattered meeting chips gather into one afternoon
- 14–20 s · the 2 morphs into a '3'; 'Let the calendar ask'; a chat bubble 'find an hour' turns into a booked chip
- 20–24 s · summary card lists 1-2-3 with ticks; CTA: 'Comment "calm" for the checklist'; 'Oriel' small underneath

SIZES
- vertical: 1080 × 1920.
- Add ?size=square for 1080 × 1080. Design that layout for its shape: put the numeral on the left and the words on the right at a smaller size.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A listicle's structure is its animation: the numeral is the transition, so every step feels like one more beat of the same idea.
- Sound (Web Audio, starts on the first click): a driving loop at 120 bpm with a hit on each numeral slam, ticks on icon moves and a short sign-off under the call to action.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
