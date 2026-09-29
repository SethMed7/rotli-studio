You are a world-class motion designer who works in code. Make "Split-Flap": 24 seconds of motion at 1920 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (600) for the flap characters and printed header, JetBrains Mono for the web address, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A mechanical departures board for meetings, filling the frame, on a near-black housing. Each character is a flap cell: a dark grey rounded rectangle split across the middle by a thin gap with two hinge pins, an off-white bold sans character centred on it, drawn as two clipped halves. Every cell has the same fixed drum (space, A–Z, 0–9, colon, dot, dash) and only moves forward through it, one flap at a time, at about 20 flaps per second, until it reaches its target; its state is a pure function of time from its start character, target and start time. A flip: the upper flap with the old character's top half falls toward the viewer (scaled vertically by the cosine of its angle and darkened), revealing the new top half; then the lower flap with the new bottom half unfolds down from the hinge and lands with a tiny overshoot. Because cells start from different letters, a row settles letter by letter at uneven moments; keep that. Rows cascade left to right. Status flaps are coloured: amber BOARDING with a blinking lamp, red DELAYED, green BOOKED. Scenes: the board powers on, six meetings settle, four flip to DELAYED, a message row says the assistant is finding a time while new times flip in, every status cascades to BOOKED, then the board clears to a two-row sign-off.
Palette: ground #121315, surface #202226, ink #f3f0e6, muted #8f8c85, line #0a0a0b, accent #ffb627, accent2 #ff5d4f, s1 #5fd88d, deep #0a0a0b. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · power on: the board is all blank flaps; the header strip fades up; the clock cells rattle from blank to '09:41'; the first row flips 'DEPARTURES' across its cells and then clears again
- 2–8 s · the day boards: six rows settle one every two beats, each row rattling through the drum and landing letter by letter: '09:30  STANDUP       A1  BOARDING', '10:00  DESIGN CRIT   B4  ON TIME', '11:15  1:1 WITH ANA  A2  ON TIME', '13:00  ROADMAP       C1  ON TIME', '14:30  HIRING SYNC   B2  ON TIME', '16:00  RETRO         A3  ON TIME'; BOARDING turns amber and its lamp blinks
- 8–12 s · the trouble: the clock flips to '09:42'; four statuses re-flip to red 'DELAYED' one per beat down the board (rows 2, 3, 4 and 6); a printed ticker line under the board types 'Four meetings need a new time.'
- 12–16 s · Oriel works: a message row appears under the board and flips 'ORIEL IS FINDING A TIME' with a trailing '...' that cycles; the TIME cells of the delayed rows re-flip, one row per beat, to new times ('10:30', '11:45', '13:30', '16:30'); the ticker changes to 'New times found for everyone.'
- 16–20 s · all booked: from the top down, every status flips to green 'BOOKED', a row every half beat, the clatter rising as the cascade runs; the message row flips 'ALL MEETINGS BOOKED'; the whole board holds for a beat with only the clock's colon blinking
- 20–24 s · end: the rows flip back to blank from the top; the middle two rows flip a big message across the board: 'ORIEL' and 'EVERYONE BOOKED'; under the board, printed in Inter: 'Find a time that works for everyone.' and 'oriel.example' in mono; a slow push-in holds

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: a narrower board where each meeting takes two flap rows (time and name, then room and status), header above, ticker and sign-off below.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A mechanism is a timing system: when every change must travel forward through the same drum, the delays themselves (uneven, audible, one letter at a time) become the drama, and a board settling reads as news.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm whose drums enter at the trouble; the clatter as short clicks, one per flap period while anything flips, doubled when many cells flip; hits on the first DELAYED and the last BOOKED, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
