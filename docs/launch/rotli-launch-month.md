# Rotli launch month — October 2026

The content plan for four weeks of launch: what goes out, when, where, with which asset, and
why. Every asset named here is made by the motion room (`~/rotli-studio/motion`) and every claim
uses rotli.co's own words.

- **Prep week:** Mon 28 Sep – Sun 4 Oct
- **Launch month:** Mon 5 Oct – Sun 1 Nov
- **Launch day:** Tue 13 Oct (Product Hunt), with Show HN on Wed 14 Oct

---

## 1. Where we start (evaluation of the content we have)

**Strong**
- The quokka carries everything. It's the real app character, not a stand-in: colors, hat and
  glasses come from the app's own `<Character>`.
- The 60 s story film has a real arc (the noise, then ⌥Space, then everything kept) and a place
  (Rottnest). People share story films.
- The whole system is one look. Linen and cocoa, clay underlines, General Sans, the Baloo 2 wordmark.
  Every format comes from the same drawing code, so the feed can't drift.
- Every piece is re-renderable in seconds, and sealed pieces are pixel-locked.

**Weak (and what this plan fixes)**
- Only one landscape piece existed. This plan adds **"Rotli in 30 seconds"**, eight landscape
  episodes (YouTube, X, LinkedIn, Product Hunt gallery), each with a vertical cut, a carousel and a
  card cut from the same frames.
- Feature depth was thin. Each episode covers one promise from /features in depth.
- Nobody has heard the audio yet. **Seth listens to every video once before it is scheduled** (see §7).
- Nothing yet shows the product *in use by a person* (no screen recording, no voice). Code-drawn
  content is the brand layer, not proof. §9 schedules one real screen recording for launch week.

## 2. The message

**One line:** Room to think. Files you keep.
**Positioning:** The calm notes app for your Mac. Every note is a plain Markdown file in a folder
you own, with AI only when you ask for it.
**Proof strip (use on every end card):** Free · No account · Works offline

| Pillar | What we say (site wording) | Episodes |
|---|---|---|
| Write | "Write in Markdown. See it rendered." Tasks, choices, tables, diagrams and math draw themselves as you type, and every one of them is plain text. | 01 Write, 03 Habits |
| Own | "One folder. Every way out stays open." Open it in any editor, back it up any way you like, delete the app and the work still makes sense. | 02 Folder, 08 Web |
| AI on your terms | "A Librarian that files, never rewrites." "Chat reads the vault you are in … and answers from what is actually there." "Secure notes never reach a remote model; locked notes can't be edited by any." | 05 Librarian, 06 Chat, 07 Secure |
| Make it yours | Six themes, each tuned for light and dark; a companion with seven colors, glasses and a hat (or off). | 04 Yours, dress-up, six-themes |

**Always:** free, no account, works offline, plain Markdown, your folder, open source (MIT),
"secure notes never reach a remote model".
**Never:** Safari or phones for Rotli Web (not supported yet); anything from the Experiments list
presented as shipped (Breve routines, remote agents, spreadsheets, Mermaid visual editing,
read-aloud, DOCX beyond the site's own wording); "sync" (Rotli does not sync, it has no server);
real personal data in any frame. The demo notes are synthetic (Trip plan, Rottnest, Maya, Sam).

## 3. The look (rules every post keeps; taken from rotli.co itself)

1. **Grounds like the site, never stripes.** Solid environments: *base* (the family's ground), *band*
   (its surface-2, the site's warm band) and *deep* (the family's dark ground, the site's privacy band).
   Texture appears only as the site's **file field**, the hero-pattern tile's note, folder, checklist and
   chat glyphs at 9% ink, drifting slowly. It sits on hero-like surfaces: title cards, covers, end cards.
2. **One theme family per piece.** Each episode speaks one of Rotli's six families end to end: grounds,
   the app UI, captions, accent underlines and the quokka's color.

   | Episode | Family | Quokka |
   |---|---|---|
   | 01 Write | Rotli (warm light) | Cocoa |
   | 02 Folder | Paper (mono) | Cocoa |
   | 03 Habits | Ocean | Ocean |
   | 04 Yours | all twelve, then Rotli | Cocoa and every look |
   | 05 Librarian | Grove (dark) | Fern |
   | 06 Chat | Iris | Iris |
   | 07 Secure | Rotli (deep) | Cocoa |
   | 08 Web | Midnight | Cocoa |

   A week of posts therefore changes color the way the app does, while the grammar stays identical.
3. **Site typography.** General Sans 600 headlines with tight tracking (−0.045em titles, −0.04em
   captions). The theme's accent underlines the key word. General Sans 500 for everything else; the
   Baloo 2 wordmark in the lockup only; the system mono for raw Markdown.
4. **Carousels pace like the homepage.** The cover is the hero (base and file field), the beats alternate
   band and base, and the close is the deep band with the white line-art quokka (the site's privacy band).
5. **Series grammar.** Title card (`Rotli in 30 seconds · NN`), then the demo under lower-third captions,
   then the end card (lockup + Free · No account · Works offline).
6. **The quokka appears in every piece** as the app draws it, in the family's color.
7. **Flat.** No glows, gradients or blur; nothing overlaps.
8. **Words carry it muted.** Every vertical works with the sound off.

The sealed story film keeps its original look, stripes included (it is locked). A restyled cut would
be a new piece with a new name.

## 4. The asset library

All paths are relative to `~/rotli-studio`. Re-render anything with `bun run motion render <id>`.

**Landscape video (16:9)**

| Asset | Length | File |
|---|---|---|
| The story film: the quokka on Rottnest (🔒 sealed) | 60 s | `motion/out/video/rotli-story.mp4` |
| Ep 01 Write: "Write in Markdown. See it rendered." | 30 s | `motion/out/video/ep01-write.mp4` |
| Ep 02 Folder: "One folder. Every way out stays open." | 30 s | `motion/out/video/ep02-folder.mp4` |
| Ep 03 Habits: ⌥Space, ⌘K, wikilinks, views | 30 s | `motion/out/video/ep03-habits.mp4` |
| Ep 04 Yours: six themes, seven quokkas | 30 s | `motion/out/video/ep04-yours.mp4` |
| Ep 05 Librarian: "A Librarian that files, never rewrites." | 30 s | `motion/out/video/ep05-librarian.mp4` |
| Ep 06 Chat: "Ask your notes." | 30 s | `motion/out/video/ep06-chat.mp4` |
| Ep 07 Secure: "AI is invited in. It does not own the house." | 30 s | `motion/out/video/ep07-secure.mp4` |
| Ep 08 Web: "Your folder, in your browser." | 30 s | `motion/out/video/ep08-web.mp4` |

**Vertical video (9:16):** `teaser-15.mp4`, `dress-up.mp4`, `six-themes.mp4`, and
`epNN-<name>-vertical.mp4` for each episode (about 17–20 s). All are in `motion/out/video/`.

**Carousels (4:5, 1080×1350):** `exports/how-rotli-works/ig-portrait/01–07.png` and
`exports/epNN-<name>/ig-portrait/01–06.png` (cover, four beats, closing card). Captions are in each
folder's `captions.md`.

**Single images:** `exports/seven-quokkas/ig-portrait/01.png`, `exports/six-themes/ig-square/01.png`,
`exports/rotli-card/{linkedin,x-post}/01.png`, `exports/rotli-hero/film/01.png`, and
`exports/epNN-<name>-card/ig-portrait/01.png` for each episode.

## 5. Channels and cadence

| Channel | Role | Cadence | Formats |
|---|---|---|---|
| X (Seth) | Build-in-public voice, launch reach, replies | daily | landscape episodes, verticals, cards, threads |
| LinkedIn (Seth) | The founder story; engineering leaders who care about ownership | Mon · Wed · Fri | landscape episodes, carousels (as PDF documents), essays |
| Instagram | The look: quokka, themes, calm | feed Tue · Thu · Sat; Reels Mon · Wed · Fri | carousels, singles, verticals |
| YouTube | The library: every episode lives here, and Shorts reach new people | episode Mon/Wed; Shorts 3×/week | landscape episodes, verticals as Shorts |
| TikTok (optional) | Mirror of the Reels | with the Reels | verticals |
| Product Hunt | Launch day | Tue 13 Oct | gallery: film, hero, 4 episode cards, carousel slides |
| Hacker News | Show HN, the open-source local-first crowd | Wed 14 Oct | text post only |
| Reddit | Communities with a real reason to care | r/macapps Thu 15 Oct | one honest text post with one image |
| rotli.co blog | Durable pages every post can link to | weekly | written posts that embed an episode |

**Posting times** (local to Seth, adjust after week 1 data): X 8:30–9:30, LinkedIn 8:00, Instagram
12:00 for the feed and 18:00 for Reels, YouTube 10:00.

---

## 6. The calendar

Each entry gives the channel, the asset, the copy draft, and **why** that post goes out that day.

### Prep week — Mon 28 Sep → Sun 4 Oct (make, check, stage)

| Day | Task | Why |
|---|---|---|
| Mon 28 | `bun run motion render all` + `check` + `golden all`; open `motion/out/index.html` and watch every video **with sound**. Note any sound fixes. | Nobody has heard the audio. This is the only gate a machine can't run. |
| Tue 29 | Claims review: read every caption against /features and /privacy. Fix copy in the episode files, re-render. | One wrong claim costs more trust than ten good posts earn. |
| Wed 30 | Record one **real** 60–90 s screen recording in a synthetic demo vault: ⌥Space, type a note, tasks render, Aa raw, Chat on-device. No edits beyond trims. | Launch-day proof that the drawings are the real app. |
| Thu 1 | Product Hunt: create the page and upload the gallery (§8), first comment drafted, maker profile done. Schedule for Tue 13, 00:01 PT. | PH rewards a prepared page, and gallery order sets the story. |
| Fri 2 | Write blog post 1, "Why Rotli is a folder" (adapt `why-local.md`), with ep 02 embedded. Draft Show HN text. | Every social post needs a durable page to point at. |
| Sat 3 | Pin setup: X pinned = the story film; IG highlights "Write", "Own", "AI", "Yours"; YouTube playlist "Rotli in 30 seconds". | Profiles are the landing page for anyone who clicks through. |
| Sun 4 | Rest. | |

### Week 1 — Meet Rotli (Mon 5 → Sun 11 Oct)
*Goal: introduce the character and the promise, and get the story film seen. No asks yet except "try it".*

| Date | Channel · Asset | Copy (draft) | Why |
|---|---|---|---|
| **Mon 5** | YouTube + X + LinkedIn: **the story film** `rotli-story.mp4`. IG Reel + Shorts: `teaser-15.mp4` | X: "I built a notes app that stays out of the way. Every note is a plain Markdown file in a folder you own. AI only when you ask. Meet Rotli (and the quokka). rotli.co" LinkedIn: 5-line founder note on why notes should outlive the app. | Open with emotion and the whole story. Everything later points back to this film. |
| Tue 6 | IG carousel: `how-rotli-works` (7). X: `rotli-card/x-post` | IG: "How Rotli works, in seven slides. Free, no account, works offline." | The carousel is the saveable explainer; saves drive IG reach in week 1. |
| **Wed 7** | YouTube + X + LinkedIn: **Ep 01 Write**. IG Reel + Shorts: `ep01-write-vertical` | "Type Markdown. Watch it render. Click a result and the file changes. Flip Aa and it's plain text underneath. (1/8, Rotli in 30 seconds)" | Writing is the daily habit, so the first feature shown should be the one people use most. |
| Thu 8 | IG Reel + Shorts + X: `dress-up.mp4` | "Seven quokkas. One is yours. Pick a color, add a hat." | A light, shareable break. The character builds affection before the launch ask. |
| **Fri 9** | YouTube + X + LinkedIn: **Ep 02 Folder**. IG carousel: `ep02-folder` | LinkedIn: "The delete-the-app test: uninstall your notes app. Does your work still make sense? With Rotli it does: it's a folder of Markdown." | Ownership is the reason to switch. Friday LinkedIn readers are in reflective mode, so it suits an essay. |
| Sat 10 | IG single: `seven-quokkas`. X poll: "Which quokka are you? Cocoa / Fern / Iris / Amber" | "Which one are you?" | Cheap engagement that seeds replies before launch week. |
| Sun 11 | Blog post 1 goes live; X link to it. | "Why Rotli is a folder, not a database." | A durable link for launch-day conversations. |

### Week 2 — Launch week (Mon 12 → Sun 18 Oct)
*Goal: concentrated reach. Product Hunt Tuesday, Show HN Wednesday, Reddit Thursday, each on its
own day so Seth can be in the comments for every one.*

| Date | Channel · Asset | Copy (draft) | Why |
|---|---|---|---|
| Mon 12 | YouTube + X: **Ep 03 Habits**. X + LinkedIn: "Tomorrow on Product Hunt" with `rotli-card` | "⌥Space from anywhere. ⌘K finds the best match first. Links to nothing look inert. Views arrange files without copying. Tomorrow: Rotli on Product Hunt." | Warm the audience the day before, and give them one more reason to show up. |
| **Tue 13 — LAUNCH** | Product Hunt (00:01 PT). X thread (8 posts, one episode card each). LinkedIn launch post + the story film. IG Reel: `teaser-15`. YouTube community post. | PH tagline: "The calm notes app for your Mac: plain Markdown in a folder you own." Thread opener: "Rotli is live on Product Hunt today. Free, no account, works offline. Here's what it does in 8 tiny films 🧵" | The single biggest day. Every asset points to one link. See the run sheet in §8. |
| **Wed 14** | Hacker News: **Show HN** (text). X + IG Reel: `six-themes.mp4` | Show HN: "Show HN: Rotli, a local-first Markdown notes app for Mac (MIT)". Body: what it is, why a folder, the AI boundary (secure notes never reach a remote model), what it isn't yet. | HN wants plain facts and source, not video. Posting on its own day keeps Seth present in the thread. |
| Thu 15 | Reddit r/macapps: text + `rotli-hero`. YouTube + X: **Ep 04 Yours**. IG carousel: `ep04-yours` | Reddit: honest "I made this" post, what's free, what's not ready (Windows/Linux native planned, Safari not supported). | A Mac-native community with a real reason to care. Ep 04 is the friendliest follow-up. |
| Fri 16 | X + LinkedIn: launch recap (numbers, thank-yous) + `six-themes` grid single. | "Thank you. Here's what launch week taught me." | Recaps convert fence-sitters and credit the community. |
| Sat 17 | IG + X: companion prompt with `dress-up` reel | "Show me your quokka 👇 (screenshots welcome)" | User-made posts are the cheapest social proof. |
| Sun 18 | Rest; reply to everything. | | |

### Week 3 — AI on your terms (Mon 19 → Sun 25 Oct)
*Goal: the differentiator. AI that helps without owning your notes. Dark episodes, calm tone,
precise claims.*

| Date | Channel · Asset | Copy (draft) | Why |
|---|---|---|---|
| **Mon 19** | YouTube + X + LinkedIn: **Ep 05 Librarian**. IG Reel: `ep05-librarian-vertical` | "Turn it on and new notes get tags, summaries, links, and a place in your Library. It never edits your words. Turn it off and the folder is still a complete workspace." | Leads the AI week with the least scary feature: organization without rewriting. |
| Tue 20 | IG carousel: `ep05-librarian`. X thread: "What the Librarian will never do" (3 posts). | | Trust is built by stating limits. |
| **Wed 21** | YouTube + X + LinkedIn: **Ep 06 Chat**. IG Reel + Shorts: `ep06-chat-vertical` | "Chat reads the vault you are in and answers from what is actually there. It keeps Conversation notes, and the chat itself is Markdown." | The most-asked feature, shown with its boundaries. |
| Thu 22 | IG carousel: `ep06-chat`. Blog post 2: "AI and your notes" (from `ai-and-your-notes.md`) with ep 06 embedded. | | Written depth for the skeptical reader. |
| **Fri 23** | YouTube + X + LinkedIn: **Ep 07 Secure**. IG single: `ep07-secure-card` | LinkedIn: "AI is invited in. It does not own the house. Secure notes never reach a remote model; locked notes can't be edited by any." | Privacy closes the AI week on its strongest promise, and LinkedIn's audience decides on trust. |
| Sat 24 | IG + X: `ep07-secure-vertical` | "No account. No tracking. No analytics, ads, or crash uploads." | Repeat the strongest line in the format that travels furthest. |
| Sun 25 | Rest. | | |

### Week 4 — Everywhere, and yours (Mon 26 Oct → Sun 1 Nov)
*Goal: widen the door (the web, other notes apps) and close the month with the story.*

| Date | Channel · Asset | Copy (draft) | Why |
|---|---|---|---|
| **Mon 26** | YouTube + X + LinkedIn: **Ep 08 Web**. IG Reel: `ep08-web-vertical` | "No Mac? Rotli Web: the same editor, folders, tasks and links in your browser, working in a real folder. Chrome, Edge and Arc open it directly; the Helper brings Firefox, Zen and Brave." | Answers the week-2 "what about Windows?" replies with something usable today. |
| Tue 27 | IG carousel: `ep08-web`. X: `ep02-folder-card` | "Your folder, in your browser." | Pairs the web with ownership, so it's clearly not a cloud. |
| Wed 28 | IG Reel + Shorts: `ep04-yours-vertical`. X: `six-themes` grid | "Six themes, light and dark. Seven quokkas. Or none." | A light mid-week breather after two feature-heavy weeks. |
| Thu 29 | X + LinkedIn: "Already have notes?" text post + `ep02-folder` carousel slide 2. (Ep 09 "Bring your notes" if produced, see §9.) | "Already use Obsidian or a Markdown folder? First run can inspect it without writing anything, then open it in place or import a copy." | A switching path removes the last objection. |
| **Fri 30** | YouTube + X + LinkedIn: the story film again + month recap (what shipped, what's next: native Windows and Linux planned, spreadsheets next). | "A month of Rotli. Thank you. Here's what's next." | Ends on the emotional piece and a forward look people can follow. |
| Sat 31 | IG: "Community quokkas" roundup (reposts with permission). | | Rewards the people who showed up. |
| Sun 1 Nov | Retrospective (§10). | | |

---

## 7. The per-post routine

1. **Render fresh:** `bun run motion render <id>`, then check the golden if the piece is sealed.
2. **Watch it once with sound** on the target device (phone for verticals).
3. **Claims check:** every sentence traces to /features, /privacy or the FAQ.
4. **Caption:** hook in the first line, the promise, `rotli.co`. At most one emoji and no hashtag stacks
   (IG: at most 3 relevant tags).
5. **Alt text:** describe the frame plainly. For example: "Rotli window: a Trip plan note with a done
   task, an in-progress task, and an open task."
6. **Reply window:** Seth replies for the first 60 minutes after each post.

## 8. Launch day run sheet — Tue 13 Oct (times PT)

| Time | Action |
|---|---|
| 00:01 | Product Hunt goes live. Post the first comment: why Rotli exists, what's free, what's not ready. |
| 06:30 | X thread (8 episode cards) + pin it. LinkedIn launch post with the story film. |
| 07:00 | Email or DM the people who asked to be told, with one link. |
| 09:00 | IG Reel `teaser-15`; YouTube community post; Stories with the PH link. |
| 12:00 | Midday update on X with a genuine moment (a question someone asked, the answer). |
| 15:00 | Re-share one episode that fits the day's most common question. |
| 18:00 | Thank-you post; keep replying until the evening. |

**Product Hunt gallery order:** (1) the story film · (2) `rotli-hero` · (3) `ep01-write-card` ·
(4) `ep02-folder-card` · (5) `ep05-librarian-card` · (6) `ep07-secure-card` ·
(7) `ep04-yours-card` · (8) `how-rotli-works` slide 1.

## 9. Production backlog (not made yet)

| Item | For | Notes |
|---|---|---|
| Real screen recording (60–90 s), synthetic vault | launch week | The one piece of proof that isn't code-drawn. Record it with the stable build in a demo vault. |
| Ep 09 "Bring your notes" (Obsidian / Markdown folder: inspect without writing, open in place or import a copy) | Thu 29 Oct | Same series grammar; about an hour in the motion room. |
| PDF versions of the carousels for LinkedIn documents | weekly | `exports/<slug>/ig-portrait/*.png` → one PDF. |
| Blog posts 1–2 | prep week, week 3 | Adapt the existing resources. |
| Sound pass | prep week | Seth listens to every video. If the film sounds quieter than the shorts, match it (this unseals the film: a new golden). |

## 10. Measurement

Weekly review, every Sunday, 20 minutes, recorded as a note in the vault:

- **Downloads** (the release asset count) and **Rotli Web opens**. These are the only numbers that mean
  someone tried it. Rotli has no analytics by design, so use GitHub release downloads and site server
  logs only.
- **GitHub stars** and issues opened: interest and real use.
- **Per channel:** saves (IG), watch-through past 50% (YouTube, Reels), replies (X), comments (LinkedIn).
- **What to change:** double what gets saved and finished. Retire any format that got neither after
  two tries.

Launch-week targets (set Sunday 4 Oct from the baseline): Product Hunt top 5 of the day, Show HN
front page, 1,000 downloads in week 2.

## 11. Guardrails

- Screens are always synthetic data. No real vault, names or keys (fake keys look like `sk-test-XXXX`).
- Say "Mac" for the app and "Chrome, Edge and Arc" for the web. Never Safari or phones.
- Experiments stay experiments. If someone asks, say "in development builds".
- The quokka is always the app's own art.
- Sealed pieces stay sealed. A change means a new cut with a new name, never an edit to an old one.

## 12. After the launch month: Season One, "The Island Keeps Everything" (Nov 3 → Dec 10)

The launch month teaches the product in 30-second explainers. Season One tells it as a story: ten
one-minute episodes with a recurring character (the quokka), a recurring place (Rottnest, the vault) and a
recurring token (the Trip ideas note). Each episode owns features the explainers didn't cover, and each
lives in its own theme family and atmosphere. The bible is `motion/series/season-one/bible.md`, the briefs are
`motion/series/season-one/episodes/`, and how each one is made (or re-made) is `motion/workflows/README.md`.

**Cadence: two episodes a week, Tuesday and Thursday,** so the season finishes before the December holidays
without asking for daily attention.

| Date | Episode | Features it owns | Theme · atmosphere |
|---|---|---|---|
| Tue 3 Nov | 01 Arrival | ⌥C quick capture → Captures; ⌥Space | Rotli · island-dawn |
| Thu 5 Nov | 02 Plain Words | hybrid Markdown; tasks, choices, switches, tables, Mermaid, math; Aa → raw | Rotli · linen-morning |
| Tue 10 Nov | 03 The Workshop | Excalidraw boards and Word (.docx) documents in their own formats | Paper · paper-studio (line style) |
| Thu 12 Nov | 04 The Burrow | one folder; Files; Remove from Main; Trash; delete-the-app | Grove · grove-burrow |
| Tue 17 Nov | 05 The Lighthouse Keeper | the Librarian; raw vault | Rotli deep · night-vault |
| Thu 19 Nov | 06 Threads | wikilinks, ⌘K, ⌘T/⌘N, panes, views, rebindable keys | Ocean · ocean-tide |
| Tue 24 Nov | 07 Ask the Island | Chat, Conversation notes, a PDF filed beside | Iris · iris-dusk |
| Thu 26 Nov | (Thanksgiving: no episode; repost 01 as a vertical) | | |
| Tue 1 Dec | 08 The Locked Box | secure notes, secret shapes, lock | Midnight · midnight-rain (line style) |
| Thu 3 Dec | 09 Other Shores | Rotli Web, the Helper, opening or importing an Obsidian/ZenNotes folder | Ocean · harbour-day |
| Tue 8 Dec | 10 Seasons | six families, the companion, the Welcome folder and tour | every family · island-sunset |
| Thu 10 Dec | Season recap: `atmosphere-reel` + the full season as one YouTube playlist | | |

**Each episode's week, derived automatically:**
- **Episode day:** the 60 s landscape cut on YouTube, X and LinkedIn.
- **+1 day:** the vertical cut (`s01eNN-*-vertical.mp4`, about 30 s) as a Reel, a Short and on TikTok.
- **+2 days:** the carousel (`exports/s01eNN-*/`), with its cover, four beats and a deep-band close.
- **Saturday:** the card (`exports/s01eNN-*-card/`).

**Why a season after a launch:** launch content earns the first download. A story with a returning character
earns the second look, the follow and the share, and it gives the quokka a reason to exist beyond a logo.
Numbering (`Season One · 03`) and "Next: …" end cards turn single posts into a habit.
