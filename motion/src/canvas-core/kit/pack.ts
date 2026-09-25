// BRAND PACKS: the brand-neutral kit's one seam. A pack is a folder, brand/packs/<id>/, holding pack.json
// (product, fonts with their sha256, named palettes) and its font files. A piece imports the pack it uses and
// calls usePack() once, so two pieces in one studio can wear two brands. Rotli's own pieces use brand/ through
// the Rotli kit (rotli/, studio/); this kit never reads it.
//
//   import PACK from "../../../brand/packs/studio/pack.json";
//   const P = usePack(PACK), pal = P.palette("night");
//   assets: { images: {}, fonts: P.assets }
export type Palette = {
  ground: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accent2: string;
  [role: string]: string;
};
export type PackJson = {
  id: string;
  name: string;
  product: string;
  url: string;
  fonts: {
    sans: string;
    serif: string;
    italic: string;
    mono: string;
    files: { spec: string; file: string; sha256: string }[];
  };
  palettes: Record<string, Palette>;
};
export type Pack = PackJson & {
  /** the font manifest a Film embeds (build-page checks every file against the pack's sha256) */
  assets: Record<string, string>;
  palette(id: string): Palette;
  /** font families by role */
  face: { sans: string; serif: string; italic: string; mono: string };
};

export function usePack(json: PackJson): Pack {
  const assets = Object.fromEntries(json.fonts.files.map((f) => [f.spec, f.file]));
  return {
    ...json,
    assets,
    face: { sans: json.fonts.sans, serif: json.fonts.serif, italic: json.fonts.italic, mono: json.fonts.mono },
    palette: (id) => {
      const p = json.palettes[id];
      if (!p)
        throw new Error(`pack ${json.id} has no palette "${id}" (it has: ${Object.keys(json.palettes).join(", ")})`);
      return p;
    },
  };
}
