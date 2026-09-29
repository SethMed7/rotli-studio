You are a world-class motion designer who works in code. Make "Liquid Blobs": 24 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (800 and 600) for headlines and tags, Instrument Serif for the wordmark, JetBrains Mono for the web address, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Four calendars as four drops of deep violet liquid on a flat pink ground that flow together into one shared time. The goo is one implicit surface: the sum of r² / d² over a handful of moving balls, with the surface at 1, contoured by marching squares with linear interpolation on a coarse grid and filled as one crisp path; a second, smaller contour offset up-left in a lighter violet is a flat gloss. Each blob is a main ball plus small satellites orbiting inside it, so its outline wobbles without simulation; every position is a closed-form function of time. Show the tells of liquid: necks that thicken before a merge, a damped wobble after it, and pinch-offs that leave a tiny satellite droplet. Each person has a coloured core dot inside their blob. The merged blob flows into a rounded card by blending the field toward a rounded-rectangle field. A liquid wipe is one huge ball that swells to cover the frame and drains away. Scenes: one drop splashes into four; four names with their free windows; the drops merge in pairs, then all; the goo becomes a card 'Thu · 3:00 pm, works for everyone'; four droplets bud off and land back as 'booked' tags; a wipe to the wordmark.
Palette: ground #f6d9e4, surface #ffffff, ink #171325, muted #7c7390, line #e9dfee, accent #ff6a3d, accent2 #ffc26b, deep #3b1e78. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3 s · the hook: one big drop falls in from the top, lands in the centre with a squash, and splashes into four droplets that bounce apart to four spots; the headline builds at the top: 'Four calendars.'
- 3–7 s · four people: each blob wobbles in its own rhythm with its core dot inside; under each, a name tag and a free window pop in one per beat: 'Ana · free 1–4', 'Kai · free 3–5', 'Lena · free 2–4', 'Theo · free 3–6'; the headline changes to 'Four different schedules.'
- 7–13 s · Oriel pulls them together: the tags fade; the headline becomes 'Oriel finds the overlap.'; the blobs drift toward the centre; a neck forms and thickens between Ana and Kai, and they merge with a wobble; then Lena and Theo; then the two pairs become one big blob, the four cores swirling inside
- 13–17 s · the time: the big blob flows into a rounded card shape and holds it; on the card, in white, 'Thu · 3:00 pm' (large) and 'works for everyone' (smaller); the four cores line up at the bottom of the card as an avatar row
- 17–21 s · everyone gets it: four droplets bud from the card's lower edge, each neck thinning and pinching off with a tiny satellite droplet; they fly back to the four original spots and land with a squash, each becoming a small tag 'Ana · booked', 'Kai · booked', 'Lena · booked', 'Theo · booked'; the headline: 'One time. On every calendar.'
- 21–24 s · end: a liquid wipe (one ball swells from the bottom and covers the frame in deep, then drains downward) reveals the lockup: a small wobbling blob beside the wordmark 'Oriel', the line 'Find a time that works for everyone.' and 'oriel.example' in mono; the blob keeps a gentle wobble

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: vertical first: headline on top, the four blobs in a diamond, the card most of the width; landscape puts the headline on the left and the blobs in a row on the right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- An implicit surface does the animating for you: move a few balls on simple curves and the field produces necks, merges, wobbles and pinch-offs by itself, so one shape can believably become many and many can become one.
- Sound (Web Audio, starts on the first click): a soft pad-and-pluck loop at 120 bpm, drop-like clicks on the splash and landings, whooshes on each merge and the wipe, a hit when the card holds, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
