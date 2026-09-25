// Scaffold a Season episode from its brief:  node tools/new-episode.mjs series/season-one/episodes/s01e02.json
// Writes src/canvas-core/<id>.ts (a RUNNABLE stub: one scene per brief scene, each drawing its template
// note as an intertitle, the chapter card and end card already real) and src/hosts/page-<id>.ts.
// Refuses to overwrite an existing episode. The builder (a person or an agent) replaces each stub draw.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const b = JSON.parse(readFileSync(process.argv[2], "utf8")), file = `src/canvas-core/${b.id}.ts`, base = b.id.replace(/^(s\d+e\d+).*/, "$1");
if (existsSync(file)) { console.error(`${file} exists; refusing to overwrite`); process.exit(1); }
const scene = (sc) => sc.id === "chapter" ? `const chapter: Scene = { id: "chapter", len: ${sc.len}, draw: (ctx, env, s) => chapterCard(ctx, env, s, { no: ${b.no}, title: ${JSON.stringify(b.title)}, pose: "base" }) };`
  : sc.id === "end" ? `const end: Scene = { id: "end", len: ${sc.len}, draw: (ctx, env, s) => storyEnd(ctx, env, s, { next: ${JSON.stringify(b.next || undefined)} }) };`
  : `const ${sc.id}: Scene = { id: "${sc.id}", len: ${sc.len}, draw: (ctx, env, s) => {\n  // TODO (${sc.template})\n  intertitle(ctx, s, [${JSON.stringify(sc.id)}], { sub: ${JSON.stringify(sc.template)} }); host(ctx, env, s.f, { dark: s.dark });\n} };`;
writeFileSync(file, `// SEASON ONE · ${String(b.no).padStart(2, "0")} — ${b.title.join(" ").toUpperCase()} (60 s). Brief: series/season-one/episodes/${base}.json
// Setup: ${b.story.setup}
// Turn: ${b.story.turn}
// Payoff: ${b.story.payoff}
import type { Film } from "./film";
import type { DeriveSpec } from "./studio/derive";
import { chapterCard, host, intertitle, story, storyEnd, type Scene } from "./studio/story";

${b.scenes.map(scene).join("\n")}

const SCENES = [${b.scenes.map((s) => s.id).join(", ")}];
export const ${b.id}: Film = story({ id: "${b.id}", no: ${b.no}, title: ${JSON.stringify(b.title.join(" "))}, atmosphere: "${b.atmosphere}", scenes: SCENES, score: ${JSON.stringify(b.music)} });

// TODO: frames and crops from the rendered episode (see workflows/review-checklist.md)
export const ${base}Derive: DeriveSpec = { no: ${b.no}, series: "season-one", label: "Rotli · Season One · ${String(b.no).padStart(2, "0")}", vertical: [], slides: [], single: { frame: 400, crop: { x: 160, y: 120, w: 1600, h: 800 }, title: ${JSON.stringify(b.title.join(" "))} } };
`);
writeFileSync(`src/hosts/page-${b.id}.ts`, `import { ${b.id} } from "../canvas-core/${b.id}";\nimport { mountFilm } from "./page";\nmountFilm(${b.id});\n`);
console.log(`scaffolded ${file} (${b.scenes.length} scenes, ${b.scenes.reduce((a, s) => a + s.len, 0)} frames) + host`);
