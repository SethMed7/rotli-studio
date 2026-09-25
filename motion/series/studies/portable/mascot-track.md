You are a world-class motion designer who works in code. Make "Mascot Track": 24 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif and Instrument Serif Italic for captions, Inter for labels, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A mascot-led metaphor: a soft, rounded robot mascot (two stacked rounded bodies, a visor, a tiny antenna) is a race car without a track; we build its track from concept blocks, then watch it race a top-down road, flicking finished-task chips off to the sides. Soft shadows, rounded forms, a subtle floor. Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #fbf6ee, surface #ffffff, ink #2b1330, muted #8a7688, line #eadfe6, accent #7a3cff, accent2 #ff9f1c, deep #2b1330. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2.5 s · hook: the mascot bounces in and revs; caption 'Your assistant is a race car.'
- 2.5–6.5 s · it lurches forward and stalls in a flat empty desert; caption 'with no track'
- 6.5–11.5 s · four blocks drop and stack into a foundation under it: 'Calendars', 'Preferences', 'Rules', 'History'; caption 'Give it a track.'
- 11.5–17 s · top-down: a road draws itself toward us; the mascot races down it; chips ('invite sent', 'room booked', 'agenda', 'reminder') flick off both sides
- 17–21 s · a person figure appears at a checkpoint; the mascot stops, the person taps 'Yes' on one card; caption 'you keep the decisions that matter'
- 21–24 s · sign-off: mascot waves beside 'Oriel'; caption 'find a time that works for everyone'

SIZES
- vertical: 1080 × 1920.
- Add ?size=square for 1080 × 1080. Design that layout for its shape: frame the mascot larger with captions above it, and crop the road scene tighter.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A mascot plus one metaphor carries a whole explainer: every beat is the metaphor doing something new.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm with a rising rev at the start, thumps as blocks land, whooshes as chips fly off and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
