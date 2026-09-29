You are a world-class motion designer who works in code. Make "Zoomies": 30 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif Italic for the one end title, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
An anime-style action short drawn with Canvas 2D: flat cel colour with one shadow tone, no outlines, a low camera in the grass. Two small curly-coated dogs on one rig with two looks (an apricot-red one with a white bib, and a white one with apricot ears and eye patches and her tongue out): smooth shaved bodies, fluffy curly heads, long wavy ears and plume tails, curls drawn as unions of small circles. A closed-form gallop (every leg angle from the stride phase), a run straight at the lens, a face-on sit and a big face-on head for close-ups. Cottontail bunnies that squash and stretch. Shots: a peek from the grass, a lock-on over manga focus lines, a launch at the lens with a fur smear, a side-on parallax chase with a vault and a skid, a leaf pile burst in slow motion, a split-and-collide, an impact frame, a scuffle cloud, a face-filling close-up, laps of the yard with a near pass, a skid stop, and an innocent sit that ends with the bunny bolting and one word, 'zoomies.'.
Palette: yard (local: the cast and the yard are colour constants in the module; the pack gives only the type). Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2.5 s · peek: a low lens in the grass; a bunny nibbles clover big in the foreground; on the wicker bench behind it two dozy dogs sit; at 30 both heads snap round, ears up; at 45 a glint in all four eyes; at 60 a cut to the bunny's face as it freezes, ears straight up; a push-in throughout
- 2.5–3.5 s · lock-on: both faces fill the frame over manga focus lines on a sunny ground, pupils going wide, a glint at 90
- 3.5–5.5 s · launch: the bunny bolts across the foreground; the dogs leap off the bench and run straight at the lens until a paw fills the frame; white fur smears across the lens into the next shot
- 5.5–9.5 s · chase: side on, the camera racing with them over parallax layers; the bunny leads, then vaults straight over their heads; they skid in a cloud of dust, turn with a hop and bolt back as the frame whips round
- 9.5–12.5 s · leaves: a tidy leaf pile under a tree; the bunny dives in; the dogs go straight through at full speed and the burst plays in slow motion (closed-form ballistics with drag, in remapped time); the bunny is left sitting in the flattened heap wearing a leaf, then hops off
- 12.5–15 s · split: two bunnies run at the lens, split left and right and cut back across each other; each dog takes one, and the two dogs converge in the middle, eyes widening as they see each other
- 15–17 s · tumble: a four-frame impact frame (silhouettes, focus lines, a star, the palette inverting), then a cartoon scuffle cloud rolling across the lawn with legs, ears and tails poking out on threes and stars orbiting; two bunnies watch from the foreground, chewing; the cloud bursts
- 17–18.5 s · face: the parti one fills the frame, shakes off the dust with her eyes squeezed shut, then pops them wide, tongue flapping, ears flying, and bolts out of frame
- 18.5–23 s · laps: the bunnies forgotten, the dogs chase each other round the yard on a closed-form ellipse (the red one overtakes halfway), leaving a dust trail, the bunnies now the audience on the bench; at 615 a cut down into the grass where each dog tears past the lens at full size, one each way, then back to the laps at 645
- 23–24.5 s · skid: both run at the lens and brake, grass and dirt fanning up from the planted paws, stopping with a bounce right at the camera
- 24.5–30 s · sit: both dogs sit side by side in the wreckage (scattered leaves, divots, the rake knocked flat, a leaf stuck on the red one's head), panting then innocent; a bunny hops in and sits right between them; their eyes slide towards it; a glint; the bunny bolts at 853 and both heads snap after it; 'zoomies.' lands at 861; they are gone at 881, leaving dust and the title

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it for vertical: higher horizons with tall foreground grass, the two faces stacked in the lock-on, a narrower laps ellipse, and the title in the top safe area.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A character film is a rig plus a camera: two looks on one closed-form rig give you a cast, and the energy comes from where you put the lens (low, close, moving) and when you cut, not from how much you draw.
- Sound (Web Audio, starts on the first click): foley-led: paw patter on every run, whooshes on the cuts, barks and yips, leaf crunches, a cartoon spring, a bonk on the impact, a scuffle with tweeting birds, a skid, panting, a garden wind and birdsong bed, and a light pizzicato groove that drops out for the slow motion and the impact.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
