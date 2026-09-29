# Twenty-four techniques and a second reader: taking the studies to fifty

> Twenty-four motion techniques the studio had never drawn, from whiteboard lessons and shadow puppets to split-flap boards and ASCII cinema, each researched, briefed, built by one agent and then scored and fixed by another. What every first build got wrong, what the second reader caught, and what we changed in the harness so the next fifty start better.

*Field note 02 · 2026-09-28 · rotli studio. Everything here can be re-run from this repository; the commands are at the end.*

## Why this study

Field note 01 ended on one finding: every agent that built a study passed every gate it could run on itself, and
every one still left behind two to four problems that only a separate, scored critique found. One round of critique
fixed them. That was four studies. This note asks whether it holds at scale, and whether the studio can widen its
range at the same time:

1. **Can the harness take on techniques it has never drawn?** Not variations of the first 26 studies but new
   grammars: a hand that draws, a board that flips, a camera that never stops falling, a puppet with joints.
2. **Does the second reader still earn its cost across 24 pieces**, and what does it catch that the builder misses?
3. **What should change in the harness** so the next build starts where this one finished?

It is also a catalogue. The last section is a short, sourced note on each of the 24 techniques: where it comes
from, what makes it read as itself, and how it becomes a pure function of the frame in Canvas 2D.

## The short answer

Yes, and no. The harness took on all 24 new techniques from a brief of a few thousand characters each, and every one now passes every gate with its golden locked. But **not one of the 24 first builds was good enough**: in round one every study scored under 8 on at least one criterion (the lowest was 3, the median 5), and the second reader found 105 problems the builders had not reported, 4.4 a study. It took 60 critique rounds, 13 studies in two and 11 in three or four, to bring every criterion to 8 or more. The criteria that scored lowest in round one (ties counted) were, in order: variety (13), hook (9), composition (7), readability (6), motion (1). The failures cluster, which means they can be fixed upstream; the last section says how.

## Method

The loop ran five stages, every one with a file behind it.

1. **Research.** Three agents took eight techniques each. For every one they found two to four public references
   that define it (a canonical work, an article, a tutorial), noted its tells and its common mistakes, and, for
   the pieces about a real topic, checked every on-screen fact against an encyclopedia, a university or a
   government science agency. They credited references by link only.
2. **Brief.** Each wrote a brief in the studio's shape: frames on a beat grid, a palette, a style paragraph, story
   beats with the exact copy, a per-size note, the sound, what it teaches, and a portable version. Two fields are
   new: `family`, which is how the site now groups the studies, and `subject`: `oriel` (the imaginary product),
   `learn` (a real topic, with a `facts` list of claims and sources) or `fun` (no product at all). Eighteen new
   palettes joined the studio pack.
3. **Build.** One agent per study, from the prompt `study-prompt.mjs` generates, allowed to touch only its module
   and two hosts. Up to twelve builders ran at once on one Mac, rendering in parallel (twenty agents with the critics).
4. **Critique.** A second agent that did not build the piece rendered both sizes, read the review sheets
   (`critique.mjs`: every half second, phone size, the fastest moves), measured loudness and dead air, scored the
   seven criteria of `workflows/critique.md`, wrote the record, fixed the three worst problems, and went round
   again until every score was 8 or more.
5. **Lock.** The maintainer registered each piece, rendered it, recorded its golden, then rendered it again and
   checked the golden held: all 48 new pieces rendered the same pixels and samples twice.

## What the second reader found

| # | Study | Subject | Rounds | First (weakest) | Final | Missed |
|---|---|---|---|---|---|---|
| 27 | Whiteboard Hand | real topic | 3 | 6 (hook, variety, composition) | 8 | 4 |
| 28 | Proof Without Words | real topic | 2 | 5 (hook) | 8 | 5 |
| 29 | Split-Flap | Oriel | 3 | 5 (hook, variety) | 8 | 4 |
| 30 | Glitch Signal | fun | 2 | 7 (hook, readability, variety) | 8 | 2 |
| 31 | Neon Drive | fun | 2 | 5 (hook) | 8 | 4 |
| 32 | Liquid Blobs | Oriel | 2 | 5 (readability) | 8 | 4 |
| 33 | Swiss Grid | fun | 3 | 6 (readability, variety) | 8 | 4 |
| 34 | Bauhaus Beat | fun | 3 | 6 (motion) | 8 | 4 |
| 35 | Title Sequence | fun | 2 | 6 (composition) | 8 | 4 |
| 36 | Shadow Puppet | fun | 3 | 5 (variety) | 8 | 6 |
| 37 | Ink Wash | fun | 4 | 4 (hook) | 8 | 4 |
| 38 | One Line | real topic | 3 | 5 (hook, variety) | 8 | 5 |
| 39 | Route Map | real topic | 3 | 5 (composition) | 8 | 5 |
| 40 | Isotype | real topic | 2 | 6 (readability, variety) | 8 | 5 |
| 41 | Seasons Orrery | real topic | 2 | 6 (variety, composition) | 8 | 7 |
| 42 | Pendulum Wave | real topic | 3 | 5 (variety) | 8 | 5 |
| 43 | Infinite Zoom | Oriel | 2 | 6 (composition) | 8 | 4 |
| 44 | Multiplane | fun | 3 | 4 (variety) | 8 | 3 |
| 45 | Terminal Boot | Oriel | 2 | 5 (readability) | 8 | 3 |
| 46 | Broadcast Package | fun | 3 | 5 (variety) | 8 | 4 |
| 47 | Recipe Flat-lay | real topic | 2 | 6 (variety, composition) | 8 | 4 |
| 48 | Stained Glass | fun | 2 | 6 (hook, variety, composition) | 8 | 5 |
| 49 | Radial Year | real topic | 2 | 5 (hook) | 8 | 6 |
| 50 | ASCII Cinema | fun | 2 | 3 (readability) | 8 | 4 |

*First* is the lowest criterion in round 1, *final* the lowest in the last round; *missed* counts the problems the
critique found that the builder had not reported.

## Five things every first build got wrong

**1. The first second.** The most common round-one failure was the hook. Builders followed their briefs, and the
briefs, written by researchers thinking about the technique, opened the way the technique opens: a blank board, a
dark window, an empty dial, a cursor. That is faithful and it loses the viewer. The fixes were all the same move in
the style's own terms: put the question on screen first ("How does a rainbow form?", "Why is a² + b² = c²?"), cold-open
on the finished window, let the whole split-flap board flip at once. Nothing about the technique had to change; only
the order.

**2. Type sized for a monitor.** Briefs specified type the way a designer would at 1920 wide: 26, 30, 34 px. On a
360 px phone that is 5 to 9 px. Critics raised the lines that matter to 44–72 px and, in two studies, broke the
brief's grid to do it (Terminal Boot went from 80 columns to 40; ASCII Cinema set its landscape captions on a grid
three times coarser). Readability went from 3 and 5 to 8.

**3. Glides with no punch, and a tool that cannot see them.** Many of these techniques are continuous by nature: an
endless zoom, a camera move through a diorama, a line that never lifts, a pendulum wave. `critique.mjs` counts
abrupt whole-frame changes, so it reported 0 changes per 10 s and a 30-second "calm" for pieces that clearly had
something new every two seconds. Builders read that as "the metric is blind to my style" and stopped. Critics read
it as half right: the number was blind, but the pieces also had no moment that landed. They added them inside the
style: an owl crossing the near layer of the multiplane, a full-bleed numeral slamming into the Swiss grid, a
colour cascade across the split-flap board, pattern names slamming in as the pendulums form groups. Variety went
from 4–6 to 8, judged by eye, while the tool still read low on several. The tool needs a second number, local
change, before it can judge glides.

**4. Briefs that contradict themselves.** Several briefs asked for things that cannot all be true: fourteen title
letters, one per beat, in eight beats; drums entering in a mood that has no drums; a "hold for a beat" that the
dead-air gate forbids; a split-flap row that must clear to blank before it can show a word, which takes two seconds
of drum travel. Builders resolved each one quietly and mentioned it in their reports. The fix belongs upstream: a
brief linter that checks cue counts against beats, and moods against what the kit can play.

**5. The critic's own honesty.** The critique pass was not a rubber stamp. Critics scored the builders' self-scores
one or two points lower on most criteria, and one critic, on Split-Flap, withdrew its own round-two "ship" on a
second look (the web address was readable for under a second, and a camera push carried two lamps past the safe
margin) and went a third round.

## What changed in the harness

- **The study preamble** (`motion/workflows/study-preamble.md`) now says readability on a phone beats the brief's
  type sizes (44 px for lines that matter), asks for something bold in the first 1.5 s and a moment that lands in any
  calm longer than about 4 s, lists the glyphs the pack's fonts lack (box-drawing and block characters, ¼ ½ ¾ in the
  serif, π and √) and names the one beatScore mood with drums.
- **Portable prompts** say what a study is about: the imaginary product, a real topic with its facts, or nothing at
  all. They no longer call a lesson on rainbows a "fictional product".
- **Briefs carry `family` and `subject`,** and real-topic briefs carry their `facts`; the site shows the facts with
  their sources under each study.
- **Still to do:** a local-change measure in `critique.mjs`, a brief linter, and bringing briefs back in line with
  what shipped. Where a critique changed a piece against its brief, the record says so; the brief is the plan and the
  record the as-built.

## The twenty-four techniques

### 27 · Whiteboard Hand

Whiteboard animation films a hand drawing with markers and speeds it up, so ideas seem to appear as fast as they
are said. It spread on YouTube from about 2009 and went mainstream with the RSA Animate lectures, which Andrew Park
of Cognitive Media began drawing in 2010 ([Wikipedia](https://en.wikipedia.org/wiki/Whiteboard_animation),
[RSA](https://www.thersa.org/people/andrew-park/)). Software such as [VideoScribe](https://www.videoscribe.co/) then
made the look available without a camera. The tells: the hand is always visible and its pen tip leads the line;
strokes go on in reading order at time-lapse speed; captions are written, not typed; the board is wiped before each
new idea. In Canvas 2D every drawing is a polyline revealed by arc length, and the pen tip is the point at the
current length, so any frame is closed-form. The erase is a thick stroke in the ground colour drawn to a progress
value, and it leaves a faint ghost. The rainbow facts come from the
[US National Weather Service](https://www.weather.gov/fgz/Rainbow),
[National Geographic Education](https://education.nationalgeographic.org/resource/rainbow/) and
[HyperPhysics](https://hyperphysics.gsu.edu/hbase/atmos/rbowpri.html): light bends going in, splits by colour,
reflects once off the back and bends again coming out, between about 40° (violet) and 42° (red) from the point
opposite the sun. Pitfalls: a hand that covers the caption being read, a diagram that bends violet less than red,
and calling the internal reflection "total" (the sources don't).

### 28 · Proof Without Words

A proof without words is a picture that shows a result is true with little or no text. Roger Nelsen collected
them for the Mathematical Association of America ([AMS bookstore](https://bookstore.ams.org/view?ProductCode=CLRM%2F1),
[Wikipedia](https://en.wikipedia.org/wiki/Proof_without_words)). The animated version is best known from
3Blue1Brown, made with Grant Sanderson's open-source engine [manim](https://github.com/3b1b/manim). Its tells: a dark
ground, one colour for each quantity for the whole video, outlines that trace before they fill, shapes that move and
rotate on one smooth S-curve with small staggers, and equations whose terms fly out of the shapes they name. The
proof here is the four-triangle rearrangement ([cut-the-knot](https://www.cut-the-knot.org/pythagoras/),
[MathWorld](https://mathworld.wolfram.com/PythagoreanTheorem.html)). One square of side a + b holds four copies of
the triangle plus a c² hole. Rearranged in the same square, the triangles leave a² and b² holes. The history line
uses [MacTutor](https://mathshistory.st-andrews.ac.uk/Biographies/Pythagoras/): the result was known to the
Babylonians about 1,000 years before Pythagoras. In code the whole figure is a closed-form function of (a, b), so the
legs can change live and the proof re-solves itself. Pitfalls: cross-fading between equations (terms must move),
colours that drift between scenes, and attaching a proof to a named mathematician we haven't checked.

### 29 · Split-Flap

Remigio Solari of Solari di Udine developed the split-flap display around 1948, and it became the classic station and
airport departures board ([Solari di Udine](https://en.wikipedia.org/wiki/Solari_di_Udine),
[split-flap display](https://en.wikipedia.org/wiki/Split-flap_display)). Gino Valle's Cifra 3 clock
([cifra3.com](https://www.cifra3.com/en/)) brought it into the home. The mechanism is the look: each position holds
flaps on a drum that turns only one way, so a change has to pass through every character in between. Different
starting letters mean a row settles unevenly, one letter at a time, with the clatter that tells a hall something
has changed. In Canvas 2D a cell's state is closed-form: from the start character, the target, the start frame and a
flap period, work out how many flaps have fallen and how far the current one has turned. A flip is two clipped half-
characters: the top flap falls (scaled by the cosine of its angle and darkened), then the bottom half unfolds.
Web recreations use roughly 80–120 ms per flap. The brief uses 3 frames at 60 fps (50 ms, brisk) with the 40-flap drum
capped at about 4 beats of travel. Pitfalls: cells that jump straight to their target, all cells landing together
(that hides the mechanism), and one sound tick per cell, which turns into a buzz.

### 30 · Glitch Signal

Glitch art uses the errors of digital and analogue media as its material: databending, datamoshing (deleting a
video's keyframes so motion data smears the old pixels), compression blocks, circuit bending
([Wikipedia](https://en.wikipedia.org/wiki/Glitch_art)). Rosa Menkman's
[Glitch Studies Manifesto](https://amodern.net/wp-content/uploads/2016/05/2010_Original_Rosa-Menkman-Glitch-Studies-Manifesto.pdf)
argues that every medium has its own fingerprint of failure. Kim Asendorf's open-source
[ASDFPixelSort](https://github.com/kimasendorf/ASDFPixelSort) (2010) sorts runs of pixels, where a threshold
decides what melts. What makes a glitch look real is structure: separated colour channels, horizontal slices out of
place, macroblocks drifting along motion, scanlines, a tracking band, and frames that hold for a moment. Random
speckle does not. For pure-function Canvas, paint the clean scene into one offscreen canvas and redraw it with
offsets. Every random choice is a seeded hash of a held index (floor(F / 2–4)), never of raw F, so motion-blur
sub-samples agree. The datamosh is closed-form, blocks displaced by v × (F − F0) from a frozen key frame. Pixel sort
and snow are the only per-pixel operations. They are deterministic but slow, so run them at quarter resolution in
their own beats. Pitfalls: glitching everything all the time (use an envelope that comes back to calm), and
per-frame noise that shimmers instead of holding.

### 31 · Neon Drive

Synthwave, also called outrun after Sega's 1986 driving game [Out Run](https://en.wikipedia.org/wiki/Out_Run), is a
2000s revival of 1980s imagery: magenta and cyan neon, gridlines, VHS artefacts and chrome
([Wikipedia](https://en.wikipedia.org/wiki/Synthwave)). The standard scene is a perspective grid floor rushing toward
a sun cut by horizontal stripes; web recreations build the floor from lines that scroll toward the camera. The tells: stripes that thicken toward the bottom of the sun,
neon drawn as a hot core inside a coloured halo, chrome type with a hard horizon band, palm silhouettes and
scanlines. In Canvas 2D the grid is closed-form: put horizontal lines at depths k + phase, with screen y = horizon +
focal / z and phase = frame × speed mod 1, so it scrolls forever with no state. Neon is three stroked layers added
with 'lighter' (wide and faint, medium, thin core), never a blur filter, following the studio's house rule for glow.
There is no script font in the pack, so tube letters are stroked Inter 800 with small breaks where a tube would bend.
Pitfall: a metronomic flicker. Real tubes catch, fail and catch again at uneven moments, so the flicker comes from a
seeded pattern with uneven gaps, and one letter keeps an occasional dropout.

### 32 · Liquid Blobs

Jim Blinn introduced "blobby" surfaces in 1982: sum a smooth field around each centre, then draw the surface where the
total crosses a threshold. They became known as metaballs ([Wikipedia](https://en.wikipedia.org/wiki/Metaballs)).
Jamie Wong's [walkthrough](https://jamie-wong.com/2014/08/19/metaballs-and-marching-squares/) uses
f = Σ r² / d² with the surface at f = 1. He samples it on a grid and traces it with marching squares, placing each
edge crossing by linear interpolation, so the outline is smooth instead of stair-stepped. The tells of liquid all
come from the field: a neck thickens between two blobs before they merge, the merged blob overshoots and settles,
and a split pinches thin and snaps. For Canvas 2D, contour on a coarse grid (about 10 px) and fill one path, which is
cheap, crisp and anti-aliased. Thresholding every pixel is slow and leaves jagged edges. Each blob is a main ball with
small satellites on closed-form orbits, so outlines wobble with no simulation. Turning the goo into a card means
blending the field toward a rounded-rectangle field. Pitfalls: balls that move linearly (liquid needs overshoot and
wobble), and a pinch-off with no small satellite droplet, which reads as two circles sliding apart rather than a
liquid splitting.

### 33 · Swiss Grid

The International Typographic Style took shape in Switzerland after the Second World War, through Max Bill, Armin
Hofmann, Josef Müller-Brockmann and others ([Wikipedia](https://en.wikipedia.org/wiki/International_Typographic_Style)).
Its hallmarks: a mathematical grid behind every layout, asymmetric composition, grotesque sans-serif type set flush
left and ragged right, and restrained colour. Müller-Brockmann's concert posters and his 1981 book *Grid Systems in
Graphic Design* are the canonical references
([Wikipedia](https://en.wikipedia.org/wiki/Josef_M%C3%BCller-Brockmann)). In motion, the grid becomes the
choreography: elements move only along its lines, one axis at a time, and stop dead on module edges. Widths grow a
whole module at a time. Giant numerals and a single red block carry the weight against a lot of empty paper. In
Canvas 2D the grid is data (columns, rows, gutters, baseline) and every position is an index into it, which keeps
snaps exact and lets the landscape version re-author the same poster on a 12 × 6 grid. Pitfalls: diagonal or
springy motion (it reads as a different style), centred type, and the pack's blue accent. The movement allowed one
accent colour, so the brief forbids the blue. The pack's muted grey is also too light on this paper for small type,
so readable text stays black.

### 34 · Bauhaus Beat

In 1923 Kandinsky gave Bauhaus students a questionnaire asking which primary colour belongs to the triangle, the
square and the circle. His own answer was yellow, red and blue, and those pairings ran through the school's teaching
and the 1923 exhibition
([Google Arts & Culture / Centre Pompidou](https://artsandculture.google.com/story/bauhaus-the-importance-of-shapes-the-centre-pompidou/OwURAJwcVUkTow)).
Oskar Fischinger's films synchronised abstract shapes to music, frame by frame
([Center for Visual Music](https://www.centerforvisualmusic.org/Fischinger/OFBio.htm)). The study joins the two:
flat primary geometry that plays the score. What defines it here: flat fills, no outlines, a module grid, and a
composition that rebalances on every bar. Each instrument gets one shape and one kind of motion: the kick pulses the
circle, the bass steps the triangle, chord changes rotate a black quarter-disc, accent hits turn the square. The key
to pure-function code is to derive picture events from the same numbers as the score (bpm, bars, the arpeggio
pattern), never from audio analysis. Then sync is exact at any frame, even fractional ones. Pitfalls: a loop that
doesn't close, and motion that starts on the beat instead of landing on it. Twelve bars keep the four-chord cycle
whole, four 90° turns add up to 360°, and the last bar glides back into the first layout, so the loop closes. Moves
land on the downbeat, which is why they read as sync.

### 35 · Title Sequence

The modern film title sequence as a piece of design starts with Saul Bass. For *The Man with the Golden Arm* (1955) he cut the credits to Elmer Bernstein's jazz score: on a black field, white bars appear, disappear and form patterns before coalescing into the film's symbol, a jagged, disjointed arm. Bass said the composer "gave me a beat… and I designed to that beat" ([Art of the Title](https://www.artofthetitle.com/title/the-man-with-the-golden-arm/)). *Anatomy of a Murder* (1959) used plain paper cut-outs of a body on a flat grey ground, with credits beside the pieces ([Art of the Title](https://www.artofthetitle.com/title/anatomy-of-a-murder/); [overview](https://www.artofthetitle.com/designer/saul-bass/)).

The tells: flat fields of saturated colour, edges that are visibly cut rather than drawn, one stark symbol per scene, asymmetric layouts, credits set into the shapes, and motion that hits the music with hard stops.

In Canvas 2D, every shape is a polygon with a small seeded jitter on each vertex, so the edges read as cut and look the same on every render. Time for the paper is quantised to every second frame ("on twos"). Arrivals are keyed to the beat grid with a one- or two-frame overshoot. Title letters are separate pieces with their own small rotation and baseline offset.

The pitfall is smoothness. Eased, anti-aliased vector motion reads as a corporate template. The style lives in the hard stop and the imperfect edge. The second trap is naming real people in the credits. The brief makes the cast the parts of a meeting instead.

### 36 · Shadow Puppet

Lotte Reiniger's *The Adventures of Prince Achmed* (1926) is the oldest surviving animated feature. Its figures were cut from card and tracing paper, sometimes in 20 to 50 separate pieces joined with lead wire. They were animated frame by frame on backlit planes of glass, and scenery on stacked planes gave depth ([Wikipedia](https://en.wikipedia.org/wiki/Lotte_Reiniger)). She coloured the film with tinted stock ([The Conversation](https://theconversation.com/before-walt-disney-there-was-lotte-reiniger-the-story-of-the-worlds-first-animated-feature-125091)).

The tells: pure black silhouettes with lacy cut-out detail (eye holes, filigree leaves, fringes), a glowing tinted ground that is brighter in the centre, scenery shaded from black to grey on several planes, and characters that act only through the angles of their joints, usually in profile.

In code, each figure is a rig: a tree of filled parts, each drawn with save, translate and rotate about its hinge. Every joint angle is a closed-form function of time (for example, a walk is a sine per leg with phase offsets). The lace comes from even-odd fills. The glow is a radial gradient in the scene's tint. Flicker and gate weave come from a seeded hash of the frame, and the rigs are stepped on twos.

The pitfall is drawing figures as single shapes that slide or scale. The medium only works if the parts rotate at hinges. The other trap is letting colour creep into the silhouettes. Only the ground carries colour.

### 37 · Ink Wash

Ink-wash painting uses black ink ground to many shades, "from the deepest black to the brightest grey" ([Asian Brushpainter](https://www.asianbrushpainter.com/blogs/kb/the-use-of-ink)). A single stroke can shift in tone, and a fast, light brush leaves the streaked "flying white". The tradition prizes economy ("every brush-touch must be full-charged with meaning"), and paintings often carry red seals and poems ([Wikipedia](https://en.wikipedia.org/wiki/Ink_wash_painting)). The medium depends on absorbent paper, where wet ink disperses. Chu and Tai's [MoXi](https://dl.acm.org/doi/10.1145/1073204.1073221) (SIGGRAPH 2005) simulated that flow with a lattice-Boltzmann model.

The tells: large areas of bare paper, a few strokes that swell and taper, dry-brush streaks at the ends of strokes, soft bleeding edges with a slightly darker dried rim, graded tones, and a small red seal.

A fluid simulation is out of reach for a pure function, so the brief approximates it in closed form. Each stroke has a centreline, a width profile and a falling ink load. The body is stamped ellipses. Below a load threshold the stroke splits into bristle lanes that drop out by a seeded hash (dry brush). Each painted point grows a noisy halo for about 15 frames after the brush passes, then stops, and its rim darkens (the bleed). The paper texture is computed once.

The pitfalls are filling the frame and making the bleed a uniform blur, which looks digital. Faux-Asian lettering is another. The seal carries an abstract mark.

### 38 · One Line

Continuous-line drawing means making a whole image without lifting the pen. Matisse and Picasso made it a known practice in contour drawing ([My Modern Met](https://mymodernmet.com/line-art-history/)). In animation, Osvaldo Cavandoli's *La Linea* (1971–86) is the reference: its character is a single outline and part of the endless line he walks on ([Wikipedia](https://en.wikipedia.org/wiki/La_Linea_(TV_series))).

The tells: one stroke of constant weight, the ground line that becomes the subject and returns to ground, a leading "pen" point while drawing, and transformations that flow instead of cutting.

In Canvas 2D this becomes a resampling problem. Each drawing is authored as one open path from the left edge to the right edge and resampled by arc length to the same N points. A draw-on is a trim (the first p·N points). A morph interpolates point for point. A slow sine along the normal keeps held lines alive. Authoring order matters: every drawing must run soil, then subject, then soil in the same direction, or the morph turns the line inside out.

The pitfalls are cheating with a second stroke (a fill, a separate sun or a caption underline in line style) and letting morphs tangle. The brief allows two small flat fills only behind lines the stroke has already drawn.

The facts come from [Penn State Extension](https://extension.psu.edu/seed-and-seedling-biology) and Wikipedia on [germination](https://en.wikipedia.org/wiki/Germination) and [seeds](https://en.wikipedia.org/wiki/Seed). The bean, which germinates above ground, is named on screen because the hooked stem is specific to it.

### 39 · Route Map

The animated travel map, where a red line crawls across a vintage map between stops, became a shorthand for a long journey in adventure cinema. It is now a standard motion-design exercise ([PremiumBeat](https://www.premiumbeat.com/blog/create-animated-map-after-effects/); [CreativePro](https://creativepro.com/making-an-animated-route-map/)).

The tells: a path that grows rather than slides in, a dotted or dashed trail, a small vehicle or creature at the head aligned to the tangent, pins that drop at stops, a camera that follows and then pulls out, and a counter or date that advances with the line.

In code, the route is a list of longitude and latitude waypoints resampled by arc length, so position is a pure function of distance flown. Then:

- The camera is the route evaluated a few frames behind the traveller, which makes it trail smoothly with no state.
- The counter is arc length scaled so it lands exactly on the sourced total.
- Coastlines are hand-authored low-poly outlines in an equirectangular projection.

All data comes from [Egevang et al., PNAS 2010](https://www.pnas.org/doi/10.1073/pnas.0909493107). The paper tracked 11 terns and gives means with ranges, and the copy stays hedged ("about", "on average"). The leg averages do not add up to the annual mean (34,600 + 25,700 + 10,900 ≠ 70,900), so the counter shows only the total.

The pitfalls are a map so detailed it fights the line, a camera that jumps, and overclaiming. The paper itself hedges ("may be the longest seasonal movement of any animal"), so the copy makes no "longest" claim at all.

### 40 · Isotype

Isotype, the picture-statistics method of Otto Neurath's Vienna museum, gave charts pictograms by Gerd Arntz, with data "transformed" into charts by Marie Neurath. Its principal rule is that a greater quantity is shown by more pictograms of the same size, never by a bigger one ([Isotype Revisited](https://isotyperevisited.org/2012/08/introduction.php); [Wikipedia](https://en.wikipedia.org/wiki/Isotype_(picture_language))). Remainders are shown by cutting a symbol, normally at a half and seldom at a quarter ([Nightingale](https://nightingaledvs.com/exploring-isotype-charts-our-two-democracies-at-work-lessons-of-isotype-part-3/)).

The tells: flat, frontal silhouettes with no perspective and no outline, rows that read left to right, one row block per category with its label, a small restrained colour set used for category, and generous printed-chart margins.

In code, a drop is one path. Counting is a staggered spring per symbol in reading order, which is a pure function of the frame. Cut symbols are the same path clipped by a rectangle.

The data is from the [USGS Water Science School](https://www.usgs.gov/special-topics/water-science-school/science/where-earths-water) (after Shiklomanov): oceans 96.54%, ice 1.74%, groundwater 1.69% and everything else about 0.04%. With one drop = 1% that becomes 96½ + 1¾ + 1¾ + a speck. Fresh water is about 2.5%, of which about 69% is ice, 30% groundwater and 1% everything else.

The concept table's "oceans ~97%, ice ~2%" was corrected: rounding to whole drops would overshoot 100.

The pitfall is area scaling, where one big drop exaggerates the difference. The film opens by crossing that out.

### 41 · Seasons Orrery

The tellurion, a variant of the clockwork orrery, carries a small Earth on an arm around a central Sun to show day, night and the seasons ([History of Science Museum, Oxford](https://www.hsm.ox.ac.uk/orrery); [Wikipedia](https://en.wikipedia.org/wiki/Orrery)).

Its defining tell, and the lesson, is that the Earth's axis stays parallel to itself as the arm turns. The U.S. Naval Observatory gives the tilt as 23.4° and says the axis "stays nearly fixed in space" ([USNO](https://aa.usno.navy.mil/faq/seasons_orbit)). NASA calls obliquity "why Earth has seasons" ([NASA](https://science.nasa.gov/science-research/earth-science/milankovitch-orbital-cycles-and-their-role-in-earths-climate/)). Earth is closest to the Sun in early January, and the distance changes by only about 3% (91.4 against 94.5 million miles, [NASA Space Place](https://spaceplace.nasa.gov/seasons/en/)). Low sun angles spread the same energy over more ground ([UCAR](https://scied.ucar.edu/learning-zone/earth-system/energy-from-sun)).

In code, everything hangs on one orbital angle a(F):

- **Earth:** its position on a projected ellipse follows a(F). The night side is the great circle facing away from the Sun, projected orthographically as a half-ellipse.
- **Beam:** the lit patch is the beam width divided by sin(elevation).
- **Day dial:** it comes from cos H = −tan φ · tan δ with δ = 23.4° · sin(a). With no hour numbers, it makes no numeric claim.

Sources vary (23.4–23.5°); the copy says "about 23.4°".

The pitfalls:

- **Axis turning with the arm:** this is the classic diagram error, and it teaches the opposite of the truth.
- **Exaggerated eccentric orbit:** it invites the distance myth. The orbit is drawn as a circle seen at an angle, with "not to scale" in the footer.

### 42 · Pendulum Wave

The pendulum wave is a lecture demonstration of fifteen uncoupled pendulums of increasing length ([Harvard Natural Sciences Lecture Demonstrations](https://sciencedemonstrations.fas.harvard.edu/presentations/pendulum-waves)). Each is tuned to complete one more oscillation than the last in a fixed time, so they drift through travelling waves, standing patterns and apparent randomness, then realign exactly ([Wikipedia](https://en.wikipedia.org/wiki/Pendulum_wave)). The physics is the small-angle period T = 2π√(L/g), valid below about 15° and independent of mass ([OpenStax](https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums)).

The tells: a row of identical bobs seen from one end, a snake-like wave, sudden order (two opposite rows at half time, interleaved groups at a third and a quarter), and the reunion.

θ_k(t) = A·cos(2π(24+k)t/G), with G = 32 s as the whole piece, so the last frame is the first frame with no cross-fade. Lengths come from the period: about 44 cm down to about 18 cm. Because 24 is divisible by 2, 3, 4 and 6, the groups at G/q are exact.

The audio must loop too. At 120 bpm, 32 s is 64 beats, exactly four turns of the score's 16-beat chord cycle, with `loop: true` and no sign-off.

The pitfalls:

- **Easing or damping the swing:** either breaks the exact loop. The copy says it is an ideal model instead.
- **Frame 0 and the last frame not matching:** captions must follow the same cycle, including the timecode.
- **Mislabelled groups:** at t = G/3, two groups can share a position while moving in opposite directions, so a label placed on only that exact frame is ambiguous.

### 43 · Infinite Zoom

The endless zoom descends from the Droste effect, a picture that contains a smaller copy of itself ([Droste effect](https://en.wikipedia.org/wiki/Droste_effect)). Escher's 1956 *Print Gallery* turned it into a spiral, and Lenstra and de Smit later showed the idealised print holds a copy of itself scaled by about 22.58 ([Print Gallery](https://en.wikipedia.org/wiki/Print_Gallery_(M._C._Escher))). Online, [Zoomquilt](https://zoomquilt.org/) (2004) made it a collaborative painting you can fall into forever, and the Eames' [Powers of Ten](https://en.wikipedia.org/wiki/Powers_of_Ten_(film_series)) set the rhythm: one factor of ten every ten seconds, at a steady rate.

The tells: the speed never changes; the next scene is already visible, small, before you arrive; and there is no cut, because each scene is a detail of the last. In code the whole piece is closed-form. Every scene lives in a unit square with its portal centred at 1/k of its side, so the frame centre is the fixed point. The camera scale is k^f, exponential in time, and the level is floor(phase). Nested levels are drawn inside their portals until one is only a few pixels across. The cutoff must depend on on-screen size alone, so both sides of a hand-off draw exactly the same pixels. With N levels of L frames the loop is N·L frames, and the last scene contains the first.

The pitfall is easing each level, or cross-fading between scenes. Both make the zoom pulse, and the eye reads a cut. Ambient motion inside scenes must also repeat on periods that divide the loop.

### 44 · Multiplane

The multiplane camera shot painted layers on glass at different distances from a vertical camera. The far layers moved slower, so the picture gained parallax ([Multiplane camera](https://en.wikipedia.org/wiki/Multiplane_camera)). Lotte Reiniger and Carl Koch layered backlit planes in the 1920s, Ub Iwerks built a four-layer rig in 1933, and Disney's seven-layer version debuted in *The Old Mill* (1937). Disney's own framing of the problem, as [PetaPixel recounts](https://petapixel.com/2025/04/04/how-disneys-multiplane-camera-achieved-the-illusion-of-depth/), is the best tell: truck into a flat painting and the moon grows. On a multiplane it does not.

So the rules are depth-driven. Near layers rush past and leave the frame edges, far layers barely move, and the sky and moon never grow. Focus shifts between planes. A papercut version adds a third tell: flat colour silhouettes with deckled edges, a paper-fibre texture, lighter and cooler with distance, and a soft shadow cast by each layer on the one behind.

In Canvas 2D the camera is one equation. Each layer is scaled about the centre by z / (z − zc(F)), with zc a closed-form ease. Rack focus is a thin-lens circle of confusion per layer, quantised to a few blur levels. Following the studio's convention, the blur is a downscale-upscale soften rather than ctx.filter.

The pitfall is faking parallax with hand-tuned speeds. Unless the speeds come from one depth model, the layers slide like wallpaper and the scale changes disagree.

### 45 · Terminal Boot

The look is a video terminal of the [VT100](https://en.wikipedia.org/wiki/VT100) era, remembered through emulators like [cool-retro-term](https://github.com/Swordfish90/cool-retro-term). That project recreates the tube with bloom, scanlines, burn-in (phosphor persistence), flicker and curved glass. Text interfaces of the same era drew windows from box-drawing characters ([Box Drawing](https://en.wikipedia.org/wiki/Box_Drawing)), which date from the IBM PC's code page 437.

The tells are:

- a strict character grid
- light that bleeds past the glyph edges
- ghosts of text that has just moved
- fine horizontal scanlines
- darker, curved corners
- a slight flicker
- a power-on that opens from a dot to a line to the full raster

In a pure-function Canvas renderer each tell is a cheap pass over an offscreen screen canvas:

- Glow: two wider, fainter strokes under each text fill, with no blur filter and no shadowBlur.
- Persistence: the scrolling text drawn again at its position a few frames earlier, at low alpha.
- Scanlines: a line pattern plus a rolling refresh band.
- Curvature: a vignette, and an optional barrel bulge from strip-wise redraws.
- Flicker: a seeded brightness jitter.

Typing cadence comes from a seeded hash, never from Math.random.

One pitfall is specific to this studio. The pack's JetBrains Mono is subset to Latin and has no box-drawing, block or ✓ glyphs, so every frame, bar and cell must be drawn as rects and strokes on the grid. The general pitfall is overdoing the effects: heavy curvature and bloom make the text unreadable on a phone.

### 46 · Broadcast Package

The sports graphics package is a grammar more than a look. The persistent [score bug](https://en.wikipedia.org/wiki/Score_bug) began with Sky's Premier League coverage in 1992 and reached the US at the 1994 World Cup. The [lower third](https://en.wikipedia.org/wiki/Lower_third) names who is on screen, and the [news ticker](https://en.wikipedia.org/wiki/News_ticker) crawls the rest.

[LIGR's guide](https://www.ligrsystems.com/blog/lower-thirds-explained) gives the rules that make it read as one show:

- Every element enters from the same direction.
- A graphic holds long enough to read twice, about four to seven seconds.
- Content never changes mid-hold.
- Graphics stay inside safe margins.

Other tells:

- elements that build in layers (plate, colour, text, detail)
- one shared skew angle
- stingers that cover the frame for a beat while the picture cuts
- tabular figures so scores never jitter

All of it is closed-form timing:

- Each layer is an ease-out wipe offset a few frames from the one below.
- A score change rolls the old digit out and the new one in.
- The ticker's x is x0 − v·F, wrapped.
- The live ping-pong rally is a triangle wave in x, with a parabola per crossing for the ball's height. The height shows only through the shadow's offset in a top-down view.

The pitfall is the one LIGR names: mixing directions and angles. It makes the package look like "two designs stapled together".

### 47 · Recipe Flat-lay

The overhead stop-motion cooking film took shape with PES's [Western Spaghetti](https://en.wikipedia.org/wiki/Western_Spaghetti) (2008). In it, objects prepare a dish with no visible hands, shot from above. Its motion comes from animation's oldest economy, working "on twos": each image held for two frames, 12 images a second at 24 fps ([Inbetweening](https://en.wikipedia.org/wiki/Inbetweening); [Stop Motion Studio on twos](https://www.stopmotionstudio.com/help/stopmotion/en/shooting-on-twos.html)).

The tells:

- a straight-down camera with no perspective
- one light, so every object casts the same short hard shadow
- motion in discrete poses, with the easing carried by the spacing between them (big steps, then small)
- no motion blur
- a slight "boil", because hand-placed objects never sit exactly still

The studio sanctions 30 and 60 fps. So the piece runs at 60 fps and holds each pose exactly 5 frames, which gives 12 poses a second, and a 30-frame beat at 120 bpm is exactly 6 poses. The frame draws from the pose index floor(F/5), never from F. A seeded ±1 px, ±0.3° boil per pose keeps holds alive and stops the dead-air gate from flagging them.

The recipe is a standard home batter from [King Arthur Baking](https://www.kingarthurbaking.com/recipes/simply-perfect-pancakes-recipe), with a "few lumps are fine" note from their [fluffy-pancake guide](https://www.kingarthurbaking.com/blog/2019/01/21/how-to-make-fluffy-pancakes). The quantities are cited as facts and the wording is not copied. The pitfall is smooth tweening: once poses interpolate, it reads as vector animation, not stop motion.

### 48 · Stained Glass

A leaded window is coloured glass cut to shape, fitted into H-section lead strips called cames, soldered at the joints, puttied, and held in an iron frame ([Came glasswork](https://en.wikipedia.org/wiki/Came_glasswork)). Colour comes from metal oxides in the melt ("pot-metal"). Detail is painted on in vitreous paint, and from the 14th century silver stain added yellows ([V&A](https://www.vam.ac.uk/articles/stained-glass-an-introduction)). The V&A names what defines it: the lead lines, the painted details, and above all the light passing through, which changes the window over the day.

Visual tells:

- the lead lines are the drawing
- came edges with a raised flange and solder blobs at joints
- dark iron bars across the window
- glass that is never flat: streaky, with seed bubbles
- coloured patches of light thrown onto the floor

In Canvas each pane is a path with a jewel fill, a seeded streak gradient and a few bubbles. The cames are a thick stroke plus a thin highlight. The light is one closed-form sun: its elevation scales every pane between a darkened and a full colour, and a soft bright band sweeps the glass. The floor patches are the same panes redrawn through a transform that stretches as the sun lowers and shears with its azimuth. They are added with the 'lighter' blend at low alpha and softened by downscaling, not ctx.filter.

The pitfall is lighting the window like a screen. Glowing panes with bloom lose the lead, and the lead is the craft.

### 49 · Radial Year

Plotting a cycle around a circle is old. Florence Nightingale's 1858 polar area diagram showed a year of seasonal data as a rose ([polar area diagram](https://en.wikipedia.org/wiki/Pie_chart#Polar_area_diagram)). Its known weakness is that area and curved length are hard to judge, and outer bars look longer than they are ([radial bar charts](https://www.domo.com/learn/charts/radial-bar-chart)). So this piece:

- puts time on the angle (Jan 1 at the top, clockwise)
- encodes daylight as spoke length from a fixed inner ring, so short winter days stay visible
- labels the 6, 12, 18 and 24 h rings, so the length can be read

Data: the US Naval Observatory's sunrise and sunset for 2026 ([USNO one-day data](https://aa.usno.navy.mil/data/RS_OneDay), queried through its API). For Reykjavík (64.15° N):

- 21 Jun: 02:55 to 00:04, about 21 h 09 m, with twilight all night
- 21 Dec: 11:22 to 15:29, about 4 h 07 m
- 20 Mar: about 12 h 14 m
- 23 Sep: about 12 h 11 m

Quito (0.22° S) runs 12 h 06 to 12 h 08 m all year.

The curve is closed-form, the [sunrise equation](https://en.wikipedia.org/wiki/Sunrise_equation) with a −0.833° altitude and δ = 23.44°·sin(2π(d − 79)/365). It matches USNO at the solstices and is within about 20 minutes at the September equinox, because it ignores the orbit's eccentricity. The piece therefore labels itself approximate and says only whole hours.

The pitfall is a radial chart for decoration. It earns its circle only because the data is a cycle.

### 50 · ASCII Cinema

[ASCII art](https://en.wikipedia.org/wiki/ASCII_art) uses characters as pixels. Its animated form is best known from Andy Sloane's [donut.c](https://www.a1k0n.net/2011/07/20/donut-math.html), a torus rotated about two axes, projected with a 1/z depth buffer and shaded by its surface normal onto the ramp ".,-~:;=!*#$@". [Paul Bourke's ramps](https://paulbourke.net/dataformats/asciiart/) give a ten-level ramp, " .:-=+*#%@", and the practical warning: characters are taller than wide, so correct for aspect or the picture stretches.

The tells:

- one fixed monospace grid
- brightness carried by glyph density, not colour
- grid-locked motion, where nothing moves between cells
- characters that re-roll as they change

Translated to a pure-function Canvas piece, every cell is f(column, row, F) with randomness from a seeded hash:

- The torus is recomputed each frame from angles linear in F.
- The waterfall's columns have seeded speeds and phases.
- A portrait resolves because each cell has a seeded settle time, before which it flickers through the ramp.

Performance matters: about 6,000 cells a frame. So the glyphs are pre-rendered once into an atlas and each cell is drawn with drawImage, not fillText.

There are two pitfalls, one general and one specific to this studio. The general one is smoothing: sub-cell motion, anti-aliased scaling or a proportional font break the grid, and the grid is the whole idea. The studio-specific one is glyphs: the pack's JetBrains Mono has no block or box glyphs, so only printable ASCII goes in cells.

## Re-run it

```sh
cd motion
node tools/study-prompt.mjs series/studies/briefs/<id>.json      # the exact prompt a builder was given
node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4          # render
node tools/critique.mjs /tmp/<pieceId>.mp4                        # the review sheets and pacing numbers
node tools/still-frames.mjs /tmp/<pieceId>.mp4                    # no dead air
node tools/golden.mjs <pieceId>                                   # still the same pixels and samples
```

The records are in `motion/series/studies/critiques/`, one per study, each with its rounds, problems, timestamps and
what the builder had already seen. The research behind each technique is in its brief's `learnsFrom`.
