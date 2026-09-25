// Register a Season episode and its three derivatives in pieces.json from its brief (idempotent):
//   node tools/add-story.mjs season/episodes/s01e01.json
import { readFileSync, writeFileSync } from "node:fs";
const b = JSON.parse(readFileSync(process.argv[2], "utf8")), base = b.id.replace(/^(s\d+e\d+).*/, "$1"), f = JSON.parse(readFileSync("pieces.json", "utf8"));
const caption = `${b.logline} ${b.features.map((x) => x.claim).slice(0, 2).join(" ")} rotli.co`;
f.pieces = f.pieces.filter((p) => !p.id.startsWith(base)).concat([
  { id: b.id, kind: "video", slug: b.slug, format: "film", length: "60 s", about: `Season One · ${String(b.no).padStart(2, "0")} ${b.title.join(" ")} ${b.logline}` },
  { id: `${base}Vertical`, kind: "video", slug: `${b.slug}-vertical`, format: "story", length: "~30 s", about: `Vertical cut of Season One · ${String(b.no).padStart(2, "0")}.` },
  { id: `${base}Carousel`, kind: "carousel", slug: b.slug, format: "ig-portrait", about: `Carousel of Season One · ${String(b.no).padStart(2, "0")}.`, caption },
  { id: `${base}Single`, kind: "still", slug: `${b.slug}-card`, format: "ig-portrait", about: `Card for Season One · ${String(b.no).padStart(2, "0")}.`, caption },
]);
writeFileSync("pieces.json", JSON.stringify(f, null, 1) + "\n"); console.log(`registered ${b.id} + 3 derivatives`);
