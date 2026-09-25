You are a world-class motion designer who works in code. Make "Paper Collage": 24 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif and Instrument Serif Italic for captions, Inter for labels, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Cut-paper collage on kraft paper: shapes with torn, slightly irregular edges, paper grain, drop shadows as if lifted off the page, halftone patches, two paper hands that slide a puzzle piece into place, and a retro computer made of paper shapes. Everything moves like stop motion (hold each pose for 2 frames). Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #dcc6a4, surface #f3ead9, ink #2a211b, muted #7d6a55, line #c4ab86, accent #d7263d, accent2 #1b7f9b, deep #2a211b. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2.5 s · hook: a torn-paper headline 'The missing piece' is pasted on, letter scraps sliding into place
- 2.5–7.5 s · a paper calendar with one torn-out hole; paper hands enter carrying the missing piece
- 7.5–12.5 s · a retro paper computer beside a big circle; on its screen, paper scraps rearrange into 'Thu 3:00'
- 12.5–17.5 s · three paper portraits (simple shapes) each get a paper check mark pasted on
- 17.5–21.5 s · the hands press the puzzle piece into the calendar; it clicks, the grain shifts, confetti scraps burst
- 21.5–24 s · sign-off: 'Oriel' in cut letters; caption 'the piece your week was missing'

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: spread the collage across the page, calendar on the left, computer on the right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Collage is texture plus timing: irregular edges, grain and shadows sell the paper, and holding each pose for two frames sells stop motion.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm with paper rustles on each paste, a hit when the piece clicks in and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
