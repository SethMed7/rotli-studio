// The wallpaper maker (the studio site's /wallpapers): pick a screen, a background (and, if you like, a colour of your
// own to grade it in, or flat) and, if you want one, a quokka (colour, emotion, what it wears; drag it on the preview to
// place it, and size it by hand), or start from a preset; the preview redraws live and the download is drawn in
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
  boxOf,
  clampAt,
  COLOURS,
  CUSTOM_BG,
  designOf,
  EMOTIONS,
  isDarkSpec,
  lookFile,
  lookId,
  maskId,
  PLACES,
  placement,
  PRESETS,
  SCALE_RANGE,
  paintWallpaper,
  WALLPAPER_SCREENS,
  type Place,
  type QuokkaSpec,
  type Tint,
  type WallpaperScreen,
  type WallpaperSpec,
} from "../canvas-core/wallpapers";
import { STYLE_HEX } from "../canvas-core/studio/stage";

const esc = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type State = { screen: WallpaperScreen; spec: WallpaperSpec; last: QuokkaSpec; tint: Tint };
const SCREENS = Object.keys(WALLPAPER_SCREENS) as WallpaperScreen[];
const PLACE_LABEL: Record<Place, string> = { left: "Left", centre: "Centre", right: "Right" };
/** a few colours to start from (the picker takes any) */
const TINT_CHIPS = ["#c97e62", "#d9a84c", "#6fa68b", "#3f8f8a", "#6eabd4", "#5b6ee1", "#a58bd9", "#c97998", "#3a3028"];

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
    ? [lookId(spec.quokka, isDarkSpec(spec)), maskId(spec.quokka)].filter((x): x is string => x !== null)
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
    tint: { hex: "#6eabd4", amount: 0 },
  };
  /** the spec's tint follows the state: on for the flat colour, or when the scene is graded at all */
  const syncTint = () =>
    (st.spec.tint = st.spec.background === CUSTOM_BG || st.tint.amount > 0 ? { ...st.tint } : null);
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
      <figure class="wp-preview"><canvas tabindex="0" aria-label="Preview of your wallpaper. Drag the quokka to place it, or use the arrow keys."></canvas><figcaption class="meta wp-hint"></figcaption></figure>
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
    const pct = Math.round(st.tint.amount * 100);
    $<HTMLElement>("[data-part=background]").innerHTML = `
      <fieldset class="wp-swatches" role="radiogroup"><legend>Plain</legend>${plain
        .map(
          (b) =>
            `<label class="wp-swatch" title="${esc(b.title)}"><input type="radio" name="background" value="${b.id}"${b.id === st.spec.background ? " checked" : ""}><canvas data-bg="${b.id}" aria-hidden="true"></canvas><span>${esc(b.title)}</span></label>`,
        )
        .join(
          "",
        )}<label class="wp-swatch" title="Your colour, flat"><input type="radio" name="background" value="${CUSTOM_BG}"${st.spec.background === CUSTOM_BG ? " checked" : ""}><canvas data-bg="${CUSTOM_BG}" aria-hidden="true"></canvas><span>Your colour</span></label></fieldset>
      <fieldset class="wp-scenes" role="radiogroup"><legend>Scenes</legend>${scenes
        .map(
          (b) =>
            `<label class="wp-scene"><input type="radio" name="background" value="${b.id}"${b.id === st.spec.background ? " checked" : ""}><canvas data-bg="${b.id}" aria-hidden="true"></canvas><span>${esc(b.title)}</span></label>`,
        )
        .join("")}</fieldset>
      <fieldset class="wp-tint"><legend>Your colour</legend>
        <div class="wp-tint-row"><label class="wp-pick" title="Any colour"><input type="color" name="tintHex" value="${st.tint.hex}" aria-label="Pick any colour"><span class="dot" style="--dot:${st.tint.hex}"></span></label>${TINT_CHIPS.map(
          (h) =>
            `<button type="button" class="wp-chip" data-tint="${h}" title="${h}" aria-label="Use ${h}"${h === st.tint.hex ? ' aria-pressed="true"' : ""}><span class="dot" style="--dot:${h}"></span></button>`,
        ).join("")}</div>
        <label class="wp-range"><span>Colour the scene</span><input type="range" name="tintAmount" min="0" max="100" step="1" value="${pct}"${st.spec.background === CUSTOM_BG ? " disabled" : ""}><output>${st.spec.background === CUSTOM_BG ? "flat" : `${pct}%`}</output></label>
      </fieldset>`;
    drawThumbs();
  };
  /** the background thumbnails, drawn in your colour when the scene is graded (a few at a time, newest wins) */
  let thumbsRun = 0;
  const drawThumbs = () => {
    const run = ++thumbsRun;
    const tint = st.tint.amount > 0 ? { ...st.tint } : null;
    main.querySelectorAll<HTMLCanvasElement>("canvas[data-bg]").forEach((c) => {
      if (run !== thumbsRun) return;
      const id = c.dataset.bg!;
      void draw(
        c,
        st.screen,
        { background: id, quokka: null, tint: id === CUSTOM_BG ? { ...st.tint } : tint },
        c.closest(".wp-swatch") ? 64 : 180,
      );
    });
  };

  const renderQuokka = () => {
    const q = st.spec.quokka ?? st.last,
      on = st.spec.quokka !== null;
    const dark = isDarkSpec(st.spec);
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
          seg(
            "place",
            "Stands",
            PLACES.map((p) => radio("place", p, PLACE_LABEL[p], !q.at && p === q.place)).join("") +
              radio("place", "hand", "Where I put it", !!q.at),
          ) +
          `<label class="wp-range"><span>Size</span><input type="range" name="scale" min="${Math.round(SCALE_RANGE[0] * 100)}" max="${Math.round(SCALE_RANGE[1] * 100)}" step="1" value="${Math.round(heightShare(q) * 100)}"><output>${Math.round(heightShare(q) * 100)}%</output></label>`
        : "");
    $<HTMLElement>(".wp-hint").textContent = on ? "Drag the quokka to place it (or use the arrow keys)." : "";
    preview.classList.toggle("draggable", on);
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

  /** the quokka's height as a share of the short side, as drawn now */
  const heightShare = (q: QuokkaSpec) => {
    const b = boxOf(st.screen);
    return placement(b, q).h / Math.min(b.W, b.H);
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
      syncTint();
      renderBackground(); // the strength slider is off for the flat colour
      renderQuokka(); // the line colour's dot follows the ground
    } else if (t.name === "tintHex" || t.name === "tintAmount" || t.name === "scale") {
      return; // handled live on input
    } else if (t.name === "with") {
      st.spec.quokka = t.value === "yes" ? { ...st.last } : null;
      renderQuokka();
    } else if (st.spec.quokka) {
      const qk = st.spec.quokka;
      if (t.name === "place") {
        if (t.value === "hand") qk.at = qk.at ?? currentAt(qk);
        else {
          qk.place = t.value as Place;
          delete qk.at;
        }
      } else if (t.name === "hue") qk.hue = Number(t.value);
      else if (t.name === "pose" || t.name === "style" || t.name === "accessory") qk[t.name] = t.value;
      st.last = { ...st.spec.quokka };
      // what it wears can only be coloured when it is filled (line quokkas wear outlines)
      main.querySelector(".wp-hues")?.toggleAttribute("hidden", maskId(st.spec.quokka) === null);
    }
    void redraw();
  });

  // live controls: your colour and its strength, and the quokka's size
  let thumbsTimer = 0;
  form.addEventListener("input", (ev) => {
    const t = ev.target as HTMLInputElement;
    if (t.name === "tintHex" || t.name === "tintAmount") {
      if (t.name === "tintHex") {
        st.tint.hex = t.value;
        t.nextElementSibling?.setAttribute("style", `--dot:${t.value}`);
        main.querySelectorAll(".wp-chip").forEach((c) => c.removeAttribute("aria-pressed"));
      } else {
        st.tint.amount = Number(t.value) / 100;
        t.nextElementSibling!.textContent = `${t.value}%`;
      }
      unpreset();
      syncTint();
      clearTimeout(thumbsTimer);
      thumbsTimer = window.setTimeout(drawThumbs, 120);
      void redraw();
    } else if (t.name === "scale" && st.spec.quokka) {
      st.spec.quokka.scale = Number(t.value) / 100;
      t.nextElementSibling!.textContent = `${t.value}%`;
      st.last = { ...st.spec.quokka };
      unpreset();
      void redraw();
    }
  });
  form.addEventListener("click", (ev) => {
    const chip = (ev.target as Element).closest<HTMLButtonElement>(".wp-chip");
    if (!chip) return;
    st.tint.hex = chip.dataset.tint!;
    if (st.tint.amount === 0 && st.spec.background !== CUSTOM_BG) st.tint.amount = 0.65; // a chip means "use it"
    unpreset();
    syncTint();
    renderBackground();
    void redraw();
  });
  const unpreset = () => {
    preset = null;
    main.querySelector(".wp-preset[aria-current]")?.removeAttribute("aria-current");
  };

  // placing by hand: drag on the preview (or arrow keys); the feet follow the pointer
  /** where the quokka stands now, as shares of the frame (for switching to "where I put it" without a jump) */
  const currentAt = (q: QuokkaSpec) => {
    const b = boxOf(st.screen),
      p = placement(b, q);
    return { x: p.x / b.W, y: p.y / b.H };
  };
  const setAt = (at: { x: number; y: number }) => {
    const q = st.spec.quokka;
    if (!q) return;
    const b = boxOf(st.screen);
    q.at = clampAt(b, at, placement(b, q).h);
    st.last = { ...q };
    unpreset();
    const hand = main.querySelector<HTMLInputElement>('input[name="place"][value="hand"]');
    if (hand && !hand.checked) hand.checked = true;
    void redraw();
  };
  const atPointer = (ev: PointerEvent) => {
    const r = preview.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height };
  };
  let dragging = false,
    grab = { x: 0, y: 0 };
  preview.addEventListener("pointerdown", (ev) => {
    const q = st.spec.quokka;
    if (!q) return;
    const p = atPointer(ev),
      at = q.at ?? currentAt(q),
      b = boxOf(st.screen),
      h = placement(b, q).h / b.H,
      w = (h * b.H) / b.W;
    // grabbing the quokka keeps the hold point under the pointer; a click elsewhere moves it there
    const onIt = Math.abs(p.x - at.x) < w * 0.55 && p.y < at.y + 0.02 && p.y > at.y - h;
    grab = onIt ? { x: at.x - p.x, y: at.y - p.y } : { x: 0, y: 0 };
    dragging = true;
    preview.setPointerCapture(ev.pointerId);
    preview.classList.add("dragging");
    setAt({ x: p.x + grab.x, y: p.y + grab.y });
  });
  preview.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    const p = atPointer(ev);
    setAt({ x: p.x + grab.x, y: p.y + grab.y });
  });
  const endDrag = () => {
    dragging = false;
    preview.classList.remove("dragging");
  };
  preview.addEventListener("pointerup", endDrag);
  preview.addEventListener("pointercancel", endDrag);
  preview.addEventListener("keydown", (ev) => {
    const q = st.spec.quokka;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (!q || !d) return;
    ev.preventDefault();
    const step = ev.shiftKey ? 0.05 : 0.01,
      at = q.at ?? currentAt(q);
    setAt({ x: at.x + d[0]! * step, y: at.y + d[1]! * step });
  });

  main.querySelector(".wp-preset-row")!.addEventListener("click", (ev) => {
    const b = (ev.target as Element).closest<HTMLButtonElement>(".wp-preset");
    if (!b) return;
    const p = PRESETS.find((x) => x.id === b.dataset.preset)!;
    preset = p.id;
    st.spec = structuredClone(p.spec);
    st.tint.amount = 0; // a preset is drawn as made; your colour stays picked for when you grade again
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
      a.download = `rotli-wallpaper-${st.spec.background}${st.spec.tint ? `-${st.spec.tint.hex.slice(1)}` : ""}-${st.screen}.png`;
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
