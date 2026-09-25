// Render the exact agent prompt for an episode from its brief:  node tools/brief-to-prompt.mjs series/season-one/episodes/s01e02.json
// = workflows/agent-preamble.md (the proven instructions) + the episode section built from the brief. Deterministic:
// the same brief always yields the same prompt, so any episode can be rebuilt or re-made by re-running this.
import { readFileSync } from "node:fs";
const b = JSON.parse(readFileSync(process.argv[2], "utf8")), base = b.id.replace(/^(s\d+e\d+).*/, "$1");
const hi = (b.title[b.title.length - 1].replace(/[.,]/g, "").split(" ").pop() || b.title[0]).trim();
const pre = readFileSync(new URL("../workflows/agent-preamble.md", import.meta.url), "utf8").replaceAll("{{ID}}", b.id).replaceAll("{{BASE}}", base).replaceAll("{{COVER}}", b.title.join("|")).replaceAll("{{HI}}", hi);
console.log(`${pre}
--- THE EPISODE (from ${process.argv[2]}) ---
Title card: ${JSON.stringify(b.title)} · Season One · ${String(b.no).padStart(2, "0")} · next: ${b.next || "(season end: storyEnd with no next)"}
Logline: ${b.logline}
Setup: ${b.story.setup}
Turn: ${b.story.turn}
Payoff: ${b.story.payoff}
Token: ${b.token}. Cast: ${b.cast.join(", ")}.
Atmosphere: ${b.atmosphere}${b.visits.length ? ` (visits: ${b.visits.join(", ")})` : ""} · style: ${b.style} · music: ${JSON.stringify(b.music)}
Feature claims (the ONLY wording allowed in captions):
${b.features.map((f) => `  - "${f.claim}" [${f.source}]`).join("\n")}
Scenes (id · frames · what):
${b.scenes.map((s) => `  - ${s.id} · ${s.len} · ${s.template}`).join("\n")}
`);
