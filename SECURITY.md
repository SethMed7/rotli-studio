# Security

The studio is a public repository and a static, read-only website. Its local server and editor run only on
the owner's Mac.

## Reporting a problem

Do not open a public issue for a suspected vulnerability or a leak (a secret, a personal path or a private name
that reached the repository or studio.rotli.co). Use **Security → Report a vulnerability** on the repository
(GitHub private vulnerability reporting). Include the affected file or URL, what you observed, and a minimal
synthetic reproduction. Never attach real personal data.

## What the studio protects, and how

| Boundary | Protection |
|---|---|
| The public repository | `bun run check:public` scans the committed bytes of every pushed commit (gitleaks over history, plus secrets, home paths, personal emails and private names). It runs as the pre-push hook and in CI. |
| The hosted site | `scripts/export-site.ts` publishes an explicit inventory of git-tracked files and manifest-referenced media, scans every staged file with the same rules, and refuses to build without the private-name list. Caddy serves it with a strict Content-Security-Policy, `nosniff` and no framing. |
| The local server | Binds `127.0.0.1` only, answers only its own Host (a foreign Host gets 403), serves only git-tracked files under an allowlist, and serves uploads sandboxed. |
| Product repositories | Read-only for the studio; `bun scripts/check-isolation.ts` proves nothing is written into them. |
| Deploys | Only the owner can push `main`. The deploy workflow uses a Railway token scoped to this project; secrets live in GitHub, never in the repository. |

Reviews and their triage are kept in `docs/reviews/`.
