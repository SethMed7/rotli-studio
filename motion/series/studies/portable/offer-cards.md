You are a world-class motion designer who works in code. Make "Offer Cards": 21 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (400, 600, 800) for cards, Instrument Serif and Instrument Serif Italic for captions, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A social-native offer reel: dark plan cards (price, three included items, a button) fan in, compare side by side, and one lifts forward; a plus sign joins a setup fee and a monthly fee; the reel ends on a big 'Comment "hour"' call to action with a pulsing reply bubble. Rich card shadows, confident type. All prices are invented. Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #fbf6ee, surface #ffffff, ink #2b1330, muted #8a7688, line #eadfe6, accent #7a3cff, accent2 #ff9f1c, deep #2b1330. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · hook: caption 'How do you get paid?' in a ladder
- 2–7 s · two plan cards fan in: 'Solo · $0' and 'Team · $8 / seat'; features tick on
- 7–12 s · the Team card lifts forward; a '+' joins a small 'setup · $0' card; caption 'no setup, cancel anytime'
- 12–16 s · a third card flips in: 'Pay per booking · $0.50' for occasional users
- 16–19 s · all cards stack and slide away; a reply bubble types 'hour'
- 19–21 s · CTA: 'Comment "hour" for the guide' with the bubble pulsing; 'Oriel · a fictional product' small

SIZES
- vertical: 1080 × 1920.
- Add ?size=portrait for 1080 × 1350. Design that layout for its shape: fit two cards side by side at a smaller scale and keep the call to action in the lower third.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- An offer is a stack of objects the viewer can compare: animate the comparison, then end on one clear action.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm with a slide whoosh for each card, ticks on features and a hit on the call to action.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
