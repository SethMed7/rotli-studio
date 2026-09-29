You are a world-class motion designer who works in code. Make "Two-Part Harmony": 120 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif for Opus's lines and Instrument Serif Italic for the title, Inter (600 and 800) for Sonnet's lines, the choruses and the cards, JetBrains Mono for the fact strip, labels and the HUD, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A music video for an original duet about how two AI models split the work: one plans and advises (a pixel critter with glasses, the low voice, clay), one executes fast (the same critter with blue headphones, the high voice, blue); together is green. Draw both as a 14 x 8 pixel grid in Canvas 2D (a wide body, two tall eyes with a glint, arm nubs, four short legs) so squash and stretch, leg lifts, arm poses, jumps and spins stay crisp, and open a mouth on every sung syllable. Warm ivory ground, ink, flat surfaces. The lyric is karaoke in the singer's colour, each syllable popping and underlining exactly as it is sung; every two bars a new prop acts out the line; the choruses go dark with a sunburst, then a concert, then every colour up a whole step, with four cards slamming on a 'Plan it! Build it! Check it! Ship it!' chant; one verse shows the advisor pattern (a call button, a beam, the whole thread scrolling, a sealed envelope returning, a code window that can't read it). A mono fact strip states each claim with its hedge. The song is one syllable table [bar, beat, length, midi, vowel, consonants, text, singer] that drives the band, two formant voices (a sawtooth through three vowel formant filters, noise for consonants) and the picture.
Palette: ground #faf9f5, surface #ffffff, ink #141413, muted #b0aea5, line #e8e6dc, accent #d97757, accent2 #6a9bcc, green #788c5d, deep #141413, paper #f0eee6. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–8 s · intro (bars 1-4): '5.5' slams in ink on frame 0 with a crash; Opus drops in on beat 2 (a thud), Sonnet on beat 3 (a boing); name tags pop; the title 'Two-Part Harmony' letters in on 16ths; bar 4 the ground flashes ink, blue, green, ink (never clay, where Opus would vanish) under huge numerals as Sonnet counts 'One, two, three, four!'
- 8–24 s · verse 1, Opus sings (bars 5-12): 'Hand me the hardest problem, / the long road, the tangled kind, / I think it through with judgment, / I plan it all, line by line.' A crate THE HARDEST PROBLEM drops on the downbeat; a road draws to a tangle at the horizon; a balance tips each beat and settles; a plan sheet writes eight lines, one per beat, with a pencil
- 24–40 s · verse 2, Sonnet sings (bars 13-20): 'Hand me a clear spec, / and a way to check it's right, / thirty percent faster than my last, / fewer tokens, feather light!' A spec card flies in and is caught; four checks turn green on four beats; 30% rolls up and locks beside a ghost of Sonnet 5; a coin stack sheds tokens on 8ths as a feather falls
- 40–56 s · chorus 1 (bars 21-28), dark sunburst: 'One to make the plan, (Opus) / one to make it go! (Sonnet) / Plan it! Build it! Check it! Ship it! / Opus and Sonnet, oh oh oh!' PLAN / BUILD / CHECK / SHIP cards slam on the half bars, both jump on the last 'oh!' with confetti
- 56–72 s · the advisor (bars 29-36): Sonnet 'When I need a plan, I make the call.' (presses advisor; a dotted beam reaches Opus on a cloud) / Opus 'I read the whole thread, I read it all.' (the thread scrolls past) / Opus 'My advice comes back sealed up tight.' (a sealed envelope rides the beam down; label advisor_redacted_result) / Sonnet 'Your code can't read it, I can, alright!' (a code window scrambles encrypted_content; Sonnet opens the envelope, a bulb lights)
- 72–88 s · chorus 2 (bars 37-44): the same words as a concert: LED bars, sweeping spotlights, a crowd of little silhouettes bobbing in front
- 88–96 s · bridge (bars 45-48), half time, one card a bar: Sonnet 'A million tokens,' (1M) / Sonnet 'effort, low to max,' (a blue dial steps low to max; the source states these levels for Sonnet 5.5) / Sonnet 'half the price per token,' ($2/$10 vs $4/$20, a HALF stamp) / Opus 'most tokens at Sonnet's rates!' (a token bar, mostly blue, labelled illustrative); a snare roll and riser into
- 96–112 s · chorus 3 (bars 49-56): up a whole step with a flash; the critters swap sides, rays cycle every colour, confetti rains, the chant cards drop in from above (chorus 2 flips them, chorus 1 slams them)
- 112–120 s · outro (bars 57-60): both sing 'Five point five, five point five!' as a smaller '5.5' returns above them; they walk in a step per 'five' with a zoom kick on each, meet for a high five on 3480 (a clap, a flash, confetti); the end card: 'Opus 5.5 advises. Sonnet 5.5 executes.' hedged beneath: 'with the advisor tool, Opus 5.5 can advise a Sonnet 5.5 executor · sung and drawn in code · fan-made, not affiliated with Anthropic · facts: claude.dev/blog · platform.claude.com/docs'

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it: the lyric in the upper third, the props above the critters in the middle, the fact strip above the bottom margin.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A song can teach: give each idea a singer, a colour and a prop, keep one syllable table as the only source of words, pitches, mouths and cuts, and two models' division of labour becomes something you can hum.
- Sound (Web Audio, starts on the first click): a 120 bpm pop band in G (kick, clap, hats, a bouncing octave bass, chord stabs, a plucked hook), up to A for the last chorus, under two robot-like formant voices, low and high, singing a duet with a harmony in the choruses, and hits on every prop, the chant, the envelope, the key change and the high five.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The topic is real: keep every fact exactly as written above (it is sourced), hedged the way it is hedged. Build it exactly as written first; afterwards, swap in your own topic, colours and words, and source your own facts.
