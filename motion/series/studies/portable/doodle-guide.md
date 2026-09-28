You are a world-class motion designer who works in code. Make "Doodle Guide": 36 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (600) for headlines and body, JetBrains Mono for the small section labels, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A fun explainer hosted by your own mascot image. A round badge in the bottom-left corner holds the mascot's head, and every section redraws it in a different style computed in code from the image: pixel dither (ordered Bayer, four inks), halftone dots, riso two-tone with misregistration, ink line from edges, flat poster, then the original. Compute each style once into an offscreen canvas and reuse it; never process pixels per frame. Each section flips to its own full-bleed colour on a hard cut. Headlines are tight bold sans, left-aligned, with the key word on a solid highlighter box that wipes in from the left just before the word lands. A small mono section label sits top-left. Token confetti (paw prints, bones) tumbles at the edges. Content cards look like stickers: white, thick ink outline, a hard offset ink shadow. The dogs are drawn in code, cute and simple, and their coats are the lesson: straight strands, soft waves, tight loops. The mascot opens large on a cream ground and closes peeking over a big card.
Palette: ground #f6efe3, surface #ffffff, ink #171412, muted #6f675c, line #e3d8c6, accent #f2a65a, accent2 #58b7ea, deep #171412, s1 #f7b98a, s2 #9fd6f6, s3 #f2dc6b, s4 #a3e2c4, s5 #cdbcf2, s6 #171412. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3 s · hook (cream): the turtle (wave pose, pixel dither, large, right of centre) bobs up into frame and waves; confetti drifts; a small bubble 'psst…' pops beside it and goes; the headline builds on the left: 'Thinking about' / 'a [goldendoodle]?' (the bracketed word on the highlighter box)
- 3–7 s · // 01 · the basics (s1): badge in HALFTONE; two sticker cards pop in, a Golden Retriever (straight golden coat, 'Golden Retriever') and a Poodle (tight curls, 'Poodle'); a '+' pops between them, then both slide together and become one doodle card (wavy apricot coat); headline 'Golden + Poodle' / '= [goldendoodle].'
- 7–13 s · // 02 · generations (s2): badge in PIXEL DITHER; headline 'The letters are the' / '[family tree].'; four generation cards land one per two beats, each with a two-colour bar filling (golden share vs poodle share) and a line: 'F1 · Golden × Poodle · about half and half', 'F1B · F1 × Poodle · about three-quarters Poodle', 'F2 · F1 × F1 · coats vary most', 'Multigen · doodle × doodle, several generations'; a small doodle on each card shows the likely coat
- 13–19 s · // 03 · coats (s3): badge in RISO; three doodles stand in a row and their coats draw on stroke by stroke: 'Straight', 'Wavy', 'Curly'; a slider under them moves from 'more Golden' to 'more Poodle' as the coats curl; headline 'More Poodle usually means' / '[curlier].' then a small line 'and, often, less shedding.'
- 19–24 s · // 04 · sizes (s4): badge in INK LINE; four doodles line up largest to smallest against a height ruler and pop in one per beat: 'Standard · roughly 50–90 lb', 'Medium · roughly 30–45 lb', 'Mini · roughly 15–30 lb', 'Petite · under about 15 lb'; headline 'Pick a [size].'; a mono footnote 'ranges are approximate; breeders' vary'
- 24–28 s · // 05 · colours (s5): badge in FLAT POSTER; one big doodle in the centre whose coat changes colour on each beat while named swatch chips light up in turn: 'Cream', 'Apricot', 'Red', 'Chocolate', 'Parti'; headline 'From cream to' / '[chocolate].'
- 28–32 s · // 06 · the honest bit (s6, ink ground, cream type): badge in ORIGINAL colours; headline 'No dog is fully' / '[hypoallergenic].' then the line 'More Poodle usually means less shedding. Meet the dog first.'; a small doodle sits by the badge and sneezes once (a tiny puff)
- 32–36 s · end card (cream): the turtle peeks over the top of a big white sticker card (peek pose, original colours); on the card 'Which [doodle] is yours?' and a recap strip of four small chips 'F1 · F1B · F2 · Multigen'; confetti settles; a mono footer 'sizes are approximate · every dog is its own dog'; a slow push-in holds

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: headline in the top third, cards in one column, the sizes as a 2×2 grid, the badge kept above the bottom safe margin.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- One character can survive any rendering style: redrawing the same host's head in a new style every section keeps the piece consistent while every scene looks new, and the same idea (one dog, many coats) is the lesson itself.
- Sound (Web Audio, starts on the first click): a driving loop at 120 bpm whose drums enter at the first flip, a hit on every section flip, a whoosh into the merge, soft ticks for cards, chips and bars, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
