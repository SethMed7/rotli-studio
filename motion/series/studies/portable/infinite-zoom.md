You are a world-class motion designer who works in code. Make "Infinite Zoom": 20 seconds of motion at 1080 × 1920, 30 fps, a seamless loop, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- It loops: the last frame must flow into the first with no jump. End every animated value where it began, and give every repeating motion a period that divides the loop's length.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (600) for captions, Instrument Serif Italic for one key word per caption, JetBrains Mono for the small corner tag, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
An endless Droste zoom: the camera pushes forever into five nested flat illustrations, each hidden in a detail of the last, and the fifth contains the first. Author each scene in its own unit square with the doorway to the next scene (its portal) exactly centred and 1/6 of its side. With five levels of 4 seconds each, the phase p = (t mod 20) / 4, the level is floor(p) and f is its fraction; draw the current scene as a square of side C·6^f centred on the frame (C = the larger frame side), the next scene inside its portal at a sixth of that, the next at a thirty-sixth and so on, each clipped to its portal, until a scene would be under 4 px (fade scenes in between 4 and 8 px so nothing pops). The zoom scale is exponential in time, so its speed is constant; do not ease each level. At the hand-off the portal exactly covers the frame, so the next scene takes over with identical pixels, and the fifth scene's portal holds the first. Scenes, flat vector on a warm off-white ground with deep plum silhouettes, a violet accent and an orange highlight: a dusk city whose one lit window is the portal; that window with a warm room and a desk; a top-down desk flat-lay with a steaming mug and a phone at the centre; the phone's week calendar whose glowing centre cell is the portal; the cell itself, a violet event chip reading 'Everyone free' with a tiny skyline in its middle that is the city. Ambient motion inside scenes repeats on periods that divide the loop. Captions sit on a flat white rounded plate, a bold sans line with one italic serif key word, crossfading on each hand-off; a small mono tag with the product name stays in a corner.
Palette: ground #fbf6ee, surface #ffffff, ink #2b1330, muted #8a7688, line #eadfe6, accent #7a3cff, accent2 #ff9f1c, deep #2b1330. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–4 s · the city: the camera already pushing into the dusk skyline toward the one lit window at the centre tower; caption 'Somewhere in the *city*,' (key word italic)
- 4–8 s · the window fills the frame and the room behind it opens; the lamp flickers once; the push continues into the desk; caption 'behind one *window*,'
- 8–12 s · the desk flat-lay: steam curls off the mug, the phone at the centre grows; caption 'on one *desk*,'
- 12–16 s · the phone: the Oriel week fills the frame, booked blocks all around, the centre cell pulses violet as it nears; caption 'Oriel looks at the *week*'
- 16–20 s · the cell: the violet chip 'Everyone free' fills the frame and its tiny skyline grows into the city, the loop closes on frame 0; caption 'and finds the hour for *everyone*.'

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: keep the zoom identical: every scene is a square that covers the frame, composed so its key content sits in the part both shapes show; only the caption plate moves (low and centred in the tall frame, lower left in the wide one).

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- An infinite zoom is arithmetic, not animation: centre every portal, scale by a constant ratio per level so the speed never changes, and make the last scene contain the first, and the push never ends.
- Sound (Web Audio, starts on the first click): a soft looping pad at 120 bpm, a gentle whoosh ending on every hand-off, a tick as each caption's key word lands, and no sign-off because it loops.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
