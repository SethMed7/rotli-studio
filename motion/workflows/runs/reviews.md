# Frame reviews by other models

Commands that sent rendered frames to another model for a second opinion (Antigravity `agy`: frames only, it cannot hear audio).

## 2026-09-24 12:28 · Run Antigravity video review of the film

```sh
sed -i '' 's#@out/review-480p.mp4#~/rotli/marketing/quokka-film/out/review-480p.mp4 (open the video file itself; if you cannot view video or hear audio, say so in your first line and do not guess)#' /tmp/qf-review-prompt.txt && agy -p "$(cat /tmp/qf-review-prompt.txt)" --print-timeout 900s > /tmp/qf-agy-review.md 2>/tmp/qf-agy-err.log; echo "exit $?"; /usr/bin/head -c 6000 /tmp/qf-agy-review.md; tail -5 /tmp/qf-agy-err.log
```

## 2026-09-24 12:28 · Re-run Antigravity review read-only

```sh
agy -p "$(cat /tmp/qf-review-prompt.txt)" --mode plan --sandbox --dangerously-skip-permissions --print-timeout 900s > /tmp/qf-agy-review.md 2>/tmp/qf-agy-err.log; echo "exit $?"; cat /tmp/qf-agy-review.md; tail -3 /tmp/qf-agy-err.log
```

## 2026-09-24 12:38 · Save memory note; confirm repo untouched

```sh
cat > ~/.claude/projects/-Users-example-rotli/memory/project_quokka_story_film_2026_09_24.md <<'EOF'
---
name: project_quokka_story_film_2026_09_24
description: 2026-09-24 code-drawn 60s Rotli story film (quokka on Rottnest) in marketing/quokka-film/ on the anidoodle engine — gitignored, uncommitted; traps + how to re-render
metadata:
  type: project
---

Built after Addy Osmani's "Opus 5.5 drew each frame in JS" post (x.com/addyosmani/status/2103009037164110327, fetched via api.fxtwitter.com since x.com 402s). `marketing/quokka-film/` = own npm project (NOT bun) scaffolded from github.com/alexgreensh/anidoodle (cloned to /tmp only; NOT installed to ~/.claude/skills — offer it). 9 shots, 1800 frames, renders in ~15 s: `node tools/render.mjs rotliStory --out out/rotli-story.mp4`. Outputs in `out/` (mp4, offline html, poster, contact sheet). Nothing committed; `/marketing/` is gitignored.

**Why:** Seth wanted a storytelling film with a true character using his quokka assets + Rottnest hints, isolated from the app.

**How to apply / traps:**
- Quokka = brand SVG path data imported by `tools/import-quokka.py` (potrace for walking/thoughtful/listening/attention concept PNGs); `quokka/rig.ts` flood-fills body (dilate-to-close-gaps, attention needs gap 6), detects eyes as round ink blobs for blinks (walking needs eyeBand 0.3).
- gemini CLI is DEAD for Seth's tier ("migrate to Antigravity"); `agy -p ... --mode plan --sandbox --dangerously-skip-permissions` works for video review but sees FRAMES ONLY (no audio) — sound still needs Seth's ears.
- gate.mjs's 2 asset FAILs are the embedded brand fonts — by design.
- hopAlong: identical consecutive waypoints = hold (fixed bug: used to hop).
Related: [[project_launch_promo_hyperframes_2026_09_09]].
EOF
cd ~/.claude/projects/-Users-example-rotli/memory && python3 - <<'EOF'
p='MEMORY.md'; s=open(p).read()
line="- [2026-09-24: code-drawn 60s quokka story film in marketing/quokka-film/ (anidoodle engine) — uncommitted, gitignored](project_quokka_story_film_2026_09_24.md) — gemini CLI dead → use agy (frames only, no audio); brand fonts = expected gate FAILs\n"
open(p,'w').write(line+s)
EOF
cd ~/rotli && git status --short
```

## 2026-09-24 13:56 · Write skills, agent guide, ignores, scripts

```sh
mkdir -p ~/rotli-studio/.claude/skills/motion-room ~/rotli-studio/.claude/skills/repurpose-brand && cat > ~/rotli-studio/.claude/skills/motion-room/SKILL.md <<'EOF'
---
name: motion-room
description: Make or change code-drawn content in rotli studio's motion room (motion/): films, vertical shorts, carousels, stills, all drawn by JavaScript with the real Rotli quokka. Use when asked for a new video/short/reel/carousel/social image/poster, a change to an existing piece, or a re-render.
---

# Motion room

Everything in `motion/` is drawn by code on the anidoodle engine: one pure `renderFrame`
per piece, one pure `audio(sampleRate)`. The same source gives the same pixels and samples
on this Mac every time. `motion/pieces.json` is the catalogue; `motion/tools/studio.mjs` is
the one command.

## Commands (run from `motion/`, Node + npm, not Bun)

```sh
node tools/studio.mjs list                     # every piece, 🔒 = sealed
node tools/studio.mjs render <id|all>          # videos -> out/video/<slug>.mp4 (+jpg); images -> ../exports/<slug>/<format>/NN.png
node tools/studio.mjs golden all               # sealed pieces MUST print SAME; run after touching anything shared
node tools/studio.mjs golden <id> --record     # re-baseline a non-sealed piece AFTER its change is approved
node tools/studio.mjs check                    # no identical consecutive frames in any video
node tools/studio.mjs catalog                  # out/index.html, every piece playable
node tools/frames.mjs <id> 0,120,300 --sheet /tmp/s.png --cols 3   # fast review sheet (aspect kept)
```

## Laws

1. **Never break a sealed piece.** `rotliStory` is 🔒. Any change to `src/canvas-core/rotli/*`,
   `quokka/*`, `studio/*`, the engine or `brand/` needs `golden all` to print `SAME` for it.
   Additive params with 1920×1080 defaults are how the kit grew without drift.
2. **Story first.** Before code: three sentences (setup, turn, payoff), the turn frame, a token.
   Cue table in the piece file. 120 bpm at 30 fps = 15-frame beat; shots start on multiples of 15.
3. **Claims match the product.** Use rotli.co's own wording (site `/features`, `/privacy`):
   "Secure notes never reach a remote model", "A Librarian that files, never rewrites",
   "Chat reads the vault you are in … answers from what is actually there". Never say free,
   never market Safari.
4. **The quokka is the app's quokka.** Line art = `src/canvas-core/quokka/poses.ts` (vector rig:
   fill, blink, hop). Colors/hats/glasses = `library/companion-looks/*.png` rendered from the
   app's real `<Character>` by `bun scripts/render-companions.ts`; add a look by adding a row to
   `motion/brand/companions.json` and re-running it. Never hand-draw an accessory: the hat/ear
   clip laws live in the app.
5. **Themes come from the app's CSS.** `bun scripts/sync-themes.ts` writes `library/themes.json`;
   copy it to `motion/brand/themes.json` deliberately (it is a pixel input).
6. **Fonts are locked.** `motion/brand/brand.json` holds each font's sha256; `build-page.mjs`
   refuses a mismatch. The mono is the macOS system mono, as in the app.
7. **No dead air.** Every frame of a video must differ from the last (`check`). Holds get a slow
   push-in, a drift or a sway.
8. **Formats** come from `studio/stage.ts` FORMATS (story 1080×1920, ig-portrait 1080×1350,
   ig-square, x-post 1600×900, linkedin 1200×627, film 1920×1080).

## Making a new piece

1. `src/canvas-core/<id>.ts` exporting `export const <id>: Film` (copy the nearest existing piece:
   `dressUp` = looks, `themesLoop` = themes, `teaser15` = recut of the film via `studio/reframe`,
   `howRotliWorks` = carousel, `stills.ts` = single images).
2. `src/hosts/page-<id>.ts` (three lines; copy one).
3. Add it to `pieces.json` (kind, slug, format, about, caption for images).
4. Review with `frames.mjs` sheets, then `render`, `check`, `golden <id> --record`, `catalog`.
5. Music: `studio/score2.ts` `makeScore({...})` uses the film's melody so every piece sounds
   like Rotli; put a `pops` entry on each on-screen event.

## Known traps

- `gemini` CLI is retired for Seth's tier; `agy -p "…" --mode plan --sandbox --dangerously-skip-permissions`
  reviews video FRAMES only (no audio). Nobody but Seth can judge the sound.
- `gate.mjs` fails "no embedded binary asset" by design (brand fonts + look PNGs).
- `hopAlong` treats identical consecutive waypoints as a hold, not a hop.
- `render-companions.ts` needs `--host 127.0.0.1` for rotli's Vite; its harness lives in the
  rotli checkout's gitignored `tmp/` and is deleted after.
- The original first film also sits at `~/rotli/marketing/quokka-film/` (gitignored); the studio
  copy is canonical and byte-identical (`out/video/rotli-story.mp4`).
EOF
cat > ~/rotli-studio/.claude/skills/repurpose-brand/SKILL.md <<'EOF'
---
name: repurpose-brand
description: Take the rotli studio motion room as a foundation for ANOTHER product (Myela, a client, a new app): swap the brand seam, character, themes and copy while keeping the engine, tools, formats and piece templates. Use when asked to reuse this content system for a different brand.
---

# Repurpose the motion room for another product

The engine, tools and piece shapes are product-agnostic. Everything that says "Rotli" lives
behind a small seam. Copy, don't fork in place: Rotli's room keeps its sealed goldens.

1. **Copy the room:** `cp -R motion ~/<product>-studio/motion` (skip `node_modules`, `out`,
   `dist`, `golden`), then `npm install` there. Start with empty `golden/`.
2. **Brand seam: `brand/brand.json`.** Product name, wordmark, tagline, url, platform, voice,
   `palette` (the same key names the kit reads: linen, surface, cocoa, ink, clay, peach, olive,
   night…; map the new brand's roles onto them), `fonts.files` (put the font files in
   `assets/fonts/`; the sha256 values are the lock; recompute with `shasum -a 256`).
3. **Themes:** write `brand/themes.json` in the same shape (`id, family, mode, label, roles{…}`).
   If the product has CSS tokens, adapt `scripts/sync-themes.ts` to read them. Never hand-copy.
4. **Character (optional):**
   - Vector line art → `tools/import-quokka.py` (point `ROTLI`/pose lists at the new SVGs);
     the rig fills, blinks and hops any closed line drawing.
   - A product with a real component that draws its mascot → adapt
     `scripts/render-companions.ts` to render looks from it.
   - No character → delete the actor calls; pieces still work as type-and-UI motion.
5. **Copy and claims:** replace every caption with lines from the product's own site. Keep the
   claim rule: nothing the product does not do.
6. **Pieces:** keep the shapes (long film, recut teaser, looks/customizer short, themes short,
   carousel, stills) and rewrite their cue tables. The Rottnest scenery (`rotli/island.ts`) is
   Rotli-specific; give the new product its own setting module.
7. **Prove it:** `studio.mjs render all`, `check`, then `golden all --record` to seal the new
   product's approved cuts.
EOF
cat > ~/rotli-studio/AGENTS.md <<'EOF'
# rotli studio — agent guide

Local-only media studio for Rotli (never deployed, no git remote). Two rooms:

- **Posts** (`server.ts`, `src/`, `posts/`, `static/`): HTML social templates, `bun start` → :4500. See README.md.
- **Motion room** (`motion/`): code-drawn films, shorts, carousels and stills. Read
  `.claude/skills/motion-room/SKILL.md` before touching it; `.claude/skills/repurpose-brand/SKILL.md`
  to reuse it for another product.

Rules: do not commit unless asked; never change a sealed piece's pixels (`node motion/tools/studio.mjs golden all`
must print SAME); claims must match rotli.co; the quokka and themes come from the rotli app, never hand-drawn.
EOF
cd ~/rotli-studio && printf '\n# motion room: renders and builds are regenerable\nmotion/out/\nmotion/dist/\nmotion/.tmp/\nlibrary/companion-looks/\n' >> .gitignore && python3 - <<'EOF'
import json
p='~/rotli-studio/package.json'; d=json.load(open(p))
d['scripts']['sync:themes']='bun scripts/sync-themes.ts'
d['scripts']['sync:companions']='bun scripts/render-companions.ts'
d['scripts']['motion']='cd motion && node tools/studio.mjs'
json.dump(d,open(p,'w'),indent=2); open(p,'a').write('\n')
p='~/rotli-studio/scripts/sync-library.ts'; s=open(p).read()
s=s.rstrip('\n')+'\n\n// The twelve theme environments come from the app\'s CSS, computed in Chromium.\nBun.spawnSync(["bun", join(import.meta.dir, "sync-themes.ts"), source], { stdout: "inherit", stderr: "inherit" });\n'
open(p,'w').write(s)
EOF
git -C ~/rotli-studio status --short
```
