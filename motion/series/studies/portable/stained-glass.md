You are a world-class motion designer who works in code. Make "Stained Glass": 24 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif for the title, Instrument Serif Italic for the element names, JetBrains Mono for the time-of-day chips, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A leaded stained-glass window of the four elements, built and then lit by one day of sun. A tall pointed-arch window in a dark stone wall: a roundel with a sun at the top, then four panels (air, fire, earth, water) inside a border of small alternating red and blue squares. The lead lines are the drawing: each panel is cut into 8–14 panes that make mountains and a tree, waves and a fish, spirals and a bird, flame tongues. Draw every came as a thick dark stroke with a thin lighter highlight along it, small solder blobs at the joints and two iron bars across the window. Each pane is one jewel colour with a slight streak across it, a few tiny bubbles, and on some, dark painted detail lines. Light is one closed-form sun: from dawn to noon to dusk its height scales every pane from dark to full colour, a soft bright band sweeps across the glass, and at night only a faint cool moon glow lights one panel. The stone floor in front receives coloured patches: the panes drawn again through a transform that stretches as the sun gets lower and shears as it moves, added with a lighter blend at low opacity, softened by drawing small and scaling up, with a slow ripple on their edges; they creep, stretch and redden toward dusk. The lead draws itself on first; then panes flood with colour from a point.
Palette: ground #1b1815, surface #2a2521, ink #f4ecdc, muted #a89e8d, line #3c3733, accent #e8a93a, accent2 #2f6fd6, ruby #c8283c, emerald #1f9a5b, azure #5aaee6, violet #7b4fb3, lead #2b2826, stone #3b342d, floor #4a4239, deep #0e0c0a. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (90 bpm, a beat every 0.67 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–4 s · dawn: a dark stone wall with the empty lancet showing a pale dawn sky; the time chip 'dawn'; the lead lines draw themselves from the roundel down, solder blobs popping at the joints, the saddle bars last
- 4–9.3 s · the panes fill, one panel every two beats, each flooding from a seed point with its name landing on the sill: 'earth', 'water', 'air', 'fire'; the roundel's sun fills last
- 9.3–14.7 s · morning to noon: the time chip 'noon'; the sun strikes: the panes brighten from dark to full jewel colour, the bright band sweeps across the glass, coloured patches of light appear on the floor and creep across it
- 14.7–19.3 s · afternoon to dusk: the time chip 'dusk'; the patches stretch long and slide sideways, warming toward red; the fire panel is the last to blaze
- 19.3–22 s · night: the time chip 'night'; the glass dims to deep tones, the floor patches fade, a cool moon glow lights the air panel alone and the lead lines read as a drawing
- 22–24 s · end: the title 'Four Elements' with 'a window, one day' beneath, while the moon glow drifts slowly across the glass

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: re-stack it: in the wide frame the window stands left of centre, the floor becomes a band along the bottom with the light thrown to the right, and the labels and title sit in the right half.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Stained glass is the light, not the picture: build the window from lead and flat jewel colour, then animate only the sun, and the same panes change mood all day and throw their colour onto the floor.
- Sound (Web Audio, starts on the first click): a slow soft pad at 90 bpm with no drums, small ticks as the lead draws and as each panel floods, a warm hit when the sun strikes, whooshes as the day turns, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
