# rotli studio — agent guide

Rotli's media studio, **open source** (MIT) at github.com/SethMed7/rotli-studio, under the same rules as the
rotli repo: the repository is public. Write synthetic data only; never a home path (use `~` or
`/Users/example`), personal email, device name, vault content, Keychain value or real screenshot; client and
private names stay in the gitignored `deploy/private-markers.local.txt`. `bun run check:public` (gitleaks over
history + a scan of the pushed commits' files) runs as the pre-push hook and must pass. The hosted Motion room snapshot is
https://studio.rotli.co (deploy/README.md).

Branches: only the owner can create, update, delete or force-push `main`, `dev` and `release*` (GitHub ruleset
"Owner-only pushes"); `main` and `dev` can never be deleted or force-pushed ("Main and dev integrity"). Agents push
as the owner and never edit rulesets. Two rooms:

- **Create** (`server.ts`, `src/`, `posts/`, `static/`): the content editor (HTML social templates, PNG export) at
  `/create`. **Posts** is different: the Motion room page listing published posts as links (`publish/posts.json`,
  added only with `bun scripts/link-post.ts <url>`, which accepts the owner's accounts only).
- **Motion room** (`motion/`): code-drawn films, shorts, carousels and stills. Read
  `.claude/skills/motion-room/SKILL.md` before touching it; `.claude/skills/repurpose-brand/SKILL.md`
  to reuse it for another product.

The studio site (`bun start` → http://127.0.0.1:4500/, the content editor at /create, published posts at /#/posts; UI rules in DESIGN.md) is the read-only map of the motion room:
series (`motion/series.json`), pieces, briefs, prompts, agent runs (`motion/workflows/runs/`), skills,
tools and the isolation audit (`bun scripts/check-isolation.ts`).

Isolation: nothing the studio makes is written into a product folder (~/rotli and any other product; the list is the gitignored deploy/products.local.txt). Product
repos are READ (brand sources, declared in the audit). Publishing a piece into a product is the owner's
decision and is declared in `publish/placements.json`.

Where things go: `ARCHITECTURE.md` gives every kind of thing exactly one home (series material in
`motion/series/<id>/`, publishing records in `publish/`, docs in `docs/`); add a row there before inventing a new place.

Studies (`motion/series/studies/`, `motion/src/canvas-core/studies/`) are brand-neutral pieces for the fictional
Oriel on the brand-neutral kit (`motion/src/canvas-core/kit/`) and a pack (`motion/brand/packs/`); they never import
Rotli's kit or brand. `bun run verify` runs every gate (typechecks, oxlint, oxfmt, public gate, inventory, sound,
goldens); run `bun run fmt` before committing code.

Rules: do not commit unless asked; never change a sealed piece's pixels (`node motion/tools/studio.mjs golden all`
must print SAME); claims must match rotli.co; the quokka and themes come from the rotli app, never hand-drawn.
