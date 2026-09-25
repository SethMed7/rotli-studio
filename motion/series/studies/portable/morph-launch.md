You are a world-class motion designer who works in code. Make "Morph Launch": 24 seconds of motion at 1920 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (400 and 600) for all type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A product launch in one continuous take where nothing cuts and everything morphs into the next thing. A soft mesh gradient (four large blurred colour blobs drifting slowly) sits behind one centred line of light type whose words blur in, settle, and blur out as the next words take their place. Then a morph chain: the caption becomes a frosted glass prompt field, the field squeezes to a pill, then a dot, the dot drops onto a white page and becomes a product mark with its name typing in, a dark pill wraps them like a button, and the button grows into a dark app window. Inside, a depth-of-field camera racks focus down a form as it fills, toggles flip on one per beat, connections turn 'connected'. An app tile pops out in 3D and unfolds into a calendar panel that settles flat. Results arrive as notification cards stacking on springs. Depth comes from blur and soft shadow, never outlines; blur by drawing into a small offscreen canvas and scaling it back up (Safari has no ctx.filter).
Palette: ground #f6d9e4, surface #ffffff, ink #171325, muted #7c7390, line #e9dfee, accent #ff6a3d, accent2 #ffc26b, deep #3b1e78. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3 s · hook: mesh gradient drifting; a huge 'find' blurs in letter by letter, then shrinks into one small centred line 'find a free hour'; its words blur out to 'with one sentence', then 'using Oriel' with the mark after the name
- 3–6 s · the caption line swells into a frosted glass prompt field; a sentence types in ('Oriel, find an hour for Ana, Ben and Kai next week'); the round send button pulses and is pressed
- 6–9 s · the one-take morph chain: field squeezes to a pill, pill to a dot; the dot drops onto a white page and becomes the mark; 'Scheduler' types in beside it; a dark pill wraps mark and word like a button, and the button grows to fill the frame as a dark app window
- 9–15 s · inside the window, depth of field: focus racks down the form as Name and Instructions fill in; four capability tiles (Read calendars, Hold rooms, Draft agendas, Send invites) flip their toggles on, one per beat; two connection rows (Calendar, Chat) turn to an accent 'connected'; the 'Start' button is pressed
- 15–18 s · a calendar app tile pops out of the window in 3D (tilted, shadowed, slowly turning), fills the centre, then unfolds into a white week panel that flies in at an angle and settles flat with Thursday 3:00 glowing free
- 18–21.5 s · back on the gradient: notification cards stack in on springs ('Found · Thu 3:00 · 4 of 4 free', 'Room 4B held', 'Agenda drafted', 'Invites sent'); the oldest scroll up under a blurred edge
- 21.5–24 s · end card: 'find a free hour' with an empty glass pill between the words that fills with the mark; the words blur to 'using Oriel' around the same pill; a slow drift holds

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: the caption wraps to two lines, the prompt field and app window are phone-width and taller, the tiles become one column.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A one-take morph chain keeps attention without cuts: each shape becomes the next, so the eye never has to find its place again; depth of field tells the viewer where to read.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm with quiet key-ticks for typing, a soft whoosh on every morph, clicks on toggles and buttons, a gentle chime per notification, a warm final hit.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
