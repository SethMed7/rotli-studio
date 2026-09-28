You are a world-class motion designer who works in code. Make "Five Point Five": 64 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (400 and 800) for the heavy lines, Instrument Serif Italic for the chorus, JetBrains Mono for HUD fragments, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A lyric video where the song is made in code too. Ink-black ground, cream type, one warm clay accent, and a new visual idea for every lyric line, cut on the bar: a prompt field with a blinking caret, a document scanned by a highlight, a wireframe topography warping like a plotted function, a line drawing assembling stroke by stroke, huge numerals rolling like an odometer, streaming code lines, a contact strip under a frame counter, an official form stamped by a rubber stamp. The sung syllable lights in the accent exactly as it is sung. Thin mono HUD fragments at the edges. The song is a syllable table [bar, beat, length, midi, vowel, consonant, text] that drives a backing track and a formant-synthesized voice (glottal pulse through three vowel formant filters, noise bursts for consonants) with Web Audio or an offline buffer, so picture and sound never drift.
Palette: ground #131211, surface #1d1b19, ink #f4f1ea, muted #8b857b, line #2c2926, accent #e07a55, accent2 #efe4d2, deep #0b0a09. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (90 bpm, a beat every 0.67 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–5.3 s · intro (bars 1–2): black; a prompt field fades up with a blinking caret and types 'write a song about you'; the Enter key glyph lights; the voice hums 'five point five' low; HUD fragments flicker on at the edges
- 5.3–10.7 s · verse line 1 (bars 3–4), sung: 'One prompt, one link, a blinking line': the prompt field grows huge and the words land in heavy caps across it, the caret blinking at the end of the line
- 10.7–16 s · verse line 2 (bars 5–6): 'It read the brief, then it read the rules': a brief document (JSON-like lines, drawn, no real content) slides in at an angle; a clay highlight scans down it line by line; small mono ticks 'read' pop in the margin
- 16–21.3 s · verse line 3 (bars 7–8): 'Every frame a function, no hidden state': a wireframe topography (a grid of lines displaced by a smooth function of x, y and the frame) warps under the words; the label 'f(frame) → pixels' in tracked mono
- 21.3–26.7 s · verse line 4 (bars 9–10): 'It drew the whole thing out of code': a line drawing of a small film camera assembles itself stroke by stroke (strokes draw on with dash offsets) while the words set on a gentle curve around it
- 26.7–32 s · chorus line 1 (bars 11–12), key lifts to C major, drums full: 'Oh, Opus, five point five': huge numerals roll like an odometer from 0.0 to 5.5 and lock on the downbeat with a flash; the words set above in a large serif italic
- 32–37.3 s · chorus line 2 (bars 13–14): 'Draw it in code tonight': columns of drawn code lines (abstract bars of varying length, a few readable tokens like 'ctx.arc', 'spring(', 'frame') stream upward; from them one clay curve draws across the frame
- 37.3–42.7 s · chorus line 3 (bars 15–16): 'Every frame a function': a contact strip of small frames slides sideways under a running frame counter 'FRAME 0001 → 1920'; each frame thumbnail is a tiny version of an earlier scene
- 42.7–48 s · chorus line 4 (bars 17–18): 'Same pixels every time': the ground flips to cream; an official form 'GOLDEN CHECK · FORM 5.5' with checkboxes fills in by hand; a rubber stamp 'SAME' slams on the last beat (clay ink, slightly rotated, with speckled edges)
- 48–53.3 s · bridge (bars 19–20), drums drop to kick only: 'It checked its work' / 'it checked it twice': back to black; two more 'SAME' stamps land one per line on a stack of forms, each with its own thud
- 53.3–64 s · tag (bars 21–24): the voice sings 'five point five' twice (the numerals return small and glowing), then 'made in code' on the last two bars as the music thins to the pad and one pluck; the prompt field returns, empty, caret blinking, with a small 'Regenerate' button that is NOT pressed; the credit fades in beneath in mono: 'a song drawn and sung in code · no samples, no voice model'

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: each lyric line wraps to two or three lines in the upper half, the visual idea below.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A song can be data: one syllable table drives the voice, the lit lyric and the cuts, so a lyric video stays in sync by construction, and a new visual idea per line keeps two minutes of words from feeling long.
- Sound (Web Audio, starts on the first click): a 90 bpm backing track (A minor verse, C major chorus: kick, snare, hats, bass, pad, arpeggio) under a robot-like formant voice singing the lyrics, doubled a third above in the chorus, with hits on stamps and the numeral lock.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
