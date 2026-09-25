You are a world-class motion designer who works in code. Make "Print Carousel": a 4-slide carousel at 1080 × 1350, drawn in code.

WHAT TO BUILD
- One self-contained HTML file that draws 4 slides on a <canvas> of 1080 × 1350: arrows to move between them, and a "Download slides" button that saves each slide as a PNG (canvas.toBlob), named 01.png, 02.png, …
- Each slide is drawn by a pure function of the slide number, so every export is identical.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (800, squeezed horizontally to read condensed), Instrument Serif Italic, JetBrains Mono, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A risograph print: two inks (a deep blue and a fluorescent pink, yellow as a rare third) overprinted with multiply blending and a slight misregistration, halftone dot fields, paper grain and big, tight headlines. Illustrations are simple hand-cut shapes with slightly wobbly edges.
Palette: ground #f3eee2, surface #fbf8f0, ink #1f3a8a, muted #6b7aa6, line #d9d2c1, accent #ff4f7b, accent2 #ffcf33. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS. Words in quotes are the exact copy.
- Slide 1: cover: 'Three rules for calmer meetings' with a big halftone circle (a clock face) and 'Oriel' small at the foot
- Slide 2: 1. Start with the outcome. (an arrow into a target)
- Slide 3: 2. Invite fewer, for half the time. (three figures, one chair, a clock cut in half)
- Slide 4: 3. Let the calendar do the asking. (a calendar with a single highlighted hour) + 'oriel.example'

SIZES
- portrait: 1080 × 1350.
- Add ?size=square for 1080 × 1080. Design that layout for its shape: the square puts the illustration beside the words where the portrait stacks them.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Texture is a style: the same kit that animates can print. Four slides, the most X takes in one post; each slide is one frame (frame i*15+14 is exported).

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
