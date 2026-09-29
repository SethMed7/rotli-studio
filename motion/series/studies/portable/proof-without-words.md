You are a world-class motion designer who works in code. Make "Proof Without Words": 32 seconds of motion at 1920 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif Italic for the variables, Inter (400) for numbers, operators and the few words, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A maths explainer where shapes do the arguing, on a dark slate ground with crisp vector geometry and no texture. Each quantity keeps one colour for the whole film (side a and its square blue, side b and its square pink, the hypotenuse c and its square yellow); shapes are a 4 px stroke plus a 45% fill of the same colour. Shapes and symbols write on (the outline traces, then the fill fades in), move by interpolating position and rotation on one smooth S-curve, one motion per beat with small staggers, copy themselves as ghost outlines that slide away, and flash-scale to point at something. Equations assemble term by term, each term flying out of the shape it names, and rearrange by sliding matching terms past each other on arcs. The proof: four copies of a 3:4:5 right triangle in a square of side a + b leave a hole of area c²; rearranged in the same square they leave holes of area a² and b², so a² + b² = c². Then the legs stretch and the figure re-solves live, a unit-cell check counts 9 + 16 = 25, and one quiet line notes the theorem was known to the Babylonians about 1,000 years before Pythagoras.
Palette: ground #1a1f26, surface #232a33, ink #eef1f4, muted #95a0ae, line #323b47, accent #f4c14f, accent2 #57b4ec, s1 #ee7ea6, deep #11151a. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (90 bpm, a beat every 0.67 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–4 s · the triangle: a right triangle writes itself on in the centre (outline, then fill), its right-angle square appears, then each side lights in its colour and its label writes beside it: 'a' (blue), 'b' (pink), 'c' (yellow) on the hypotenuse; above it, small and muted, 'a right triangle' writes and fades
- 4–8 s · the claim: squares grow outward from each side (blue on a, pink on b, yellow on c), each labelled 'a²', 'b²', 'c²' at its centre; the labels lift off one at a time and assemble below the figure as 'a² + b² = c²', with a small '?' written above the '='; the '?' pulses once
- 8–13.3 s · setup: the side squares fade to ghosts and go; the triangle is copied three times (ghost outlines peel off and fill); an ink square outline of side a + b writes on, with muted braces reading 'a' and 'b' along each edge; the four triangles fly in one per beat, each rotating 90° more than the last, and land in the four corners; the tilted square left in the middle fills yellow and gets its label 'c²'
- 13.3–18.7 s · rearrange: the whole square slides left and a copy peels off to the right; on the right copy the four triangles slide and rotate, two at a time, into two a × b rectangles in opposite corners; the two empty squares they leave fill blue ('a²') and pink ('b²'); under both squares a muted brace reads 'a + b' and the small line 'same square · same four triangles' writes between them
- 18.7–24 s · so: the triangles in both squares dim to ghosts; the yellow hole on the left and the blue and pink holes on the right indicate (scale and flash); their labels lift out and assemble centred below as 'c² = a² + b²', then the two sides swap on arcs into 'a² + b² = c²'; for the last two beats the legs a and b stretch and shrink (the triangle gets taller, then wider) and both figures re-solve live, the holes changing shape while the equation stays true
- 24–28 s · a check with numbers: the figures clear back to the 3:4:5 triangle with its three squares, now ruled into unit cells; the cells count in fast (9 blue, 16 pink, 25 yellow) with small counters; the equation assembles term by term as '3² + 4² = 5²' and transforms into '9 + 16 = 25'
- 28–32 s · end: the triangle alone with 'a² + b² = c²' beneath it; one muted line writes under it: 'Named for Pythagoras. Known to the Babylonians about 1,000 years earlier.'; a small yellow square (the end-of-proof mark) writes on at the right of the equation and indicates once; a slow drift holds

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: the figure in the upper half with equations below; the two big squares stacked vertically with the comparison line between them; the unit-cell squares stacked by size.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Move the shapes and the proof explains itself: when each quantity keeps one colour and every symbol in the equation flies out of a shape on screen, the viewer sees why it is true, not just that it is.
- Sound (Web Audio, starts on the first click): a soft pad-and-pluck loop at 90 bpm, a tick per landing term and triangle, whooshes on the copy and the side swap, hits when the equation completes and on 9 + 16 = 25, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The topic is real: keep every fact exactly as written above (it is sourced), hedged the way it is hedged. Build it exactly as written first; afterwards, swap in your own topic, colours and words, and source your own facts.
