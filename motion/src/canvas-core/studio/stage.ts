// THE STAGE: formats, brand, themes, fonts and companion looks, read from brand/ so every piece
// shares one source of truth. A second product swaps brand/ (see SKILL.md "repurpose").
import BRAND from "../../../brand/brand.json";
import COMPANIONS from "../../../brand/companions.json";
import THEMES from "../../../brand/themes.json";
import { C } from "../rotli/kit";

export { BRAND };
/** exact platform sizes (the studio's src/model.ts table, plus the 16:9 film) */
export const FORMATS = {
  film: [1920, 1080], story: [1080, 1920], "ig-portrait": [1080, 1350], "ig-square": [1080, 1080], "x-post": [1600, 900], linkedin: [1200, 627],
} as const;
export type Format = keyof typeof FORMATS;
/** the font manifest every piece embeds (build-page verifies each file's sha256 against brand.json) */
export const FONTS: Record<string, string> = Object.fromEntries(BRAND.fonts.files.map((f) => [f.spec, f.file]));
export type ThemeRoles = Record<"ground" | "surface" | "surface-2" | "tint" | "text" | "text-muted" | "border" | "accent" | "accent-text" | "on-accent" | "success" | "failure" | "syntax-blue", string>;
export type Theme = { id: string; family: string; mode: "light" | "dark"; label: string; roles: ThemeRoles };
export const THEME_LIST = THEMES.themes as Theme[];
export const theme = (id: string) => THEME_LIST.find((t) => t.id === id)!;
export type LookId = (typeof COMPANIONS.looks)[number]["id"];
export const LOOKS = COMPANIONS.looks;
/** image manifest for companion looks (rendered from the app's real <Character>) */
export const lookAssets = (ids: readonly string[]) => Object.fromEntries(ids.map((id) => [`look:${id}`, `../library/companion-looks/${id}.png`]));
export const STYLE_NAME = BRAND.character.styles as Record<string, string>;
export const STYLE_HEX: Record<string, string> = { line: "#ffffff", cocoa: "#C6845F", green: "#6FA68B", ocean: "#6EABD4", iris: "#A58BD9", berry: "#C97998", amber: "#D9A84C" };

// ---------------------------------------------------------------- the episode's theme FAMILY
// A piece picks one of rotli's six families ONCE, at module load (never per frame): the kit palette
// (C) and the UI's LIGHT/DARK themes are re-pointed at that family's light and dark environments,
// so grounds, captions, accents, UI and chips all speak one theme. Pieces that never call it (the
// sealed film, the shorts) keep the Rotli family. Deterministic: same piece, same family, same pixels.
/** a theme family id: the first word of a theme's family, lowercased ("rotli", "paper", "ocean", …, or another brand's) */
export type Family = string;
const FAMILY_IDS: Record<string, [string, string]> = { rotli: ["light", "dark"], paper: ["paper", "charcoal"], ocean: ["ocean-light", "ocean-dark"], grove: ["grove-light", "grove-dark"], iris: ["iris-light", "iris-dark"], midnight: ["midnight-light", "midnight-dark"] };
/** the companion colour that belongs with each family */
export const FAMILY_QUOKKA: Record<string, string> = { rotli: "#C6845F", paper: "#C6845F", ocean: "#6EABD4", grove: "#6FA68B", iris: "#A58BD9", midnight: "#C6845F" };
export const LOOK = { family: "rotli" as Family, quokka: "#C6845F" };
const familyKey = (name: string) => name.toLowerCase().split(/[^a-z]+/)[0];
/** a family's [light, dark] themes, read from the brand's themes.json (any product), else Rotli's known ids */
export const familyThemes = (fam: Family): [Theme, Theme] => {
  const L = THEME_LIST.find((t) => familyKey(t.family) === fam && t.mode === "light"), D = THEME_LIST.find((t) => familyKey(t.family) === fam && t.mode === "dark");
  if (L && D) return [L, D];
  if (FAMILY_IDS[fam]) return FAMILY_IDS[fam].map(theme) as [Theme, Theme];
  throw new Error(`no theme family '${fam}' in brand/themes.json`);
};
/** the brand's first family (the default environment) */
export const firstFamily = () => familyKey(THEME_LIST[0].family);
export const useFamily = (fam: Family, uiLight?: Theme, uiDark?: Theme) => {
  // an atmosphere written for another brand's family (e.g. "ocean") falls back to this brand's first family
  const known = THEME_LIST.some((t) => familyKey(t.family) === fam) || FAMILY_IDS[fam] && THEME_LIST.some((t) => t.id === FAMILY_IDS[fam][0]);
  const [L, D] = familyThemes(known ? fam : firstFamily()), l = L.roles, d = D.roles;
  Object.assign(C, { linen: l.ground, surface: l.surface, surface2: l["surface-2"], peach: l.tint, border: l.border, cocoa: l.text, ink: l.text, muted: l["text-muted"], clay: l.accent, clayText: l["accent-text"], olive: l.success, oliveText: l.success, oliveBright: d.success, blue: l["syntax-blue"],
    night: d.ground, nightSurface: d.surface, nightSurface2: d["surface-2"], nightText: d.text, nightMuted: d["text-muted"], nightBorder: d.border });
  if (uiLight) Object.assign(uiLight, L); if (uiDark) Object.assign(uiDark, D);
  LOOK.family = fam; LOOK.quokka = FAMILY_QUOKKA[fam] ?? LOOK.quokka;
};
