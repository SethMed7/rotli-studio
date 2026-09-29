You are a world-class motion designer who works in code. Make "Radial Year": 30 seconds of motion at 1080 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif for the title, Inter (600) for labels, JetBrains Mono for numbers, axes and the footer, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A radial data visualisation: one year as a circle, 365 spokes whose length is the hours of daylight, for two cities overlaid (Reykjavík at 64° N and Quito near the equator) on a dark night ground. Jan 1 at the top, clockwise. Each spoke starts at an inner ring (about a quarter of the radius, so short winter days stay visible) and its length is proportional to hours up to an outer 24 h ring; draw reference rings at 6, 12, 18 and 24 h (12 h dashed), label them once, and put month ticks and three-letter labels outside. Encode by length only. Reykjavík is amber spokes, Quito one smooth teal closed line. Compute daylight with the sunrise equation (cos H0 = (sin(−0.833°) − sin φ sin δ) / (cos φ cos δ), daylight = 2·H0/15 hours, declination 23.44°·sin(2π(day − 79)/365)), label it approximate, and say every value on screen as a whole number of hours with 'about'. A thin hand sweeps the year and each spoke springs to its length as the hand passes; a readout at the centre shows the month and the hours. Callouts draw on with leader lines. Flat, no glows; a slow push-in in holds; a small footer credits the data as approximate.
Palette: ground #0f1420, surface #182033, ink #f4efe4, muted #9aa3b5, line #2a3348, accent #ffb23e, accent2 #5ad1c8, deep #080b12. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3 s · title: 'A year of daylight' in Instrument Serif with 'two cities, one year' beneath; the empty dial draws: the 24 h ring, the dashed 12 h ring, the month ticks and labels clockwise from the top
- 3–11 s · Reykjavík: the legend 'Reykjavík · 64° N' lands in amber; the hand sweeps once round the year and the amber spokes grow behind it, short in winter, long in summer; the centre readout counts with the hand ('Jan' 'about 4 h' … 'Jun' 'about 21 h' …)
- 11–15 s · the extremes: callouts draw on: '21 Jun · about 21 h of daylight', then '21 Dec · about 4 h'; a smaller line under the June callout: 'twilight lasts all night'
- 15–21 s · Quito: the legend 'Quito · near the equator' lands in teal; the hand sweeps again, faster, and the teal line draws a near-perfect circle on the 12 h ring; callout 'about 12 h, every day of the year'
- 21–26 s · where they meet: the two shapes cross twice; markers pulse at the crossings with the callout '20 Mar & 23 Sep · about 12 h in both'
- 26–30 s · end: the complete chart holds with a slow push-in; the line 'Far north: big swings.' then 'The equator: steady.' lands beneath the title; the footer stays

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: the dial in the upper middle and everything that sat around it as stacked rows below (legends side by side, the current callout as a text row keyed to a small numbered marker on the dial, then the end lines).

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A radial chart earns its circle only when the data is a cycle: put time on the angle, encode the value as length from a fixed inner ring, label the rings, and a year of daylight becomes one shape you can read at a glance.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm whose drums enter when the first sweep starts, a whoosh as each sweep begins, a tick at each month the hand passes, hits for the callouts and the crossings, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The topic is real: keep every fact exactly as written above (it is sourced), hedged the way it is hedged. Build it exactly as written first; afterwards, swap in your own topic, colours and words, and source your own facts.
