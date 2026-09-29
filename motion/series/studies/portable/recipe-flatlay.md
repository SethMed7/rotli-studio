You are a world-class motion designer who works in code. Make "Recipe Flat-lay": 30 seconds of motion at 1080 × 1920, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif (and its Italic) for the title and step titles, Inter (800 and 600) for step numbers and quantity tags, JetBrains Mono for a small footer, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A top-down stop-motion recipe on a kitchen table where the objects move themselves. Run at 60 fps but hold every pose exactly 5 frames (12 poses a second): compute a pose index from the time and draw everything from it. Put the easing in the spacing between poses (big steps, then smaller, one pose of overshoot back), never smooth tweening, and no motion blur. Every pose adds a tiny seeded jitter (about 1 px and a fraction of a degree) to every object so held shots never freeze. Straight overhead camera, one overhead light: every object casts the same short hard drop shadow. A warm linen table with a faint woven texture and a wooden board. Flat, slightly rounded objects drawn in code: bowls whose liquid disc grows in steps, eggs that crack in two, a jug that tilts and pours, a butter dish, a flour heap, spoons with small mounds, a whisk turning in quarter steps, a pan on a hob ring, a ladle, a timer, a plate. Pancakes grow as ladled circles; bubbles appear as small rings and pop over three poses; a flip squashes the pancake's height through zero to show its golden side; the stack grows one pancake at a time. Each step is a card at the top: a big bold step number, an italic serif title, and small white labels with the quantities beside their objects. Use a font with fraction glyphs for the quantities. No health or diet words.
Palette: ground #efe4d2, surface #fffaf1, ink #2a1f16, muted #6b5b4b, line #dccbb0, accent #d9892b, accent2 #2f7a8a, batter #f1d49a, crust #b8702a, butter #ffe07a, board #d8b88a, deep #2a1f16. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2.5 s · title: the empty board; the ingredients step in from the frame edges one per beat around an empty bowl (eggs, milk jug, butter dish, flour sack, spoons); the title card lands: 'Pancakes' in large Instrument Serif and 'a simple batter · makes about 12'
- 2.5–8 s · step 01 'Whisk the wet': two eggs crack into the big bowl, the milk jug tilts and pours in poses, melted butter drips in, the whisk spins in stepped quarter turns and the liquid turns pale; tags pop by each object: '2 eggs', '1¼ cups milk', '3 tbsp melted butter'
- 8–13 s · step 02 'Whisk the dry': a second bowl slides in; flour lands as a heap and the three spoons tip their mounds in; tags: '1½ cups flour', '2 tsp baking powder', '2 tbsp sugar', '¾ tsp salt'
- 13–17.5 s · step 03 'Stir dry into wet': the small bowl tips into the big one in poses; the whisk makes a few turns and leaves a few lumps; a tag 'a few lumps are fine'; a kitchen timer steps in and its dial ticks round: 'rest 15 min'
- 17.5–23 s · step 04 'Medium heat': the pan slides onto the hob ring; the ladle pours three circles that grow in steps; tag '¼ cup each'; bubbles rise and pop across the surfaces; tag 'flip when bubbles form and pop · about 2 min'
- 23–27.5 s · step 05 'Flip once': the three pancakes flip one per beat showing their gold side; tag '1½–2 min more'; then they hop one by one onto the plate and the stack grows
- 27.5–30 s · end: the stack on the plate at the centre, a butter pat lands on top; the card 'Pancakes.' with 'makes about 12'; a small mono footer 'quantities from a standard home recipe'; the boil keeps every object alive

SIZES
- vertical: 1080 × 1920.
- Add ?size=square for 1080 × 1080. Design that layout for its shape: re-stack it: in the square, the step card moves to the top-left corner, the work shifts right and down, and the dry-ingredient labels stack in one column beside their bowl.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Stop motion is a clock, not a style filter: hold every pose the same number of frames, put the easing in the spacing between poses, and let a one-pixel boil keep the held shots alive.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm, a tick as each object lands, a whoosh ending as each pour stops, a hit at each step change, tiny ticks for bubble pops and the timer, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The topic is real: keep every fact exactly as written above (it is sourced), hedged the way it is hedged. Build it exactly as written first; afterwards, swap in your own topic, colours and words, and source your own facts.
