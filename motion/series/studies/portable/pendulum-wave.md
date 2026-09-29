You are a world-class motion designer who works in code. Make "Pendulum Wave": 32 seconds of motion at 1080 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (400 and 600) for captions, JetBrains Mono for the formula, the pattern pills and the timecode, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A calm physics-lab demonstration on a near-black ground. Fifteen uncoupled pendulums hang from one bar; pendulum k makes 24 + k full swings in a 32-second cycle, so its angle is A·cos(2π(24+k)t/32) with A = 12°, and its length follows from T = 2π√(L/g) (about 44 cm down to about 18 cm, drawn to scale). Everything is a closed-form function of time, so the last frame equals the first and the video loops exactly. Main view: a three-quarter view looking along the bar from one end and slightly below, with simple perspective; thin strings, shaded sphere bobs, one bob in the accent colour to follow, small soft floor shadows under the bobs. Second view: a flat strip with the fifteen bobs as dots in a row, their displacement drawn vertically and joined by a line, so waves, the zig-zag at half time and the clean groups at a quarter, a third, a half, two thirds and three quarters of the cycle read as shapes. A thin progress ring and a mono timecode show where you are in the cycle; a small mono pill names each pattern exactly on its frame. Captions are short, left-aligned, bold sans with one quiet line under them; a small card shows T = 2π√(L/g) with 'four times the length, twice the time'. No glow, no blur.
Palette: ground #101114, surface #1a1c21, ink #eceef2, muted #7d828c, line #2a2d34, accent #ff5a36, accent2 #3ddc97. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–4 s · in step (this is also the state the loop returns to): all fifteen pendulums swing together so they read as one; the trace is a flat line swinging up and down as a whole; the headline 'Fifteen pendulums.' with the muted line 'Each one swings on its own.' is already on screen at frame 0 and fades up and out by frame 210; the progress ring is at its start
- 4–7.5 s · the rule: they begin to drift apart and a gentle travelling wave (a snake) runs along the row; the formula card slides in from the side on a spring: 'T = 2π√(L/g)' and 'four times the length, twice the time'; the headline 'Shorter string, faster swing.'
- 7.5–10 s · the tuning: the trace becomes a tighter wave and at frame 480 falls into four clean groups; the pill '¼ · four groups' pops exactly at 480; the headline 'Tuned to fit one more swing' with the muted line 'The longest: 24 swings in 32 s. The shortest: 38.'
- 10–14.5 s · at frame 640 the row splits into three groups ('⅓ · three groups' pops on that frame); then the motion looks tangled; the headline 'It only looks random.' with the muted line 'Every swing is set by a length.'
- 14.5–17.5 s · half time: at frame 960 the pendulums form two perfectly opposite rows, the trace a sharp zig-zag; the pill '½ · two rows' pops; no headline, only a slow push of 4% on the main view so the zig-zag is the picture
- 17.5–23.5 s · the way back: three groups again at frame 1280 ('⅔ · three groups'); the headline 'Same lengths, same dance.' with the muted line 'Small swings, no friction: an ideal model.'; the formula card returns briefly beside the trace
- 23.5–28 s · four groups at frame 1440 ('¾ · four groups'); the waves lengthen as the phases close up; the headline 'Every one finishes whole swings…'
- 28–32 s · realign: '…so at 32 s they line up again.' holds until frame 1830 and fades; the trace flattens into one line; the progress ring completes; from frame 1860 the opening headline 'Fifteen pendulums.' / 'Each one swings on its own.' fades back in so that frame 1920 is exactly frame 0

SIZES
- square: 1080 × 1080.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: square: captions at the top, the pendulums in the middle, the dot-trace strip full width below; landscape: pendulums on the left 60%, and captions, formula card, trace and progress ring stacked on the right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A loop can be exact rather than faked: when every moving part is a closed-form function whose periods all divide the length of the piece, the last frame is the first frame and no cross-fade is needed.
- Sound (Web Audio, starts on the first click): a soft looping bed at 120 bpm whose length is exactly four turns of its chord cycle, no sign-off; a whoosh that lands on the loop point; soft ticks on each named pattern; and a very quiet pentatonic pluck from each pendulum at each of its turning points, so the phasing is audible and everything chimes together when they align.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The topic is real: keep every fact exactly as written above (it is sourced), hedged the way it is hedged. Build it exactly as written first; afterwards, swap in your own topic, colours and words, and source your own facts.
