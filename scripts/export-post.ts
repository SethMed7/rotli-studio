// Export a saved post from the command line while the studio is running:
//   bun run export <slug> [format ...]     e.g. bun run export meet-rotli ig-portrait x-post
import { FORMATS, type FormatId } from "../src/model";

const [slug, ...formats] = process.argv.slice(2);
if (!slug) {
  console.error(`usage: bun run export <slug> [${Object.keys(FORMATS).join(" | ")} ...]`);
  process.exit(1);
}
const origin = `http://127.0.0.1:${process.env.PORT ?? 4500}`;
const res = await fetch(`${origin}/api/export/${slug}`, {
  method: "POST",
  body: JSON.stringify(formats.length ? { formats: formats as FormatId[] } : {}),
}).catch(() => null);
if (!res) {
  console.error(`The studio isn't running at ${origin}. Start it with: bun start`);
  process.exit(1);
}
const data = (await res.json()) as { dir?: string; files?: string[]; error?: string };
if (!res.ok) {
  console.error(data.error);
  process.exit(1);
}
console.log(`${data.files?.length} files → ${data.dir}`);
