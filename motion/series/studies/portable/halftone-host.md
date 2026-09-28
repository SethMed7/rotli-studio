You are a world-class motion designer who works in code. Make "Halftone Host": 20 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (600) for headlines and body, Instrument Serif Italic for one key word per headline and the stamp, JetBrains Mono for the chrome, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
An editorial explainer hosted by an original halftone character: a round alarm clock with two bells, a hammer, stubby feet, blinking eyes and dial hands that show its mood. Model it as shaded 3D forms (spheres and cylinders lit from the top left, computed per point), draw that tone into an offscreen canvas, then paint ink dots on a rotated grid whose radius follows the tone, so it reads like a newspaper photo of a toy. Everything else is flat and crisp: an off-white page, ink type, one accent colour for a full-bleed scene flip, the key word and the call to action. Headlines are tight bold sans with one larger italic serif key word underlined by a hand-drawn stroke that draws itself. Small mono chrome on every scene: the section top-left ('// 01 — hook') and a running timecode top-right. Cuts are hard and the host carries across them. Scenes: the hook with a 'psst…' bubble, a full-bleed accent flip with three product cards holding small halftone objects, a phone mockup that draws itself, a one-second word slam on black with horizontal motion blur, a bento of six live widgets that a hand-drawn circle sweeps round before a tilted 'Handled.' stamp lands, a black 'You decide. We arrange.' scene, and a serif wordmark end card with the host peeking over it.
Palette: ground #f2f1ed, surface #ffffff, ink #121212, muted #8b8a86, line #dcdad4, accent #ff3d2e, accent2 #2f6bff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3 s · // 01 — hook: the clock host hops in from the right on the off-white page and settles, blinking; a small speech bubble 'psst…' pops beside it and goes; the headline builds on the left: 'Got a week that' then 'won't *fit*?' with the italic word underlined by a hand stroke
- 3–6 s · // 02 — problem: a hard flip to full-bleed accent; the host sits bottom-left, its dial hands drooping; three white cards pop in one per beat, each a halftone object with a mono tag and a line: 'Meetings · 14 this week', 'Focus · 2 hours left', 'Travel · Thu to Mon'
- 6–9 s · // 03 — product: back to white; a phone outline draws itself on the right and fills with a simple Oriel screen (a request field, three suggested slots); the headline builds: 'Oriel turns it into' / 'a plan' / 'in *minutes*.'; the host peeks from behind the phone
- 9–10 s · a one-second slam on black: 'One sentence.' in huge white type slides in with heavy horizontal motion blur and snaps sharp
- 10–15 s · // 04 — handled: a 3×2 bento of light cards on a faint grid, each alive: the request typing ('find 45 min with Ana and Kai'); the host in a tile blinking; a Mon–Fri availability row filling dot by dot; 'Conflicts 3 → 0' counting down; 'Invites 0/4 → 4/4' with ticks; a small bar chart 'Hours back' rising; then a hand-drawn accent circle sweeps round the whole bento and a tilted stamp 'Handled.' (serif italic in an accent outline box) slams in
- 15–18 s · // 05 — flow: a hard flip to black; 'You *decide*.' builds large on the left in off-white, then 'We arrange.' beneath in muted grey; the host stands on the right, its dial hands now pointing up, bells ringing with small motion lines
- 18–20 s · end card on the off-white page: the wordmark 'Oriel' in huge Instrument Serif with the host peeking over its top edge and winking; the line 'The calendar that meets you *halfway*.'; an accent pill 'Start free' beside 'oriel.example' in mono; a mono footer 'free to start · any calendar · no install'

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: headline in the top third with the host below, the cards in one column, the phone in the lower half, the bento 2×3, the wordmark centred with the pill beneath.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A texture can be the brand: rendering the host and every object through one dot screen makes a cheap 3D look like print, and mono chrome with a running timecode makes a short piece read as edited, not generated.
- Sound (Web Audio, starts on the first click): a driving loop at 120 bpm whose drums enter at the first flip, a hit on each hard flip and on the stamp, a whoosh into the blurred slam, soft ticks for bubbles, cards, typed letters and filling dots, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
