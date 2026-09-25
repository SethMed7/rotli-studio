# Rotli — "The Quokka Who Kept Everything" (60 s)

Code-drawn film built on the anidoodle engine (`src/canvas-core/`). One pure
`renderFrame(frame)` paints every frame; `audio(sampleRate)` writes every sample.
Character art is Rotli's canonical quokka geometry (`src/assets/characters/*.svg`,
potrace'd concept layers for walking/thoughtful/listening/attention), imported as
path data by `tools/import-quokka.mjs`: the character is drawn from its own outline.

## Story in three sentences

1. **Setup** — A quokka steps off the ferry onto a quiet island, and the mainland
   follows it: thoughts blowing everywhere, apps pinging for attention.
2. **Transformation** (scattered → kept) — One keypress, `⌥Space`, and every
   thought becomes a plain file in one folder; the Librarian quietly files,
   tags and links them, secure notes stay home, and Chat can find anything.
3. **Payoff** — At sunset everything the quokka wrote is kept: on the island,
   in the folder, still its own.

**Turn:** frame 300 (`⌥Space`), where the noise stops and the island goes quiet.
**Token:** the *Trip ideas* note (a paper card, clay folded corner). It flutters
out of reach in shot 2, is written in shot 3, goes into the folder in shot 4,
gets filed by the Librarian in shot 5, is cited by Chat in shot 8, and peeks out
of the folder at sunset in shot 9.

## Rottnest hints (each one has a reason)

- **Island = the vault.** One island, one folder; nothing leaves it. That's local-first.
- **Wadjemup lighthouse = the Librarian.** Its beam sweeps and lights up what's where.
- **Turquoise bay + pink salt lake + limestone** make up the palette, beside Rotli's
  linen, cocoa, clay and olive.
- **The ferry** brings the quokka (and the noise) over from the mainland.
- **The quokka selfie smile** is the last beat.

## Shots (120 bpm, 30 fps: beat = 15 frames, bar = 60)

| # | id | frames | label | beat |
|---|----|--------|-------|------|
| 1 | ferry | 0–150 | a quiet island | Ferry chugs in, quokka hops down the jetty onto the sand holding its note |
| 2 | noise | 150–300 | thoughts everywhere | Notes blow past, badge bubbles pop, quokka spins (attention pose) |
| — | turn | 300 | ⌥ Space | keycap slams down, noise snaps away |
| 3 | write | 300–510 | just write | Rotli note window: `# Trip ideas` renders, tasks tick, `/` menu, `[[Rottnest]]` chip; quokka (notes) writes beside it |
| 4 | vault | 510–720 | one folder is your vault | note slides into a folder; the tree `wiki/ chats/ storage/ .rotli/` inks in; "plain files, any editor" |
| 5 | librarian | 720–960 | the librarian keeps it tidy | night; lighthouse beam; notes fly from inbox to People · Projects · Research; tags + [[link]] threads; "never changes your words" |
| 6 | views | 960–1140 | your views, your shelf | Main shelf arranged by paw; named view "Trip"; remove from Main → ghost stays in vault; delete → Trash inside the folder |
| 7 | secure | 1140–1350 | secure stays home | stays_local pose; locked note into `_secure/`; remote-AI clouds bounce off; on-device chip reads |
| 8 | chat | 1350–1560 | ask anything | ai_chat pose; question bubble; answer types out with citation chips; threads light from the notes |
| 9 | sunset | 1560–1800 | room to think. files you keep. | sunset, lighthouse, quokka waves with the folder; wordmark + rotli.co |

## Look

Flat Rotli brand: linen ground `#f8f2e9`, cocoa ink, clay `#c97e62` as the one
accent, olive, peach. Cocoa companion body `#C6845F`. The inside-the-vault shots (5, 7)
flip to the dark cocoa ground `#241d18`, the way the app has light and dark
environments. Soft diagonal stripe paper on the light shots. Beat label sits top-left
in General Sans; a scene counter sits top-right. No glows or blur.

## Music

Anidoodle recipe, pushed toward energetic: C major, 120 bpm, triplet-eighth
music-box plucks, I–IV–V–I then vi–IV–I–V lift, a soft kick + shaker from the turn
on, and a bell on the tonic at frame 1620. No pads, drones, reverb tails or minor
keys. The score is printed as text by `tools/score.mjs`.
