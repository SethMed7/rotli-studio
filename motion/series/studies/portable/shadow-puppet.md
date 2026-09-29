You are a world-class motion designer who works in code. Make "Shadow Puppet": 30 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif for the story cards and the title, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A silhouette film in the 1920s cut-out manner: black articulated paper figures and lacy black scenery against a glowing, backlit, tinted ground. The ground is a radial glow, hot in the centre and darker at the corners, tinted per scene (amber dusk, blue night, rose dawn) with slow cross-dissolves, a faint flicker and gate weave. The figures are rigs of separate black parts joined at hinges that only rotate (body, head, jaw, ears, a segmented tail, two-segment legs, two-segment wings), with every joint angle a function of time, stepped on twos for a hand-animated feel. Silhouettes carry cut-out lace: eye holes, crescents along the tail, filigree leaf holes in the trees, a zig-zag grass fringe, curling tendrils in the corners. Scenery on three planes (far at low opacity, middle, near solid black) that drift at different speeds as the view pans. The moon is the only light object. Captions are silent-film cards: a band at the bottom with an ornamental cut-paper border and one serif sentence per scene, plus opening and closing title cards. The story is an original fable: a fox scoops the moon's reflection into a lantern, the wood goes dark for everyone else, and she climbs the tallest tree to give it back.
Palette: ground #f1c46a, surface #f7dc9a, ink #130c07, muted #5c3a12, line #d9a44a, accent #b8431e, accent2 #3f5f8a, deep #130c07, s1 #f1c46a, s2 #9db8d2, s3 #f2b6a0. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (90 bpm, a beat every 0.67 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3.3 s · opening card: an ornamental cut-paper border draws itself around the amber glow; the title card reads 'The Fox Who Borrowed the Moon'; the glow flickers gently
- 3.3–8 s · dusk (s1 amber): a lacy wood on three planes; the view pans slowly right; the fox trots in on a walk cycle, stops at a pond and turns her head up at the moon, then down at its reflection; card: 'A fox wanted a light of her own.'
- 8–13.3 s · the borrowing: the fox lifts a jointed lantern on a pole and dips it in the pond; the reflection slides into the lantern, which now glows, and the moon in the sky shrinks to nothing; she trots off swinging it; card: 'So she borrowed the moon.'
- 13.3–18.7 s · the dark (the tint dissolves to s2 night blue and the glow dims): an owl misjudges its branch and flaps; a hare hops, stops and turns in circles; only the fox's lantern makes a small warm circle; she stops, and her ears droop; card: 'But the wood went dark for everyone else.'
- 18.7–24 s · the giving back: the fox climbs the tallest tree in three stepped leaps, branch by branch; at the top she tips the lantern and the moon rises out of it back into the sky, growing to full; the glow returns; card: 'So she climbed the tallest tree and gave it back.'
- 24–27.3 s · dawn (the tint dissolves to s3 rose): the fox, the owl and the hare sit together on a hill as the moon sets behind them; the owl bows its head; card: 'A light kept is small. A light shared lights the wood.'
- 27.3–30 s · closing card: the ornamental border again, 'The End', and a tiny fox silhouette curled asleep under the words; the glow slowly fades

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: vertical: a tall wood, the view pans up instead of across (up the tree for the giving-back scene), the animals larger in the lower half, the caption band wrapped to two lines above the bottom margin.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Silhouette makes a character pure gesture: with no face or colour to lean on, a fox reads only through the hinge angles of its joints, so the whole performance is in how each part rotates.
- Sound (Web Audio, starts on the first click): a slow soft music-box loop at 90 bpm, soft footsteps and leaps, whooshes as the moon goes into the lantern and comes back out, a hit when the wood goes dark, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
