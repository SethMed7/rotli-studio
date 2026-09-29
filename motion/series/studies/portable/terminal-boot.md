You are a world-class motion designer who works in code. Make "Terminal Boot": 24 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: JetBrains Mono (500) for everything, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A green-phosphor CRT terminal that boots and books a meeting from the command line. All text is monospace on a strict character grid (about 80 columns wide) inside a rounded screen within a flat dark bezel. Draw the screen to an offscreen canvas, then: phosphor glow from layered strokes (each text run stroked wide and faint, then narrower, then filled; no blur filters), persistence (scrolling text also drawn two frames back at low opacity), thin dark scanlines every 3 px plus a soft brighter band rolling down, a corner vignette with an optional barrel bulge made by redrawing the screen in thin horizontal strips scaled slightly narrower toward the top and bottom, and a tiny seeded flicker. The cursor is a solid block blinking once per beat; typing has seeded human intervals. Draw box frames, progress-bar fills, busy cells and ticks as strokes and rectangles snapped to the grid rather than relying on the font's box-drawing glyphs. Bright green for highlights and success, amber for a warning, never grey text. Scenes: a CRT power-on (a dot, a line, the raster opening), a boot log with '[ ok ]' lines, a typed command with a filling progress bar, a character-cell week grid whose inverse-video scan column stops on the one slot everyone has free, the booking confirmed line by line, and a large glowing product name with a blinking prompt.
Palette: ground #0b0f0c, surface #131a15, ink #d6ffd9, muted #5f7a63, line #1f2b22, accent #3cff7d, accent2 #ffcc00, deep #0b0f0c. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · power on: a dot flashes, stretches into a line and opens into the green raster; the block cursor blinks twice top-left
- 2–6 s · the boot log scrolls in one line per half-beat with persistence trails: 'ORIEL/TTY 0.9', '[ ok ] calendars mounted: 4', '[ ok ] time zones: 3', '[ ok ] working hours loaded', '[warn] kai: out Friday' (amber), '[ ok ] ready'; then a prompt '~ 

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it to a narrow grid about 48 columns wide: wrap long lines, break the command after its first flag, transpose the week grid (days as rows, people as columns), and stack the end lockup.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A CRT is a stack of cheap passes, not a filter: glow from layered strokes, persistence from a second draw a few frames back, scanlines, a vignette and a flicker, all over a strict character grid, make flat text feel like light on glass.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm whose drums enter when the week grid opens, a thump for the power-on, ticks for log lines and every second keystroke, a hit on Enter and on 'booked', ticks for each acceptance, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.

- 6–11 s · the command types at a human cadence: 'oriel book --everyone --len 45m "design review"' and Enter; output 'reading 4 calendars' with a drawn progress bar filling cell by cell 0% → 100%, then '26 busy blocks · 3 time zones'
- 11–16 s · the character-cell UI: a drawn box titled 'WEEK 14' opens; five day columns 'Mon' to 'Fri' and four rows 'ana', 'kai', 'mo', 'lee' fill with busy cells (dense stripes) and free cells (empty); an inverse-video scan column sweeps across the week and stops on the only column free for all four, which flips to accent with a drawn arrow and 'Thu 14:00 · everyone free'
- 16–20 s · booked: the box closes; lines type in: 'booked  Thu 14:00–14:45  design review', then 'ana ok', 'kai ok', 'mo ok', 'lee ok' one per beat in accent, then '4/4 accepted · invites sent'
- 20–24 s · end: the screen clears to a large glowing 'oriel' (JetBrains Mono, about 120 px) with 'find a time from the command line' and 'oriel.example' beneath, a fresh '~ 

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it to a narrow grid about 48 columns wide: wrap long lines, break the command after its first flag, transpose the week grid (days as rows, people as columns), and stack the end lockup.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A CRT is a stack of cheap passes, not a filter: glow from layered strokes, persistence from a second draw a few frames back, scanlines, a vignette and a flicker, all over a strict character grid, make flat text feel like light on glass.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm whose drums enter when the week grid opens, a thump for the power-on, ticks for log lines and every second keystroke, a hit on Enter and on 'booked', ticks for each acceptance, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
 prompt with the block cursor blinking; the scanline band keeps rolling

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it to a narrow grid about 48 columns wide: wrap long lines, break the command after its first flag, transpose the week grid (days as rows, people as columns), and stack the end lockup.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A CRT is a stack of cheap passes, not a filter: glow from layered strokes, persistence from a second draw a few frames back, scanlines, a vignette and a flicker, all over a strict character grid, make flat text feel like light on glass.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm whose drums enter when the week grid opens, a thump for the power-on, ticks for log lines and every second keystroke, a hit on Enter and on 'booked', ticks for each acceptance, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
