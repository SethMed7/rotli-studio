// The wallpaper maker (the studio site's /wallpapers): pick a screen, a background and, if you want one, a quokka (colour, emotion,
// what it wears, where it stands), or start from a preset; the preview redraws live and the download is drawn in
// the visitor's browser at the screen's full size. Every pixel comes from paintWallpaper
// (src/canvas-core/wallpapers.ts), the same function tools/wallpapers.mjs holds to a golden. Its own bundle (the
// site server builds /build/wallpapers.js from here), loaded only on that page, so the landing never carries the
// drawing engine. It lives in the motion room so the engine's own tsconfig checks it.
import type { Env, Layer } from "../canvas-core/core";
import {
  ACCESSORIES,
  ACCESSORY_HUES,
  accessoryHex,
  BACKGROUNDS,
  backgroundOf,
  boxOf,
  COLOURS,
  designOf,
  EMOTIONS,
  lookFile,
  lookId,
  maskId,
  PLACES,
  PRESETS,
  SIZES,
  paintWallpaper,
  WALLPAPER_SCREENS,
  type Place,
  type QuokkaSpec,
  type Size,
  type WallpaperScreen,
  type WallpaperSpec,
} from "../canvas-core/wallpapers";
import { STYLE_HEX } from "../canvas-core/studio/stage";

const esc = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type State = { screen: WallpaperScreen; spec: WallpaperSpec; last: QuokkaSpec };
const SCREENS = Object.keys(WALLPAPER_SCREENS) as WallpaperScreen[];
const PLACE_LABEL: Record<Place, string> = { left: "Left", centre: "Centre", right: "Right" };
const SIZE_LABEL: Record<Size, string> = { small: "Small", medium: "Medium", large: "Large" };

// ---------------------------------------------------------------- drawing
const looks = new Map<string, Promise<HTMLImageElement>>();
const loaded = new Map<string, HTMLImageElement>();
const loadLook = (id: string) => {
  let p = looks.get(id);
  if (!p) {
    p = new Promise<HTMLImageElement>((ok, fail) => {
      const img = new Image();
      img.onload = () => (loaded.set(id, img), ok(img));
      img.onerror = () => (looks.delete(id), fail(new Error(`the quokka image ${id} did not load`)));
      img.src = `/${lookFile(id)}`;
    });
    looks.set(id, p);
  }
  return p;
};
/** the images a spec draws: its look and, for a filled accessory, the accessory's colour mask */
const neededLooks = (spec: WallpaperSpec) =>
  spec.quokka
    ? [lookId(spec.quokka, backgroundOf(spec.background).dark), maskId(spec.quokka)].filter(
        (x): x is string => x !== null,
      )
    : [];

const cache = new Map<string, unknown>();
const envFor = (W: number, H: number, scale: number): Env => ({
  W,
  H,
  scale,
  cache,
  canvas: (w, h): Layer => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return { canvas: c, ctx: c.getContext("2d")! };
  },
  image: (name) => loaded.get(name.replace(/^look:/, "")),
});

/** draw `spec` for `screen` into `canvas` at `pxWidth` device pixels wide; resolves once its quokka has loaded */
async function draw(canvas: HTMLCanvasElement, screen: WallpaperScreen, spec: WallpaperSpec, pxWidth: number) {
  await Promise.all(neededLooks(spec).map(loadLook));
  const b = boxOf(screen),
    scale = pxWidth / b.W;
  canvas.width = Math.round(b.W * scale);
  canvas.height = Math.round(b.H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paintWallpaper(ctx, envFor(b.W, b.H, scale), spec, b);
}

// ---------------------------------------------------------------- the page
const radio = (name: string, value: string, label: string, on: boolean, extra = "") =>
  `<label class="seg-opt${extra ? ` ${extra}` : ""}"><input type="radio" name="${name}" value="${esc(value)}"${on ? " checked" : ""}><span>${label}</span></label>`;
const seg = (name: string, label: string, opts: string, hideLegend = false) =>
  `<fieldset class="seg" role="radiogroup"><legend${hideLegend ? ' class="sr"' : ""}>${esc(label)}</legend><div class="seg-track">${opts}</div></fieldset>`;

export function mountWallpapers(main: HTMLElement, narrow: boolean) {
  const st: State = {
    screen: narrow ? "iphone" : "mac",
    spec: structuredClone(PRESETS[0]!.spec),
    last: structuredClone(PRESETS[0]!.spec.quokka!),
  };
  let preset: string | null = PRESETS[0]!.id;

  main.innerHTML = `<nav class="crumbs"><a href="/">Studio</a> › Wallpapers</nav><header class="page-head"><h1>Wallpapers</h1><p>Make your own: pick a screen, a background and a quokka, dress it, then download it at full size. Drawn in your browser by the engine that makes the films. Free to use.</p></header>
    <section class="wp-presets" aria-labelledby="wp-presets-h"><h2 id="wp-presets-h">Start from a preset</h2><ul class="wp-preset-row"></ul></section>
    <div class="wp-maker">
      <form class="wp-steps" aria-label="Your wallpaper">
        <section><h2>1 · Screen</h2><div data-part="screen"></div><p class="meta wp-fits"></p></section>
        <section><h2>2 · Background</h2><div data-part="background"></div></section>
        <section><h2>3 · Quokka</h2><div data-part="quokka"></div></section>
        <section><h2>4 · Download</h2><button class="button wp-download" type="button"></button><p class="meta wp-note" role="status"></p></section>
      </form>
      <figure class="wp-preview"><canvas aria-label="Preview of your wallpaper"></canvas></figure>
    </div>`;
  const $ = <T extends Element>(sel: string) => main.querySelector(sel) as T;
  const form = $<HTMLFormElement>(".wp-steps"),
    preview = $<HTMLCanvasElement>(".wp-preview canvas"),
    note = $<HTMLParagraphElement>(".wp-note"),
    button = $<HTMLButtonElement>(".wp-download");

  const renderScreen = () => {
    $<HTMLElement>("[data-part=screen]").innerHTML = seg(
      "screen",
      "Screen",
      SCREENS.map((s) => radio("screen", s, esc(WALLPAPER_SCREENS[s].label), s === st.screen)).join(""),
      true,
    );
    const [w, h] = WALLPAPER_SCREENS[st.screen].out;
    $<HTMLElement>(".wp-fits").textContent = `${w} × ${h} · ${WALLPAPER_SCREENS[st.screen].fits}`;
    button.textContent = `Download PNG · ${w} × ${h}`;
    main.querySelector(".wp-maker")!.classList.toggle("tall", h > w);
  };

  // backgrounds: plain grounds as swatches, scenes as small drawn thumbnails
  const renderBackground = () => {
    const plain = BACKGROUNDS.filter((b) => b.group === "plain"),
      scenes = BACKGROUNDS.filter((b) => b.group === "scene");
    $<HTMLElement>("[data-part=background]").innerHTML = `
      <fieldset class="wp-swatches" role="radiogroup"><legend>Plain</legend>${plain
        .map(
          (b) =>
            `<label class="wp-swatch" title="${esc(b.title)}"><input type="radio" name="background" value="${b.id}"${b.id === st.spec.background ? " checked" : ""}><canvas data-bg="${b.id}" aria-hidden="true"></canvas><span>${esc(b.title)}</span></label>`,
        )
        .join("")}</fieldset>
      <fieldset class="wp-scenes" role="radiogroup"><legend>Scenes</legend>${scenes
        .map(
          (b) =>
            `<label class="wp-scene"><input type="radio" name="background" value="${b.id}"${b.id === st.spec.background ? " checked" : ""}><canvas data-bg="${b.id}" aria-hidden="true"></canvas><span>${esc(b.title)}</span></label>`,
        )
        .join("")}</fieldset>`;
    main
      .querySelectorAll<HTMLCanvasElement>("canvas[data-bg]")
      .forEach(
        (c) => void draw(c, st.screen, { background: c.dataset.bg!, quokka: null }, c.closest(".wp-swatch") ? 64 : 180),
      );
  };

  const renderQuokka = () => {
    const q = st.spec.quokka ?? st.last,
      on = st.spec.quokka !== null;
    const dark = backgroundOf(st.spec.background).dark;
    $<HTMLElement>("[data-part=quokka]").innerHTML =
      seg("with", "Quokka", radio("with", "yes", "With a quokka", on) + radio("with", "no", "No quokka", !on), true) +
      (on
        ? `<fieldset class="wp-colours" role="radiogroup"><legend>Colour</legend>${COLOURS.map(
            (c) =>
              `<label class="wp-colour" title="${esc(c.label)}"><input type="radio" name="style" value="${c.id}"${c.id === q.style ? " checked" : ""}><span class="dot${c.id === "line" ? (dark ? " line dark" : " line") : ""}"${c.id === "line" ? "" : ` style="--dot:${STYLE_HEX[c.id]}"`}></span><span>${esc(c.label)}</span></label>`,
          ).join("")}</fieldset>` +
          seg("pose", "Emotion", EMOTIONS.map((e) => radio("pose", e.pose, esc(e.label), e.pose === q.pose)).join("")) +
          seg(
            "accessory",
            "Wearing",
            ACCESSORIES.map((a) => radio("accessory", a.id, esc(a.label), a.id === q.accessory)).join(""),
          ) +
          `<fieldset class="wp-colours wp-hues" role="radiogroup"${maskId(q) ? "" : " hidden"}><legend>Its colour</legend>${ACCESSORY_HUES.map(
            (h) =>
              `<label class="wp-colour" title="${esc(h.label)}"><input type="radio" name="hue" value="${h.hue}"${h.hue === q.hue ? " checked" : ""}><span class="dot" style="--dot:${accessoryHex(h.hue)}"></span><span>${esc(h.label)}</span></label>`,
          ).join("")}</fieldset>` +
          seg("place", "Stands", PLACES.map((p) => radio("place", p, PLACE_LABEL[p], p === q.place)).join("")) +
          seg("size", "Size", SIZES.map((s) => radio("size", s, SIZE_LABEL[s], s === q.size)).join(""))
        : "");
  };

  const renderPresets = () => {
    const tall = WALLPAPER_SCREENS[st.screen].out[1] > WALLPAPER_SCREENS[st.screen].out[0];
    const row = $<HTMLUListElement>(".wp-preset-row");
    row.classList.toggle("tall", tall);
    row.innerHTML = PRESETS.map(
      (p) =>
        `<li><button type="button" class="wp-preset" data-preset="${p.id}"${p.id === preset ? ' aria-current="true"' : ""}><canvas aria-hidden="true"></canvas><span>${esc(p.title)}</span></button></li>`,
    ).join("");
    row
      .querySelectorAll<HTMLButtonElement>(".wp-preset")
      .forEach(
        (b) =>
          void draw(
            b.querySelector("canvas")!,
            st.screen,
            PRESETS.find((p) => p.id === b.dataset.preset)!.spec,
            tall ? 110 : 200,
          ),
      );
  };

  let drawing = 0;
  const redraw = async () => {
    const mine = ++drawing,
      w = Math.round(preview.getBoundingClientRect().width * (window.devicePixelRatio || 1)) || 800;
    try {
      const off = document.createElement("canvas");
      await draw(off, st.screen, st.spec, w);
      if (mine !== drawing) return; // a newer choice already asked for its own frame
      preview.width = off.width;
      preview.height = off.height;
      preview.getContext("2d")!.drawImage(off, 0, 0);
      note.textContent = "";
    } catch (e) {
      if (mine === drawing) note.textContent = e instanceof Error ? e.message : String(e);
    }
  };

  const everything = () => {
    renderScreen();
    renderBackground();
    renderQuokka();
    renderPresets();
    void redraw();
  };

  form.addEventListener("change", (ev) => {
    const t = ev.target as HTMLInputElement;
    preset = null;
    main.querySelector(".wp-preset[aria-current]")?.removeAttribute("aria-current");
    if (t.name === "screen") {
      st.screen = t.value as WallpaperScreen;
      renderScreen();
      renderBackground();
      renderPresets();
    } else if (t.name === "background") {
      st.spec.background = t.value;
      renderQuokka(); // the line colour's dot follows the ground
    } else if (t.name === "with") {
      st.spec.quokka = t.value === "yes" ? { ...st.last } : null;
      renderQuokka();
    } else if (st.spec.quokka) {
      const qk = st.spec.quokka as Record<string, string | number>;
      qk[t.name] = t.name === "hue" ? Number(t.value) : t.value;
      st.last = { ...st.spec.quokka };
      // what it wears can only be coloured when it is filled (line quokkas wear outlines)
      main.querySelector(".wp-hues")?.toggleAttribute("hidden", maskId(st.spec.quokka) === null);
    }
    void redraw();
  });

  main.querySelector(".wp-preset-row")!.addEventListener("click", (ev) => {
    const b = (ev.target as Element).closest<HTMLButtonElement>(".wp-preset");
    if (!b) return;
    const p = PRESETS.find((x) => x.id === b.dataset.preset)!;
    preset = p.id;
    st.spec = structuredClone(p.spec);
    if (p.spec.quokka) st.last = { ...p.spec.quokka };
    main
      .querySelectorAll(".wp-preset")
      .forEach((x) => (x === b ? x.setAttribute("aria-current", "true") : x.removeAttribute("aria-current")));
    renderBackground();
    renderQuokka();
    void redraw();
  });

  button.addEventListener("click", async () => {
    const [w, h] = WALLPAPER_SCREENS[st.screen].out,
      { scale } = designOf(st.screen),
      b = boxOf(st.screen);
    button.disabled = true;
    note.textContent = `Drawing ${w} × ${h}…`;
    try {
      await Promise.all(neededLooks(st.spec).map(loadLook));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      paintWallpaper(ctx, envFor(b.W, b.H, scale), st.spec, b);
      const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
      // a browser past its canvas limit (Safari on iPhone and iPad) hands back nothing or an empty image
      if (!blob || blob.size < 1000) throw new Error("too big");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `rotli-wallpaper-${st.spec.background}-${st.screen}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      note.textContent = `Saved ${a.download} (${(blob.size / 1e6).toFixed(1)} MB).`;
    } catch (e) {
      note.textContent =
        e instanceof Error && e.message === "too big"
          ? `This browser can't draw a ${w} × ${h} picture. Try a desktop browser, or a smaller screen size.`
          : `The wallpaper couldn't be drawn: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      button.disabled = false;
    }
  });

  let resize = 0;
  const onResize = () => {
    clearTimeout(resize);
    resize = window.setTimeout(() => void redraw(), 150);
  };
  window.addEventListener("resize", onResize);
  window.addEventListener("studio:route", () => window.removeEventListener("resize", onResize), { once: true });
  everything();
}
