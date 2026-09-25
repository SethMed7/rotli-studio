// PROPOSE BRAND: turn discovery.json into a DRAFT brand pack, every value with the evidence it came from.
//   node tools/propose-brand.mjs discovery/discovery.json [--out brand.proposal/]
// Writes brand.json + themes.json (drop-in shapes for motion/brand/) and evidence.md. It proposes; the
// person confirms in the Q&A (skill: brand-motion-studio). Heuristics, stated so they can be argued with:
//   ground = <body> background · text = <body> colour · band = the most common section colour close to the
//   ground · deep = the darkest section colour · accent = button background, else the most saturated token ·
//   display = <h1> family, its tracking = letter-spacing / font-size · ui = <body> family.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
const d = JSON.parse(readFileSync(process.argv[2], "utf8")),
  out = resolve(process.argv[process.argv.indexOf("--out") + 1] || "brand.proposal"),
  home = d.pages[0];
mkdirSync(out, { recursive: true });
const rgb = (c) => {
  if (!c) return null;
  if (c.startsWith("#")) {
    const h =
      c.length === 4
        ? c
            .slice(1)
            .split("")
            .map((x) => x + x)
            .join("")
        : c.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat([1]);
  }
  const m = c.match(/[\d.]+/g);
  return m ? [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]] : null;
};
const hex = (c) =>
  "#" +
  c
    .slice(0, 3)
    .map((n) => Math.round(n).toString(16).padStart(2, "0"))
    .join("");
const lum = (c) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const sat = (c) => {
  const [r, g, b] = c.map((v) => v / 255),
    mx = Math.max(r, g, b),
    mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};
const mix = (a, b, t) => a.map((v, i) => (i < 3 ? v + (b[i] - v) * t : 1));
const ev = [];
const ground = rgb(home.type.body.background).slice(0, 3),
  textC = rgb(home.type.body.color).slice(0, 3);
ev.push(`ground ${hex(ground)} = body background · text ${hex(textC)} = body colour (${home.url})`);
const secs = d.pages
  .flatMap((p) => p.sections)
  .map((s) => rgb(s.background))
  .filter((c) => c && c[3] > 0.9);
const deep = secs.slice().sort((a, b) => lum(a) - lum(b))[0] ?? mix(textC, [0, 0, 0], 0.2);
ev.push(`deep ${hex(deep)} = darkest section background`);
const near = secs.filter((c) => Math.abs(lum(c) - lum(ground)) < 0.15 && hex(c) !== hex(ground));
const band = near.sort((a, b) => lum(b) - lum(a))[0] ?? mix(ground, textC, 0.05);
ev.push(
  `band ${hex(band)} = ${near.length ? "a section colour close to the ground" : "derived: ground 5% toward text"}`,
);
const tokenColours = Object.entries(home.tokens.root)
  .map(([k, v]) => [k, rgb(v)])
  .filter(([, c]) => c && c.length);
// accent: the most saturated of the button, anything named accent/primary/brand, and mid-tone tokens (sat ≥ 0.35)
const btn = home.type.button && rgb(home.type.button.background);
const cands = [
  ...(btn && btn[3] > 0.5 ? [["button background", btn]] : []),
  ...tokenColours.filter(([k]) => /accent|primary|brand/i.test(k)),
  ...tokenColours.filter(([, c]) => lum(c) > 0.08 && lum(c) < 0.6),
]
  .map(([k, c]) => [k, c.slice(0, 3)])
  .filter(([, c]) => sat(c) >= 0.35);
// priority: a token named exactly --accent/--primary/--brand, then the button, then the most saturated
const rank = ([k]) => (/^--(accent|primary|brand)(-color)?$/i.test(k) ? 0 : k === "button background" ? 1 : 2);
const accentPick = cands.sort((a, b) => rank(a) - rank(b) || sat(b[1]) - sat(a[1]))[0] ?? [
  "text (no saturated colour found)",
  textC,
];
const accent = accentPick[1];
ev.push(
  `accent ${hex(accent)} = ${accentPick[0]}; other candidates: ${[...new Set(cands.map(([k, c]) => `${k} ${hex(c)}`))].slice(1, 6).join(", ") || "none"}`,
);
ev.push(
  `deep candidates (darkest first): ${[
    ...new Set(
      secs
        .slice()
        .sort((a, b) => lum(a) - lum(b))
        .map(hex),
    ),
  ]
    .slice(0, 4)
    .join(", ")}`,
);
const tint = mix(ground, accent, 0.22),
  border = mix(ground, textC, 0.13),
  muted = mix(textC, ground, 0.35),
  surface = mix(ground, [255, 255, 255], 0.6),
  surface2 = band;
const nightText = mix(ground, [255, 255, 255], 0.3),
  nightSurface = mix(deep, nightText, 0.06),
  nightSurface2 = mix(deep, nightText, 0.12),
  nightBorder = mix(deep, nightText, 0.16),
  nightMuted = mix(nightText, deep, 0.35);
const accentText = lum(accent) > 0.25 ? mix(accent, textC, 0.45) : accent;
const h1 = home.type.h1 ?? home.type.body,
  family = (f) =>
    f
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
const track = parseFloat(h1.letterSpacing) / parseFloat(h1.size) || 0;
ev.push(
  `display ${h1.family.split(",")[0]} ${h1.weight}, tracking ${track.toFixed(3)}em (h1 ${h1.size}, ${h1.letterSpacing}) · ui ${home.type.body.family.split(",")[0]}`,
);
const name = (home.title.split(/[—|·-]/)[0] || new URL(d.url).hostname).trim();
const brand = {
  product: name,
  wordmark: name,
  tagline: (home.claims.find((c) => c.kind === "h1")?.heading ?? "").replace(/([a-z])([A-Z])/g, "$1 $2"),
  url: new URL(d.url).hostname,
  platform: "",
  voice: "(confirm in the Q&A)",
  fonts: {
    ui: family(home.type.body.family),
    display: family(h1.family),
    word: family(h1.family),
    mono: "Menlo, 'SF Mono', monospace",
    tracking: +track.toFixed(3),
    files: [],
    note: "font files: add only with the owner's confirmation of the licence",
  },
  palette: {
    linen: hex(ground),
    surface: hex(surface),
    surface2: hex(surface2),
    peach: hex(tint),
    border: hex(border),
    cocoa: hex(textC),
    ink: hex(textC),
    muted: hex(muted),
    clay: hex(accent),
    clayText: hex(accentText),
    olive: hex(accent),
    oliveText: hex(accentText),
    oliveBright: hex(mix(accent, [255, 255, 255], 0.3)),
    blue: hex(accent),
    night: hex(deep),
    nightSurface: hex(nightSurface),
    nightSurface2: hex(nightSurface2),
    nightText: hex(nightText),
    nightMuted: hex(nightMuted),
    nightBorder: hex(nightBorder),
    sea: "#7fcfc6",
    seaDeep: "#3fa3a6",
    seaLine: "#e9fbf6",
    sand: "#f1e3c4",
    limestone: "#e6d3ad",
    lake: "#f0a7a0",
    bush: "#8d9a76",
    bushDark: "#6d7a58",
    sky: hex(mix(ground, [255, 255, 255], 0.3)),
    badge: "#d8503f",
  },
  mark: null,
  pattern: null,
  themes: "brand/themes.json",
  character: {
    name: "(none: a mascot is added via tools/import-quokka.py-style import, or the pieces run typographic)",
  },
};
const role = (g, s, s2, t, tx, m, b, a, at, ok) => ({
  ground: hex(g),
  surface: hex(s),
  "surface-2": hex(s2),
  tint: hex(t),
  text: hex(tx),
  "text-muted": hex(m),
  border: hex(b),
  accent: hex(a),
  "accent-text": hex(at),
  "on-accent": lum(a) > 0.4 ? hex(tx) : "#ffffff",
  success: hex(ok),
  failure: "#9f3d3d",
  "syntax-blue": hex(a),
});
const fam = name.split(/\s+/)[0];
const themes = {
  source: `${d.url} (proposed by tools/propose-brand.mjs)`,
  themes: [
    {
      id: `${fam.toLowerCase()}-light`,
      family: fam,
      mode: "light",
      label: `${fam} Light`,
      roles: role(ground, surface, surface2, tint, textC, muted, border, accent, accentText, accent),
    },
    {
      id: `${fam.toLowerCase()}-dark`,
      family: fam,
      mode: "dark",
      label: `${fam} Dark`,
      roles: role(
        deep,
        nightSurface,
        nightSurface2,
        mix(deep, accent, 0.25),
        nightText,
        nightMuted,
        nightBorder,
        mix(accent, [255, 255, 255], 0.2),
        mix(accent, [255, 255, 255], 0.35),
        mix(accent, [255, 255, 255], 0.3),
      ),
    },
  ],
};
writeFileSync(join(out, "brand.json"), JSON.stringify(brand, null, 1) + "\n");
writeFileSync(join(out, "themes.json"), JSON.stringify(themes, null, 1) + "\n");
const claims = d.pages.flatMap((p) => [
  ...p.claims.filter((c) => c.body.length).map((c) => `- "${c.heading}": ${c.body[0].slice(0, 220)} [${p.url}]`),
  ...p.faq.map((f) => `- Q "${f.q}": ${f.a.slice(0, 220)} [${p.url}]`),
]);
writeFileSync(
  join(out, "evidence.md"),
  `# Brand proposal for ${d.url}\n\n## How each value was chosen\n\n${ev.map((e) => `- ${e}`).join("\n")}\n\n## Claims found (the only wording pieces may use, once the owner confirms)\n\n${claims.slice(0, 80).join("\n")}\n\n## Screens\n\n${d.pages.map((p) => `- ${p.url}: ${p.shot}`).join("\n")}\n`,
);
console.log(`proposal -> ${out}/{brand.json, themes.json, evidence.md}`);
ev.forEach((e) => console.log(`  ${e}`));
console.log(`  claims: ${claims.length}`);
