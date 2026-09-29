You are a world-class motion designer who works in code. Make "Title Sequence": 24 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (600 and 800) for credits and the title, Instrument Serif Italic for the lowercase role words, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Opening titles for an invented film, 'The Long Meeting', in the mid-century cut-paper manner. Flat full-bleed colour fields (black, vermilion, mustard, cream) that change on a hard cut on the beat. Every shape is cut paper: polygons with a small random jitter on each vertex so edges look scissor-cut, bars with ends cut at uneven angles, no outlines or gradients, a faint paper speckle. Motion is cut-out animation stepped on twos: bars stab in from the frame edges on the beat and stop dead, and rearrange on each bar of music. One stark symbol per scene: a meeting table from above with chairs, a clock whose minute hand jumps each beat, a raised hand, a row of coffee cups, an agenda of stepped bars that keeps growing. Credits are wide-tracked uppercase sans set on or inside the shapes, with lowercase italic serif role words; every credit is a part of a meeting ('starring THE AGENDA', 'music by HOLD MUSIC', 'directed by NOBODY IN PARTICULAR'). The title arrives letter by letter, each letter a separately cut piece with a slight rotation and baseline offset.
Palette: ground #efe6d2, surface #e3d6bb, ink #15120f, muted #62584a, line #cfc0a0, accent #e6522a, accent2 #f0b323, deep #15120f. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (150 bpm, a beat every 0.40 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3.2 s · the bars: a black field; cream bars stab in from the frame edges one per beat, stop dead, and on each bar of music slide into a new arrangement; a small credit rides in on one bar: 'A CONFERENCE ROOM PICTURE'
- 3.2–6.4 s · the table: hard cut to the cream field; the bars swing and snap into a long meeting table seen from above, chairs landing around it one per beat; along the table: '*starring* THE AGENDA'
- 6.4–9.6 s · the clock: hard cut to the vermilion field; a cut-paper clock face in ink with a cream centre; the minute hand jumps one notch every beat and the hour hand creeps; in the centre: '*and* ANY OTHER BUSINESS'
- 9.6–12.8 s · the hand: hard cut to the mustard field; an ink hand rises from the bottom edge in three stepped moves, waits, then drops; beside it: '*with* THE PROJECTOR *as itself*'
- 12.8–16 s · the cups: hard cut to the black field; cream coffee cups land in a row one per beat, eight of them, then the row slides left and more arrive; on the table line under them: '*screenplay by* THE MINUTES'
- 16–19.2 s · the agenda: hard cut to the cream field; vermilion bars stack into a jagged staircase that keeps growing to the right, a new step on every beat, each step labelled in JetBrains Mono 26 px ('item 1', 'item 2', 'item 7', 'item 12'); across the top step: '*music by* HOLD MUSIC'
- 19.2–22.4 s · the title: hard cut to the vermilion field; the staircase bars fly in and assemble into a frame; the title cuts in letter by letter, one per beat, each letter a separate piece of paper: 'THE LONG MEETING'; a thin ink bar underlines it
- 22.4–24 s · last card: one ink bar slams across the frame and the last credit sits on it: '*directed by* NOBODY IN PARTICULAR'; the minute hand from the clock scene ticks once in the corner; hold with a slight drift

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: vertical: the table runs top to bottom, bars stab in from all four edges, the cups stack in two rows, the agenda grows downward, and the title breaks onto three lines.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A title sequence sells a film's mood before a word of it is spoken: one stark symbol per scene, flat colour fields cut on the beat, and credits that live inside the shapes turn a list of names into a rhythm.
- Sound (Web Audio, starts on the first click): a fast jazzy loop at 150 bpm whose drums enter on the first cut, a hit on every colour cut and on the last bar slam, soft ticks for bars, chairs, cups, clock notches and title letters, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
