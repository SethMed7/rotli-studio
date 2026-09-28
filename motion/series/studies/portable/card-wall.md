You are a world-class motion designer who works in code. Make "Card Wall": 30 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (400 and 600) for headlines and body, Instrument Serif Italic for one accent word per headline, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A consumer launch film built from ONE object, a tall rounded card (a flat drawn illustration on top, a small tag chip in its corner, a title strip at the bottom), repeated into a whole world over a slow aurora ground (huge soft colour fields drifting, faint twinkling star specks). Headlines are big tight sans with one word in an italic serif in the accent colour. Scenes: a mark assembling from orbiting dots inside two thin rings; a 3D coverflow of cards stepping one per beat, the centre card lifted and tagged; a Pick → Add → Done row linked by a curved line with a travelling dot and a spark burst on the last step; word slams scaling down from huge over a cloud of tilted cards scattered in depth; a depth-of-field pull where the wall blurs and one card racks into focus beside a two-line headline; four feature tiles filling in one per beat; an end card with the mark, the headline and a pill call to action over the faded wall. Illustrations are simple flat code-drawn scenes, never photos or faces. Blur by drawing into a small offscreen canvas and scaling it back up (Safari has no ctx.filter).
Palette: ground #070b24, surface #101740, ink #e8ecff, muted #7c86b8, line #1d275e, accent #ff5a3c, accent2 #6f8cff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3 s · the mark: two thin rings breathe on the aurora; three dots orbit inside and gather into the Oriel mark; the rings dissolve outward; 'ORIEL' tracks out letter-spaced beside it
- 3–6 s · the headline: mark and name rise to the top; 'Book what's *easy*.' lands word by word (the italic word in the accent); small chips float around it on springs ('Popular', 'New', 'Tonight'); the sub-line 'Pick a template. Add your people. Done in seconds.'
- 6–11 s · the coverflow: seven cards slide in from the right as a 3D coverflow and step one card per beat; the headline above counts '+40 templates', then changes to 'More every *week*.'; the centre card's tag reads 'Popular' or 'New'
- 11–16 s · Pick → Add → Done: 'Pick' over a template card that a pointer taps (a check pops on its corner); a curved line draws to 'Add' and a card of three stacked avatar circles ('3 people added'); the line draws on to 'Done.' in the accent and a result card (the week grid with one slot lit) with a spark burst; labels under each: 'a template', 'your people', 'in seconds'
- 16–20 s · word slams over the card cloud: tilted cards scatter in depth and drift; 'No back-and-forth.' slams in huge and settles; the cloud swirls and 'Just *ask*.' slams in the same way
- 20–24 s · the depth-of-field pull: the whole wall blurs heavily; one card racks into sharp focus on the right, tilting gently; the headline on the left builds 'That meeting,' then 'with *everyone* in it.'
- 24–27 s · four feature tiles fill in one per beat under 'Yours, and only *yours*.': 'Private by default · Your calendar stays yours', 'Only you see it · No shared feed', 'Nothing to install · Works in the browser', 'Cancel anytime · Keep what you booked'; a line under them: 'Free to start. Pay only when your team grows.'
- 27–30 s · end card: the card wall drifts faded behind; the mark and 'ORIEL' return, 'Book what's *easy*.' and a pill 'Start free at oriel.example'; a slow push-in holds

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: headlines wrap to two or three lines at the top, the coverflow shows three cards, the three steps run down a column, the feature tiles become a 2×2 grid.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- One object, repeated, becomes a whole visual world: when every scene is made of the same card (a coverflow, a step, a cloud, a focused hero), the film feels designed even with no footage. Depth of field decides what to read.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm whose drums enter at the coverflow, whooshes into the coverflow and each word slam, a hit on every slam, soft ticks on each card step, check and tile, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
