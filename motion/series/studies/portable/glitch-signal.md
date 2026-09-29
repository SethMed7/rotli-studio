You are a world-class motion designer who works in code. Make "Glitch Signal": 20 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (800) for the host lines, JetBrains Mono for the station chrome, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A late-night transmission from an invented station that breaks up and recovers. Paint a clean scene into one offscreen canvas each frame (flat colour bars with mono station chrome and a running timecode, or big left-aligned host lines on near-black), then redraw it through a glitch pass whose every random choice comes from a seeded hash of a held frame index (frames grouped in twos to fours, so glitches hold like real ones) scaled by an intensity envelope per scene. The glitch vocabulary: an RGB channel split (the scene drawn through red, green and blue masks with offsets), horizontal slice displacement, scanlines, a rolling VHS tracking band with warped rows and dropout specks, a datamosh smear (a frozen frame cut into 24 px blocks that drift along a smooth motion field while blocks of the new scene pop in), a pixel sort (bright runs in each column sorted into melting streaks, done at quarter resolution), and snow. Scenes: clean bars; 'Good evening. You are receiving us clearly.'; breakup with a stuttering 'clearly'; a freeze and melt; a flat blue 'SIGNAL LOST' card; snow and a channel search while the bars roll and lock; then 'Signal found. We never left.' with faint scanlines.
Palette: ground #08080b, surface #14141a, ink #f2f2ee, muted #8c8c98, line #26262f, accent #ff2a55, accent2 #1ee6ff, s1 #3dff7a, s2 #ffe14d, s3 #2233e0, deep #000000. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3 s · clean signal: the colour bars fill the frame with the station chrome ('RELAY 7', the timecode, 'CH 07') and a lower strip 'NIGHT TRANSMISSION' in mono; one single-frame slice glitch on the downbeat at frame 60, then the bars cut to the host scene
- 3–6 s · the host lines: on a near-black ground, 'Good evening.' builds large, then 'You are receiving us' / 'clearly.'; tiny glitches on the beats (a 2-frame slice offset at 105, 135 and 165), g about 0.1
- 6–10 s · breakup: g ramps from 0.3 to 0.9; the RGB split widens, slices tear across the words, scanlines deepen, and the tracking band starts rolling up the screen; the word 'clearly.' stutters on held frames ('cle', 'cle', 'clearly.') and the lines repeat and jump
- 10–13 s · melt: the picture freezes on the host lines; the colour bars try to return and their motion drags the frozen type in 24 px blocks (datamosh smear); the bright letters melt downward into pixel-sorted streaks; the timecode sticks on one number
- 13–15 s · signal lost: a hard cut to flat blue (s3) with mono 'NO INPUT' top-left and 'SIGNAL LOST' centred in Inter 800; it holds two beats, blinking; then snow fills the frame from the bottom up
- 15–18 s · searching: over the snow, a mono readout 'SEARCHING  CH 05 · 06 · 07' steps a number per beat and a signal meter fills; the bars fade up through the snow, rolling vertically (a lost vertical hold) and settling with a damped bounce at frame 525; g falls to 0.05
- 18–20 s · signal found: clean bars, then the host scene again, calm: 'Signal found.' / 'We never left.'; faint scanlines stay; the timecode runs again; one last one-frame RGB wink at frame 585

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: vertical first: bars full frame, chrome in the safe corners, host lines left-aligned in the middle third; landscape runs the bars full width with the host lines on the left two thirds.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A glitch reads as real when it follows the machine's own logic: channel splits, displaced slices, blocks that smear along motion, scanlines and frames that hold for a beat look broken; random noise sprinkled on top only looks fake.
- Sound (Web Audio, starts on the first click): a driving loop at 120 bpm whose drums enter at the breakup, hits on the glitch spikes and the signal-lost cut, rapid clicks during stutters, a static noise bed while searching, short dropouts when the picture holds, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
