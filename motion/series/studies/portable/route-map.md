You are a world-class motion designer who works in code. Make "Route Map": 36 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (400 and 600) for headlines and pin labels, Instrument Serif Italic for sea names, JetBrains Mono for the counter, date chips, graticule labels and the footer, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
An animated travel map in the adventure-film manner. A stylised map of the Atlantic from the Arctic to Antarctica in a simple equirectangular projection: a paper-coloured sea, flat land, an ink coastline drawn from your own low-poly outlines, a faint graticule every 15° with the equator and polar circles dashed, sea names in an italic serif, a small compass rose, a light paper grain. A dotted route in a strong red draws itself along a list of waypoints at the traveller's pace; its head is a small bird silhouette (narrow swept wings, forked tail) that flaps and follows the route's direction. Pins drop on a spring with a label card. The camera follows the traveller a few frames behind and zooms between the whole map and a close follow, always eased. A distance counter in a card ticks with the line and lands exactly on the total, with a date chip under it. At one point the route forks and both branches draw at once. Headlines sit on a light panel so they read over the map. Everything is flat: no satellite imagery, no blur.
Palette: ground #efe7d4, surface #dccfae, ink #1d2733, muted #5e6670, line #c8bb98, accent #d2412c, accent2 #2f6f8f, deep #1d2733. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–4 s · hook: the whole map settles (coastlines draw on, the graticule fades up); the tern flies in from the edge to northeast Greenland and a pin drops: 'Greenland' / 'nests here in the Arctic summer'; headline 'A bird under 125 g' then 'flies pole to pole and back.'
- 4–8 s · the stopover: date chip 'Aug'; the camera zooms to follow as the route draws southwest over the ocean; a pin drops in the open North Atlantic: 'Stopover' / 'about 25 days of feeding at sea'; the counter starts ticking
- 8–14 s · the fork: date chip 'Sep'; the route runs southeast toward West Africa and, south of the Cape Verde islands, splits into two dotted branches that draw at the same time, one hugging Africa, one crossing to Brazil; headline 'Then the tracked birds split:' with the line '7 followed Africa, 4 crossed to Brazil.'
- 14–20 s · the far south: the branches rejoin in the Southern Ocean; date chip 'Nov'; a pin drops near the Weddell Sea: 'Winter by Antarctica' / 'about 5 months'; headline 'It swaps one summer for another.' with the line 'Arctic in June, Antarctic from December to March.'
- 20–27 s · the way home: date chip 'Apr'; the camera follows a long S-shaped route north up the middle of the Atlantic, crossing from east to west near the equator; thin muted arrows sweep across the sea for the prevailing winds; headline 'Home in an S-curve, riding the winds,' then 'in about 40 days.'; date chip 'May'
- 27–32 s · the total: the tern lands back in Greenland; the camera pulls out to the whole map with the full route drawn; the counter lands on '70,900' and a pill pops: 'on average, in one year'; the line 'Some flew more than 80,000 km.'
- 32–36 s · end card: the route pulses once along its length; headline 'Over a 30-year life:' / 'maybe 2.4 million km.' then the line 'About three trips to the Moon and back.'; mono footer 'routes simplified · 11 tracked birds, 2007–08 · Egevang et al., PNAS 2010'; slow push-in holds

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: vertical suits a pole-to-pole route: crop the map to the Atlantic so the whole route fits, zoom less when following, put the headline across the top and the counter across the bottom.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A map route turns numbers into a journey: a line that draws at the traveller's pace, a camera that follows and a counter that ticks with the line make a distance felt before it is read.
- Sound (Web Audio, starts on the first click): a driving loop at 120 bpm whose drums enter as the journey starts, soft ticks for pins, date changes and every few thousand kilometres on the counter, whooshes on big camera moves, hits at the fork and on the total, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The topic is real: keep every fact exactly as written above (it is sourced), hedged the way it is hedged. Build it exactly as written first; afterwards, swap in your own topic, colours and words, and source your own facts.
