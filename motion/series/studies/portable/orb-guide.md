You are a world-class motion designer who works in code. Make "Orb Guide": 26 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (400 and 600) for all type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A quiet launch film on a warm off-white ground where one small glossy orb (the accent colour as a sphere: a radial gradient from a pale highlight at the upper left to the full accent at the rim) guides the eye through every scene. A hairline construction grid (a few long 1 px lines with tiny dots at the intersections) frames the subject as a square cell that tightens and widens on springs. Type is small, calm and centred. Scenes: the orb swells and morphs into a rounded picture tile inside the cell, then shrinks into a logo mark; the name types beside the mark with the next letter pre-shown in grey; an outlined pill draws itself and types a small-caps label; a stack of picture tiles bursts into a loose ring around a centred line and drifts in parallax; the orb flies on arcs leaving a thin fading comet line past typed sentences; a sentence ends in a slot where the orb lands as a checkbox and a vertical word roller changes the last word one beat at a time; an app window grows in the grid cell; the mark returns. Picture tiles are flat drawn scenes (a moon over hills, a mug, a clock), never photos or faces.
Palette: ground #f3f1ee, surface #ffffff, ink #15151a, muted #8a8791, line #e2dfe8, accent #5146e5, accent2 #e5e2ff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3 s · the orb is born: the hairline grid settles from wide to a centred square cell; a tiny orb appears at the centre and swells; the cell tightens around it; the orb morphs into a rounded square picture tile (the moon over hills) that fills the cell, which pushes in, then shrinks away into the Oriel mark
- 3–5 s · the lockup: the grid fades; the Oriel mark sits alone; 'Oriel' types beside it with the next letter shown grey before it turns ink; the lockup drifts slightly
- 5–7 s · the pill: the lockup clears; an empty outlined pill draws itself from the centre; 'INTRODUCING ORIEL TEAMS' types inside in small caps; the pill shrinks to a point
- 7–12 s · the tile ring: one small tile appears, becomes a stack of three, then bursts into nine tiles in a loose ring; 'From ask to booked' types at the centre (next letter grey); the tiles drift in parallax at different depths (far ones smaller and slower); on the last beat they gather back into a stack at the centre
- 12–14 s · the stack becomes the orb again, which breathes large and settles small
- 14–18 s · comet lines: 'Ask. Pick. Get it booked.' types while the orb flies in on an arc from the lower left, its comet line sweeping past the words, and lifts away to the upper right; then 'With everyone, from invite to calendar.' types while the orb crosses again the other way
- 18–23 s · the roller: 'Plan' types, then grows to 'Plan your own'; the orb drops in on a short arc and lands where the slot begins, becoming the accent checkbox with a white tick drawn on; the word roller changes one word per beat: 'Polls', 'Rotations', 'Office hours', 'And more'
- 23–25 s · the product: the grid returns with a wide landscape cell; an Oriel app window (a flat week grid with a few booked slots in accent2 and one in the accent, a small sidebar) scales up to fill the cell and the cell widens with it, one slot pulsing as it books
- 25–26 s · end: the window shrinks into the mark; 'Oriel' types beside it; hold with a slow push-in

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: the grid cell sits in the upper middle, the tile ring becomes a tall oval, long lines break in two, the roller stacks the sentence over the checkbox and word, and the orb's arcs run top to bottom.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- One small moving element can carry a whole film: when the orb connects every scene (it becomes the picture, the mark, the comet and the checkbox), cuts disappear and the eye always knows where to look.
- Sound (Web Audio, starts on the first click): a soft sparse loop at 120 bpm with a gentle kick from the tile ring, tiny ticks as letters type, whooshes on each orb flight, a pop when the orb becomes the checkbox, a tick per roller word and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
