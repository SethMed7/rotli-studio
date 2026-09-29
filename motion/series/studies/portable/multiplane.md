You are a world-class motion designer who works in code. Make "Multiplane": 24 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif for the title, Instrument Serif Italic for the last line, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A papercut diorama shot like a multiplane camera at dusk. Seven flat cut-paper layers stand at real depths (sky at infinity, a far ridge, far pines, a clearing with a small cabin, mid pines, near trunks, ferns) and a camera trucks in through them: each layer is scaled about the frame centre by z / (z − camera depth), so near layers grow fast and slide off the edges while far ones barely move, and the sky and moon never grow. A rack focus moves from the ferns to the trunks to the pines to the cabin; blur each layer by how far it sits from the focal plane, done by drawing it small and scaling it back up, in a few fixed steps. Every layer is one flat colour with a slightly deckled edge and a faint paper-fibre texture, lighter and cooler far away, nearly black up close, and each casts a soft shadow on the layer behind it, which is what makes it read as paper in a box. The sky is flat bands, not a gradient, with a paper moon. Pale moon shafts fall through the pines; fireflies live between the layers so they parallax too, blinking on their own rhythms, their glow drawn as rings of falling opacity. The cabin window lights with warm glow rings and a trapezoid of light across the path; chimney smoke curls. Sparse serif type: a title at the start, one italic line at the end.
Palette: ground #2b2452, surface #3a3168, ink #fbeedd, muted #b7a9d6, line #463d78, accent #ffb54a, accent2 #f2826f, sky #c98aa0, s1 #6a5a9e, s2 #4a3f82, s3 #332b62, s4 #1d1840, deep #100d26. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (100 bpm, a beat every 0.60 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3.6 s · the flats drop in: the sky and paper moon are there; one layer per beat lowers in from above on a spring with a tiny overshoot, its shadow landing with it: far ridge, far pines, the clearing with a dark cabin, mid pines, near trunks, ferns; the title 'The Lamp at Hollow End' fades up in the upper third
- 3.6–8.4 s · the walk begins: the title lifts away; the camera trucks in with its walking bob; the ferns part to both edges and leave frame; focus racks from the ferns to the near trunks; fireflies rise between the layers
- 8.4–13.2 s · through the trees: the near trunks slide past the frame edges; moon shafts fall through the pines; focus racks to the mid pines; the moon and the far ridge hold still while everything near rushes by
- 13.2–18 s · the clearing: the mid pines part like curtains; the dark cabin sits at the end of the path; focus racks to the cabin; fireflies drift toward it
- 18–20.4 s · the lamp: the cabin window fills with warm light, glow rings bloom, a warm trapezoid spills across the path, chimney smoke curls
- 20.4–24 s · arrival: the camera settles and keeps a slow drift; fireflies gather round the window; the last line 'home before dark.' fades up in the upper third

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: taller layers with the cabin in the lower middle, a slight tilt up during the walk so the moon stays in the top third, and the title and last line on two lines in the top safe area.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Depth is a speed, not a size: put flat layers at real distances, move the camera through them, and let the far things refuse to grow; paper shadows and a rack focus do the rest.
- Sound (Web Audio, starts on the first click): a soft pad at 100 bpm with no drums, a tick as each paper layer lands, a whoosh into the walk and another as the pines part, soft ticks for firefly blinks, a warm hit when the window lights, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
