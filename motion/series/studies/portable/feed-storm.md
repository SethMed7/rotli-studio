You are a world-class motion designer who works in code. Make "Feed Storm": 23 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter for the UI, Instrument Serif and Instrument Serif Italic for captions, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A notification feed as weather: message bubbles and pings rain in and stack into a scrolling column, faster and faster with motion blur; then a cursor sorts them: most fold away, three are grouped into one decision card. Clean UI, one alarm colour, one calm colour. Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #e8ebef, surface #ffffff, ink #16202a, muted #6d7985, line #d2d8df, accent #ff2e63, accent2 #08b6b3, deep #16202a. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · hook: a single ping drops in: 'can we move it?'; caption '47 messages'
- 2–8 s · pings rain in and stack ('what time works?', 'I'm out Tue', 'sorry, conflict'), the column scrolling faster with motion blur; a counter climbs to 47
- 8–13 s · everything freezes; a cursor sweeps: 44 bubbles fold away into a thin stack labelled 'handled'
- 13–18 s · the remaining 3 slide together into one card: 'Decide: Thu 15:00 or Fri 10:00?' with two buttons
- 18–21 s · the cursor taps 'Thu 15:00'; the card turns calm; caption 'one decision'
- 21–23 s · sign-off: 'Oriel' with the counter now at 1

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: run the feed on the left third and put the decision card and captions on the right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Overwhelm is speed plus density; relief is the same objects slowing down and collapsing into one.
- Sound (Web Audio, starts on the first click): a driving loop at 120 bpm with pops for each ping (thinned as they speed up), a whoosh on the sweep, a hit on the decision and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
