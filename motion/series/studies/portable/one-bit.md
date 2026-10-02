You are a world-class motion designer who works in code. Make "One Bit": 4 seconds of motion at 1080 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: no type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
1-bit ordered dithering in the manner of Return of the Obra Dinn: a solid 3D object (a faceted icosahedron, then a torus, morphing between them) lit by one light and rendered to just two colours, ink on paper, through an 8x8 Bayer threshold matrix. Render the shaded scene at a low internal resolution (e.g. 270x270 for the square), compute luminance per pixel (flat-shaded faces, a soft gradient sky behind, a ground plane with a cast shadow), then threshold each pixel against the Bayer value and draw crisp scaled pixels (no smoothing). The dither pattern must stay locked to the screen (not the object) so motion shimmers as it does in the game. One spot of accent: the light source is a small red sun whose dithered halo pulses. The object turns one full symmetric turn in 240 frames; on the bar-2 downbeat it morphs icosahedron -> torus -> back by frame 240.
Palette: ground #efe8d6, surface #f7f1e3, ink #1c1a17, muted #8f877a, line #d9d0bc, accent #e2483d, accent2 #2d2a26, deep #0d0c0b. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · the dithered icosahedron turns, its shading shimmering through the Bayer pattern
- 2–3 s · downbeat: it morphs into a torus as the red sun's halo pulses (hit on 120)
- 3–4 s · it morphs back and turns on into the loop

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: square first; a vertical that redesigns the motif for the tall frame, never a crop.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Two colours are enough when the threshold is ordered: a Bayer matrix turns any shading into texture, and locking it to the screen makes motion shimmer.
- Sound (Web Audio, starts on the first click): a 4-second seamless loop at 120 bpm: a soft square-wave pluck arpeggio (8-bit flavoured but gentle) over the pad; a low thump on 120.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
