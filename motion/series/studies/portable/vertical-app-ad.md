You are a world-class motion designer who works in code. Make "Vertical App Ad": 30 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif and Instrument Serif Italic for captions, Inter for UI, JetBrains Mono for small labels, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Floating UI on a soft stone ground: white cards with large soft shadows, a phone mockup, a deep-green countdown stack and faint concentric rings. Serif captions arrive word by word in mixed sizes, one key word in the accent green italic. No gradients: depth comes from shadow only.
Palette: ground #ebeae4, surface #ffffff, ink #1b2a22, muted #7c8680, line #d6d8d2, accent #2f8f5b, accent2 #cfe8d8, deep #153a2a. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (100 bpm, a beat every 0.60 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2.4 s · hook: 'Finding one hour' fills the screen in the serif, 'one hour' in accent italic; small calendar cards orbit on concentric rings
- 2.4–7.2 s · problem: a phone shows a group chat stacking up ('Tuesday?', 'Can't. Wed?', 'Thu after 3?' …); a counter ticks up to 12; caption: 'takes twelve messages.'
- 7.2–12 s · turn: a 3-2-1 stack of deep-green cards counts down and lifts away to reveal Oriel's app icon; a prompt card types 'Find an hour with Ana, Ben and Kai next week.'
- 12–19.2 s · work: three rows of availability (Mon–Fri) slide in as floating cards; the overlap lights up; a slot card pops: 'Thu 3:00–4:00'. Captions: 'It reads three calendars,' 'finds the overlap,' 'and holds the time.'
- 19.2–24 s · done: an invite card flies out; three avatars get a check one by one; a toast says 'Everyone's in.'
- 24–27.6 s · payoff: kinetic serif 'One message.' then 'Not twelve.' in mixed sizes, the second line in the accent
- 27.6–30 s · end card: the Oriel mark + wordmark, 'oriel.example' and a small line 'A fictional product, drawn in code.'

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: the phone and cards take the left half and the captions the right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Captions that arrive with the rhythm carry a silent autoplay. UI as the set: cards with shadow read as depth without any 3D.
- Sound (Web Audio, starts on the first click): a soft four-chord loop at 100 bpm with ticks on every chat bubble and card landing, a rising swell into the countdown and the payoff, a hit when the slot appears, and a bell sign-off under the end card.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
