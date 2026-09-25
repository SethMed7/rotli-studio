The Motion room has a coherent visual identity and a useful connection between finished work, source, briefs, and production history. Its main weaknesses are draft safety in Create, asynchronous navigation, accessibility of media and controls, and inconsistent playback behavior. This was a read-only source review against `DESIGN.md` and `~/rotli/DESIGN.md`; I did not run the app, builds, or write-producing checks, and live rotli.co claim verification was unavailable.

## Findings

### Critical

None identified within this review’s scope.

### High

**1. Create can discard unsaved work or incorrectly mark it saved**

**Files:** `src/app.ts:78–83, 93–111, 463–468`

The post selector checks `dirty`, but **New post** calls `createPost()` without that protection; `createPost()` replaces the current `post`. Also, `savePost()` unconditionally sets `dirty = false` when its request finishes, even if the user edited the post while that request was pending.

**Why it matters:** A routine action can discard a draft, or remove the unsaved-changes warning for edits that never reached disk.

**Suggested fix:** Apply one draft-transition guard to every action that replaces the post. Track the saved post identity and revision, and clear `dirty` only when that exact revision is still current.

---

**2. Export continues after a failed save**

**Files:** `src/app.ts:78–84, 426–440`; `server.ts:132–138`

Save failure returns normally:

```ts
if (!res.ok) return status("Could not save");
```

Export then continues after `if (dirty) await savePost()`. The server exports the post read from disk, so an existing post can produce stale PNGs despite showing newer content in the editor.

**Suggested fix:** Make saving return a success result or throw. Abort export on failure, retain the draft, show the error inside the export dialog, and disable duplicate submissions while saving/rendering.

---

**3. Late responses can display another piece’s content**

**Files:** `src/motion/app.ts:181, 205–215, 243–251, 307–334`

Piece requests update whichever matching element exists when they finish:

```ts
body("prompt")!.innerHTML = ...
$("#code").innerHTML = ...
```

Opening piece A and quickly opening B allows A’s response to populate B’s sections. Whole-page loaders such as `brand()` can also finish after a later navigation and replace its page.

**Why it matters:** The displayed source, prompt, or brief can contradict the current title and URL.

**Suggested fix:** Give each navigation a generation ID and `AbortController`; reject stale results before updating the DOM. Capture route-owned elements instead of querying the current global page after an asynchronous operation.

---

**4. “Skip to content” destroys the current page**

**Files:** `static/motion.html:16, 33`; `src/motion/app.ts:308–338`

The skip link uses `href="#main"`, but every hash change enters the router. `#main` becomes an unknown route and renders “Nothing here.” Only `#sec-…` clicks receive special treatment.

Normal navigation also replaces the sidebar and content without moving focus to the new heading or main landmark.

**Suggested fix:** Handle the skip action without changing the route: focus and scroll `#main`. After route completion, move focus predictably to the page heading/main, with deliberate handling for Back/Forward navigation.

---

**5. Core media and scene controls lack useful text alternatives**

**Files:** `src/motion/app.ts:165–168, 186–192`; `src/motion/player.ts:8–15`

Carousel images receive only `alt="slide 1"`-style labels. Scene-seek buttons contain an empty-alt image and no accessible name. Videos have no linked descriptive transcript or description track; their scene IDs and source code do not provide an equivalent viewing experience.

For example, `motion/src/canvas-core/howRotliWorks.ts:28–36` contains instructional text that the generic slide labels do not expose.

**Suggested fix:** Store slide text/descriptions alongside each piece, name scene buttons—for example, “Seek to Just write, 0:03”—and provide readable descriptive transcripts. Add captions for meaningful audio and descriptions where needed, without changing sealed pixels. See W3C’s [text-alternative guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html) and [prerecorded media guidance](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html).

### Medium

**6. Loading failures frequently become permanent loading states**

**Files:** `src/motion/app.ts:137, 211–215, 221, 331, 339–342`; `src/motion/sound.ts:11, 14–19`

The initial manifest fetch is outside the router’s error handling. Prompt, run, source, and sound-prompt requests lack rejection handlers. Golden verification disables its button without a `finally` block. An exception reading `localStorage` in the imported sound module can prevent the entire app from initializing.

**Why it matters:** Visitors can remain on “Loading…” with no explanation or recovery; an optional sound feature can block browsing.

**Suggested fix:** Add a recoverable boot state, section-level errors with Retry, guarded storage access, and `try/finally` for controls. Announce asynchronous progress/results with appropriate status regions.

---

**7. Playback contradicts the design contract; reduced-motion support is incomplete**

**Files:** `DESIGN.md:39–40`; `src/motion/player.ts:19–42`; `src/motion/app.ts:190, 337`; `src/app.ts:208`

The design says **“the landing film only plays when asked.”** The implementation instead calls `video.play()` after an intersection-triggered 700 ms timer.

Reduced-motion users avoid that autoplay, but scene navigation, section navigation, and editor selection explicitly request `behavior: "smooth"`. The CSS `scroll-behavior: auto` override does not replace an explicit JavaScript smooth-scroll request.

**Suggested fix:** Start with a poster and explicit Play action. Centralize scrolling so reduced-motion users receive immediate positioning, and handle preference changes during the session.

---

**8. A remembered “Sound on” toggle does the opposite of its label**

**Files:** `src/motion/sound.ts:38–54`

On a returning visit, the button announces a pressed state and “Turn studio sound off,” but its first click follows:

```ts
if (pending) {
  pending = false;
  void turnOn(button);
}
```

That click starts sound instead of switching it off. Rapid interactions during loading can also launch competing `turnOn()` operations; `load()` treats an allocated context as a completed load.

**Suggested fix:** Separate desired sound state, loading state, and playback readiness. A click on a pressed toggle must turn the preference off immediately. Share one loading promise and honor the latest requested state after it resolves.

---

**9. Sound previews compete with background music**

**Files:** `src/motion/sound.ts:24, 33–35`; `src/motion/app.ts:131–135`

Ducking checks only `document.querySelectorAll("video")`, while the Sound page renders independent `<audio controls>` elements. Previewing Linen with studio sound enabled therefore layers another copy over the background loop; multiple previews can also play together.

**Suggested fix:** Coordinate audio and video playback through one media policy: duck ambience during previews, pause the previous preview, and restore ambience afterward. Give each audio control an accessible name tied to its track heading.

---

**10. Tab and current-page semantics do not match their behavior**

**Files:** `src/motion/app.ts:164, 314`; `static/app.html:16–18`; `src/app.ts:445–450, 488–490`

Piece-format links claim `role="tab"` while navigating to separate routes, without tab panels or arrow-key behavior. Create’s tabs likewise lack panel relationships and keyboard navigation.

Separately, `toggleAttribute("aria-current", true)` produces `aria-current=""`, while the CSS expects `[aria-current='page']` (`static/motion.css:17`).

**Suggested fix:** Use ordinary navigation links with `aria-current="page"` for piece formats. Implement the [WAI tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) for actual in-place tabs, and explicitly set/remove current-page values.

---

**11. The editor’s keyboard flow has avoidable gaps**

**Files:** `static/app.html:71, 76–94`; `src/app.ts:132–152, 212–234, 274–293`

“Upload images” is a non-focusable label around a `hidden` input, leaving no keyboard-reachable upload action. Slide selection in the list is attached to `<li>.onclick`; keyboard users must discover the separate preview buttons. Reordering slides or changing templates replaces the focused controls, and the dialogs lack explicit accessible names.

**Suggested fix:** Use a real upload button, make slide-selection actions native buttons, restore focus after rerenders, and connect dialogs to their headings with `aria-labelledby`.

---

**12. Create has no narrow-window layout**

**Files:** `static/app.css:79–104, 139–146`; `static/app.html:14–31`

The editor permanently reserves `17rem + 21rem` for side panels—608 px at the default root size—before allocating any preview width. Its crowded toolbar does not wrap, and `app.css` contains no responsive breakpoint.

**Why it matters:** Narrow windows and zoom can push controls outside the usable viewport or collapse the preview.

**Suggested fix:** Collapse the inspector and slide list into accessible disclosures/drawers at constrained widths, and wrap or simplify the toolbar while keeping Save and Export reachable.

---

**13. Mobile documentation puts the entire document catalogue before the document**

**Files:** `static/motion.css:302–319`; `src/motion/app.ts:247–248, 255–262, 332`

Below 860 px, the document layout becomes one column and `.doc-list` loses its height limit. Every prompt and brief precedes the selected document; selecting another document then resets the main scroll position to the top.

The same breakpoint flattens sidebar groups into one horizontal strip and hides the episode tree, weakening orientation.

**Suggested fix:** Use a compact, labeled document chooser on narrow screens and focus the loaded article. Preserve grouped navigation through an accessible menu/disclosure rather than an undifferentiated horizontal list.

---

**14. Selected editor rows fail the stated text-contrast requirement**

**Files:** `static/app.css:10–12, 127–135`; `static/motion.css:329–330`; `DESIGN.md:15–17`

Selected slide rows use `--tint: #f2d6c2`, while their numbers and summaries remain `--muted: #6e6155`. Calculated contrast is **4.33:1**, below the **4.5:1** requirement for ordinary text. The Motion room fixes this pairing in its sidebar, but Create does not. [WCAG contrast requirement](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**Suggested fix:** Apply the same selected-row foreground correction to slide numbers, summaries, and action glyphs.

---

**15. Hosted video metadata describes the master, not the served file**

**Files:** `motion/tools/manifest.mjs:63`; `scripts/export-site.ts:59, 88–95`; `src/motion/app.ts:172, 217`

The manifest records the master video’s byte count and hash. The exporter copies that manifest unchanged, then places a re-encoded web video at the same advertised media path.

**Why it matters:** The public page’s “Render” size and “Render sha256” cannot reliably describe the file visitors actually download.

**Suggested fix:** Record separate master and web-copy metadata, clearly label both, and calculate the downloadable file’s size/hash after encoding.

### Low

**16. Fonts and thumbnails transfer more data than their presentation needs**

**Files:** `static/app.css:2–4`; `src/motion/routes.ts:60–65`; `src/motion/app.ts:68, 148`; `static/motion.css:126, 148`

The small wordmark loads `Baloo2-600.ttf`, a **422,332-byte** file, and none of the font declarations specifies `font-display`. Thumbnail generation always uses a 1280 px long edge, including previews displayed only 6rem high; markup supplies no `srcset`/`sizes`.

**Suggested fix:** Supply an appropriately licensed/subsetted WOFF2 wordmark font with a deliberate loading policy. Generate several thumbnail sizes and select them responsively. Runtime performance was not benchmarked.

---

**17. Heading structure and decorative containers drift from the contract**

**Files:** `src/motion/app.ts:68, 111–112, 246–251`; `src/motion/md.ts:29–30`; `static/app.css:201`; `static/motion.css:228`

Library jumps from its page `h1` to series `h3`s. Embedded Markdown preserves its own `h1` beneath the page heading. Noninteractive font specimens and code surfaces also receive complete rounded boxes despite the contract’s restricted border vocabulary (`DESIGN.md:30–32`).

**Suggested fix:** Parameterize series heading levels and normalize embedded-document headings. Flatten font specimens; either simplify code framing or document it as an intentional readability exception.

---

**18. Public copy and documentation links retain local implementation assumptions**

**Files:** `motion/series.json:22`; `src/motion/app.ts:37–39, 122, 144, 274–275`; `scripts/export-site.ts:61`

The “Rotli in 30 seconds” skill link lacks the `../` prefix, resolving under `/m/.claude/…` instead of the repository-level skill. The Skills introduction promises two global skills even though the hosted export explicitly excludes them. Posts leads with owner-push rules and a terminal command before visitors need that information.

**Suggested fix:** Correct the skill path to `../.claude/skills/motion-room/SKILL.md`, derive explanatory copy from the exported data, and move maintainer commands into a disclosure. Introduce the landing page with a plain description of Rotli and the studio’s purpose before production terminology.

## What is good

- **Consistent visual language:** semantic colors, restrained typography, hairline-separated series/episode/tool rows, and no shadow or blur effects.
- **Strong provenance:** pieces connect to their source, briefs, prompts, runs, derivatives, and goldens.
- **Useful accessibility foundations:** named navigation landmarks, native media controls, visible global focus outlines, labeled editor fields, and a live save-status region.
- **Sensible delivery choices:** lazy-loaded gallery images, deferred sound loading, framework-free UI code, minified hashed assets, and fast-start hosted video copies (`scripts/export-site.ts:35–40, 54, 94`).
- **Good separation of surfaces:** the hosted snapshot removes Create and local verification controls.

## Top 5 changes I would make first

1. Protect drafts and make export depend on a confirmed save of the intended revision.
2. Make routing cancellation-safe; repair the skip link and route focus behavior.
3. Add meaningful media alternatives and accessible names to scene controls.
4. Make playback explicit and sound state deterministic, including preview ducking.
5. Add recoverable loading/error states and usable narrow-window layouts, then verify keyboard, screen-reader, reduced-motion, and zoom behavior.