// Registers an episode + its three derivatives in pieces.json (idempotent):  node tools/add-episode.mjs 1 write "About line" "Caption"
import { readFileSync, writeFileSync } from "node:fs";
const [no, name, about, caption] = process.argv.slice(2),
  nn = String(no).padStart(2, "0"),
  id = `ep${nn}${name[0].toUpperCase()}${name.slice(1)}`,
  slug = `ep${nn}-${name}`;
const f = JSON.parse(readFileSync("pieces.json", "utf8")),
  keep = f.pieces.filter((p) => !p.id.startsWith(`ep${nn}`));
keep.push(
  { id, kind: "video", slug, format: "film", length: "30 s", about: `Rotli in 30 seconds · ${nn}: ${about}` },
  {
    id: `ep${nn}Vertical`,
    kind: "video",
    slug: `${slug}-vertical`,
    format: "story",
    length: "~18 s",
    about: `Vertical cut of episode ${nn}.`,
  },
  {
    id: `ep${nn}Carousel`,
    kind: "carousel",
    slug,
    format: "ig-portrait",
    about: `Carousel of episode ${nn}: four slides, one beat each, the last signed rotli.co.`,
    caption,
  },
  {
    id: `ep${nn}Single`,
    kind: "still",
    slug: `${slug}-card`,
    format: "ig-portrait",
    about: `Card for episode ${nn}.`,
    caption,
  },
);
f.pieces = keep.sort((a, b) => (a.id.startsWith("ep") && b.id.startsWith("ep") ? a.id.localeCompare(b.id) : 0));
writeFileSync("pieces.json", JSON.stringify(f, null, 1) + "\n");
console.log(`registered ${id} + 3 derivatives`);
