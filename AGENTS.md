# rotli studio — agent guide

Rotli's media studio, **open source** (MIT) at github.com/SethMed7/rotli-studio, under the same rules as the
rotli repo: the repository is public. Write synthetic data only; never a home path (use `~` or
`/Users/example`), personal email, device name, vault content, Keychain value or real screenshot; client and
private names stay in the gitignored `deploy/private-markers.local.txt`. `bun run check:public` (gitleaks over
history + tracked-file scan) runs as the pre-push hook and must pass. The hosted Motion room snapshot is
https://studio.rotli.co (deploy/README.md).

Branches: only the owner can create, update, delete or force-push `main`, `dev` and `release*` (GitHub ruleset
"Owner-only pushes"); `main` and `dev` can never be deleted or force-pushed ("Main and dev integrity"). Agents push
as the owner and never edit rulesets. Two rooms:

- **Posts** (`server.ts`, `src/`, `posts/`, `static/`): HTML social templates, `bun start` → :4500. See README.md.
- **Motion room** (`motion/`): code-drawn films, shorts, carousels and stills. Read
  `.claude/skills/motion-room/SKILL.md` before touching it; `.claude/skills/repurpose-brand/SKILL.md`
  to reuse it for another product.

The studio site (`bun start` → http://127.0.0.1:4500/motion) is the read-only map of the motion room:
series (`motion/series.json`), pieces, briefs, prompts, agent runs (`motion/workflows/runs/`), skills,
tools and the isolation audit (`bun scripts/check-isolation.ts`).

Isolation: nothing the studio makes is written into a product folder (~/rotli and any other product; the list is the gitignored deploy/products.local.txt). Product
repos are READ (brand sources, declared in the audit). Publishing a piece into a product is the owner's
decision and is declared in `motion/published.json`.

Rules: do not commit unless asked; never change a sealed piece's pixels (`node motion/tools/studio.mjs golden all`
must print SAME); claims must match rotli.co; the quokka and themes come from the rotli app, never hand-drawn.
