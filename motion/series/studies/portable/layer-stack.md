You are a world-class motion designer who works in code. Make "Layer Stack": 24 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif and Instrument Serif Italic for captions, Inter for labels, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Isometric infographic: three thick isometric slabs, each with a question mark, float in a stack over a sunburst of thin rays; they separate, get named, and lock together, and each layer opens into its own small isometric scene. Flat colour, a soft shadow under each slab. Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #f1f4fb, surface #ffffff, ink #0f1b3d, muted #6b7797, line #d6ddee, accent #ffb000, accent2 #3d6bff, deep #0f1b3d. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · hook: three isometric slabs drop into a stack over a spinning sunburst; each shows a '?'. Caption: 'The three-layer calendar.'
- 2–6 s · layer 1 lifts out and turns into a small isometric desk with a calendar block; caption 'Layer 1 · the ask'; a cursor types 'an hour with Ana and Ben'
- 6–11 s · layer 2 becomes a node diagram: four agent nodes linked by dotted lines that draw on, two thin orbit ellipses wrap them; caption 'Layer 2 · the agents'
- 11–16 s · layer 3 becomes a dark square with a starburst of connected points (memory); caption 'Layer 3 · what they remember'
- 16–21 s · the three layers fly back into the stack and lock with a click; the '?' marks flip to ticks; the rays speed up
- 21–24 s · sign-off: 'Oriel' on the top slab, 'three layers, one calm week' as a caption ladder

SIZES
- vertical: 1080 × 1920.
- Add ?size=square for 1080 × 1080. Design that layout for its shape: keep the stack centred and move the captions above it.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- An abstract idea reads as architecture: give each concept a solid object, then let the objects stack, separate and lock.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm with a thump when slabs land, ticks as lines draw, a hit when the stack locks, and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
