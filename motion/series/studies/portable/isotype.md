You are a world-class motion designer who works in code. Make "Isotype": 30 seconds of motion at 1080 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (600 and 800) for the headline, labels and numbers, JetBrains Mono for the counter and footnotes, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
An Isotype picture-statistics chart, animated, on a cream ground. One flat water-drop pictogram (a circle and two tangent lines, no outline, no gradient, no perspective) stands for 1% of all the water on Earth, and the film is a chart of them in rows of ten, one block of rows per category with its label beside it, as in Isotype charts. Quantities are counted, never scaled: drops pop in one by one in reading order on a short spring so each row tallies itself, and a remainder is a drop cut with a vertical cut (a half or a quarter), never a smaller drop. Colour is category: oceans deep blue, ice pale blue, groundwater brown, everything else green, and salty drops grey out when fresh water is singled out. Each legend line starts with a small flat glyph in the same style (a wave, a snow-capped peak, earth strata, a river). Strict printed-chart layout: generous margins, one left edge for the headline, a thick ink rule, the drop rows and their labels. Scenes: a single giant drop is struck through and breaks into a hundred same-size drops; the oceans count in (about 96.5); ice (about 1.7) and groundwater (about 1.7) take a short row each; a magnifier shows everything else as a speck smaller than one drop; the fresh drops (about 2.5%) lift out and re-count into their own chart of 100 (about 69 ice, 30 groundwater, 1 everything else, lakes and rivers included); an end card with both charts.
Palette: ground #f3eee2, surface #ffffff, ink #1a1a1a, muted #5f5a52, line #dcd5c6, accent #1d5fa6, accent2 #e2432a, s1 #1d5fa6, s2 #8cc3df, s3 #8b5a2b, s4 #3f9b5a. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3 s · the rule: one very large drop swells in the centre while the headline 'All the water on Earth' builds; a red strike (accent2) crosses it with the small mono note 'not bigger…'; the big drop breaks into same-size grey outline drops (line colour) that fly into the rows the chart will fill, with the note '…more'; the line 'One drop = 1% of it.' lands under the headline
- 3–11 s · oceans: the ocean block fills in blue (s1) in reading order, about six drops per beat, the counter ticking; the tenth row ends in six whole drops and a HALF drop cut vertically; label beside the block with the wave glyph: 'Oceans' / 'about 96.5%'
- 11–15 s · ice: a new short row under the block fills pale ice blue (s2): one whole drop and a three-quarter drop (a quarter cut off); label beside the row with the mountain glyph: 'Ice caps and glaciers · about 1.7%'
- 15–19 s · underground: the next short row fills earth brown (s3), one whole and three-quarters; label with the strata glyph: 'Groundwater · about 1.7%'; the chart now holds a hundred drops' worth (96.5 + 1.75 + 1.75)
- 19–22 s · the rest: a last row holds only a small magnifier ring (2 px ink circle) with a green (s4) speck inside it, far smaller than one drop; label with the river glyph: 'Everything else · less than a tenth of one drop' and a mono line under it 'lakes, rivers, swamps, soil, air, living things, permafrost'
- 22–27 s · fresh water: the headline changes to 'Only about 2.5% is fresh.'; every salty drop (the oceans and the salty part of the groundwater, about one drop of the brown row) greys out to line colour; the fresh drops lift out and re-count into a new chart of their own, one drop = 1% of FRESH water, again one block per category: 69 ice drops (s2, six full rows and nine), 30 groundwater drops (s3, three rows), 1 green drop (s4), counting in by rows; labels: 'Ice · about 69', 'Groundwater · about 30', 'Everything else · about 1 (all lakes and rivers included)'
- 27–30 s · end card: the two charts sit side by side, small; headline 'Most of it is salty.' then 'Most of the rest is frozen.'; mono footer 'figures rounded · USGS Water Science School, after Shiklomanov (1993)'; slow push-in holds

SIZES
- square: 1080 × 1080.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: square: headline on top, the chart left-aligned with each label beside its rows; landscape: the first chart on the left and the fresh-water chart building beside it on the right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Counting beats scaling: showing a quantity as many identical symbols (and a remainder as a cut symbol) lets the eye compare 96.5 with 1.7 honestly, where a bigger symbol would exaggerate by area.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm whose drums enter when the counting starts, a whoosh into the break-up, thinned ticks for the counting drops like light rain, a hit at each new category and at the fresh-water lift, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The topic is real: keep every fact exactly as written above (it is sourced), hedged the way it is hedged. Build it exactly as written first; afterwards, swap in your own topic, colours and words, and source your own facts.
