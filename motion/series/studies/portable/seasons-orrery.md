You are a world-class motion designer who works in code. Make "Seasons Orrery": 34 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (400 and 600) for captions, Instrument Serif Italic for one key word per headline, JetBrains Mono for month labels, tags and the footer, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A science diagram built as a mechanical seasons orrery (a tellurion) on a deep navy ground, drawn like an instrument plate: hairlines and flat fills, no glow. A tabletop orbit seen from above at a shallow angle (a flat ellipse with month ticks), a flat Sun disc on a pillar with a few concentric flat rings instead of a blur, and an arm with small turning gears carrying the Earth. The Earth's axis is a rod tilted 23.4° that stays parallel to itself all the way round; faint ghost Earths at the four season points prove it. The night side is computed from the Sun's direction (the terminator as a projected half-ellipse), with thin latitude ellipses and one marker at 40° N. A beam inset shows a fixed-width torch beam hitting a strip of ground squares at the noon sun angle: a low sun lights more squares with the same beam. A 24-hour day dial shows the day arc from the sunrise equation (cos H = −tan φ · tan δ), with no hour numbers. Captions are short headlines with one key word in an italic serif in the accent colour and a quiet second line. Scenes: the hook (closest to the Sun in early January), the tilt with a protractor, June with the north leaning in and long days, the spreading beam, December with the south's turn, the equinoxes, and 'Seasons come from the tilt, not the distance.'
Palette: ground #070b24, surface #101740, ink #e8ecff, muted #7c86b8, line #1d275e, accent #ff5a3c, accent2 #6f8cff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–4 s · hook: the orrery settles out of the dark (the ring draws on, the Sun's rings pop, the arm swings in); headline 'Is summer when we're *closest* to the Sun?'; the arm sweeps to early January and a small accent tag reads 'closest: early January'; the second line lands: 'No. We're closest in early January.'
- 4–8.5 s · the tilt: the camera pushes toward the Earth; a protractor arc draws between the axis rod and the upright, labelled '23.4°'; headline 'Earth is *tilted* about 23.4°.'; then the camera pulls back as the arm makes a quick half turn and the four ghost Earths appear with parallel rods: 'And the tilt points the same way all year.'
- 8.5–15 s · June: the arm eases to June; the north end of the rod leans toward the Sun; the 40° N marker sits in daylight longer and the day dial's day arc grows past half; headline 'June: the north leans *toward* the Sun.' with the second line 'Longer days, more direct light: northern summer.'
- 15–21 s · the beam: the beam inset takes over half the frame; the same fixed-width beam tilts from the June noon angle to the December noon angle and its lit patch stretches across more squares (the counter climbs); headline 'Low sun spreads the *same* light over more ground.' with the second line 'So each patch gets less.'
- 21–27 s · December: the orbit arm carries the Earth half way round (a whoosh); the rod has not turned, so now the south end leans toward the Sun; the day dial shrinks under half for the 40° N marker; headline 'December: the *south* gets its turn.' with the second line 'Short days up north, summer down south.'
- 27–31 s · equinoxes: the arm pauses at March and then at September; a thin accent line from the Sun meets the Earth at the equator; the day dial sits near half and half; headline 'March and September: the Sun is overhead at the equator.'
- 31–34 s · end card: the arm keeps turning slowly behind; headline 'Seasons come from the *tilt*,' / 'not the distance.'; a small mono line 'the distance changes by only about 3% over a year'; mono footer 'not to scale · sizes and distances exaggerated'; slow push-in holds

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: vertical: captions in the top third, a narrower orbit in the middle, the beam inset and day dial side by side below (the inset takes the whole lower half during the beam scene).

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A mechanical diagram teaches by what it holds still: an orrery whose axis never turns makes the cause of the seasons visible without a word, and a fixed-width beam turns 'direct light' into something you can count.
- Sound (Web Audio, starts on the first click): a soft thoughtful loop at 120 bpm with no drums, a hit on the hook's answer, whooshes as the arm arrives at each season, soft ticks for labels and counters, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The topic is real: keep every fact exactly as written above (it is sourced), hedged the way it is hedged. Build it exactly as written first; afterwards, swap in your own topic, colours and words, and source your own facts.
