// The studio editor: pick or create a post, edit its slides in a live preview
// strip, write captions, save to posts/<slug>.json, and export PNGs.
import {
  CAPTION_LIMITS,
  MAX_SLIDES,
  FORMATS,
  TEMPLATES,
  THEMES,
  blankSlide,
  slugify,
  type Field,
  type FormatId,
  type LibraryItem,
  type Post,
  type Slide,
  type TemplateId,
  type ThemeId,
} from "./model";

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
/** A DOM element with properties and children. Props are loosely typed on
 * purpose: the full per-tag type makes TypeScript's unions explode. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

let post: Post;
let selected = 0;
let dirty = false;
// every edit bumps `revision`; a save clears `dirty` only if no edit happened while it was in flight
let revision = 0,
  savedRevision = 0;
let libraryItems: LibraryItem[] = [];
const frames: HTMLIFrameElement[] = [];

const SHELF_LABELS: Record<string, string> = {
  logo: "Logo",
  "quokka-line": "Quokka · line art",
  "quokka-large": "Quokka · filled, large",
  "quokka-cocoa": "Quokka · cocoa",
  "quokka-green": "Quokka · green",
  companions: "Companion looks",
  captures: "Product captures",
  themes: "Theme captures",
  patterns: "Patterns",
  uploads: "Your uploads",
  fonts: "Fonts",
  colors: "Colors",
};
const SHELF_ORDER = Object.keys(SHELF_LABELS);

function status(text: string): void {
  $("#status").textContent = text;
}

function markDirty(): void {
  revision++;
  dirty = true;
  status("Unsaved changes");
}

/* ---------- Posts ---------- */

async function listPosts(): Promise<{ slug: string; title: string }[]> {
  return (await fetch("/api/posts")).json();
}

async function loadPost(slug: string): Promise<void> {
  post = await (await fetch(`/api/posts/${slug}`)).json();
  selected = 0;
  dirty = false;
  revision = savedRevision = 0;
  localStorage.setItem("studio:last", slug);
  status("");
  renderAll();
}

/** Save the current post; true only when the server stored it. */
async function savePost(): Promise<boolean> {
  const rev = revision;
  const res = await fetch(`/api/posts/${post.slug}`, { method: "PUT", body: JSON.stringify(post) }).catch(() => null);
  if (!res?.ok) {
    status("Could not save");
    return false;
  }
  savedRevision = Math.max(savedRevision, rev);
  dirty = revision !== savedRevision;
  status(
    dirty ? "Unsaved changes" : `Saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
  );
  await fillPostSelect();
  return true;
}

async function fillPostSelect(): Promise<void> {
  const posts = await listPosts();
  const select = $<HTMLSelectElement>("#post-select");
  select.replaceChildren(...posts.map((p) => el("option", { value: p.slug, textContent: p.title })));
  if (post) select.value = post.slug;
}

async function createPost(from?: Post): Promise<void> {
  if (!from && dirty && !confirm("Discard unsaved changes?")) return; // a duplicate keeps the unsaved edits in the copy
  const title = prompt("Name the new post", from ? `${from.title} (copy)` : "New post");
  if (!title) return;
  const existing = new Set((await listPosts()).map((p) => p.slug));
  let slug = slugify(title);
  for (let n = 2; existing.has(slug); n++) slug = `${slugify(title).slice(0, 44)}-${n}`;
  post = from
    ? { ...structuredClone(from), slug, title }
    : {
        slug,
        title,
        format: "ig-portrait",
        counter: true,
        captions: { instagram: "", x: "", linkedin: "" },
        slides: [blankSlide()],
      };
  selected = 0;
  revision = savedRevision = 0;
  dirty = false;
  await savePost();
  renderAll();
}

/* ---------- Rendering ---------- */

function renderAll(): void {
  $<HTMLInputElement>("#post-title").value = post.title;
  $<HTMLSelectElement>("#post-format").value = post.format;
  $<HTMLInputElement>("#post-counter").checked = post.counter;
  $<HTMLSelectElement>("#post-select").value = post.slug;
  renderSlideList();
  renderStrip();
  renderInspector();
  renderCaptions();
  $<HTMLButtonElement>("#add-slide").disabled = post.slides.length >= MAX_SLIDES;
}
/** refuse a fifth slide: X takes at most four images in one post */
function full(): boolean {
  if (post.slides.length < MAX_SLIDES) return false;
  status(`A post has at most ${MAX_SLIDES} slides (the most X takes in one post).`);
  return true;
}

function summary(slide: Slide): string {
  const text = slide.fields.headline || slide.fields.title || slide.fields.lines || "";
  return text.replace(/\n/g, " ");
}

function renderSlideList(): void {
  const list = $("#slide-list");
  list.replaceChildren(
    ...post.slides.map((slide, i) => {
      const row = el(
        "li",
        {},
        el("span", { className: "num", textContent: String(i + 1) }),
        el(
          "span",
          { className: "what" },
          el("b", { textContent: TEMPLATES[slide.template].label }),
          el("span", { textContent: summary(slide) }),
        ),
        el(
          "span",
          { className: "row-actions" },
          el("button", {
            title: "Move up",
            ariaLabel: "Move slide up",
            textContent: "↑",
            onclick: (e: MouseEvent) => {
              e.stopPropagation();
              move(i, -1);
            },
          }),
          el("button", {
            title: "Move down",
            ariaLabel: "Move slide down",
            textContent: "↓",
            onclick: (e: MouseEvent) => {
              e.stopPropagation();
              move(i, 1);
            },
          }),
          el("button", {
            title: "Duplicate",
            ariaLabel: "Duplicate slide",
            textContent: "⧉",
            onclick: (e: MouseEvent) => {
              e.stopPropagation();
              duplicate(i);
            },
          }),
          el("button", {
            title: "Delete",
            ariaLabel: "Delete slide",
            textContent: "×",
            onclick: (e: MouseEvent) => {
              e.stopPropagation();
              remove(i);
            },
          }),
        ),
      );
      row.setAttribute("aria-current", String(i === selected));
      row.onclick = () => select(i);
      return row;
    }),
  );
}

function thumbScale(): number {
  const { w, h } = FORMATS[post.format];
  const stage = $(".strip");
  const maxH = Math.max(240, stage.clientHeight - 40);
  return Math.min(maxH / h, 520 / w);
}

function renderStrip(): void {
  const strip = $("#strip");
  const { w, h } = FORMATS[post.format];
  const scale = thumbScale();
  frames.length = 0;
  strip.replaceChildren(
    ...post.slides.map((_, i) => {
      const frame = el("iframe", { src: "/render", title: `Slide ${i + 1}`, width: String(w), height: String(h) });
      frame.style.transform = `scale(${scale})`;
      frame.dataset.index = String(i);
      frames.push(frame);
      const wrap = el(
        "button",
        { className: "thumb", ariaLabel: `Edit slide ${i + 1}`, onclick: () => select(i) },
        frame,
        el("span", { className: "n", textContent: String(i + 1) }),
      );
      wrap.style.width = `${w * scale}px`;
      wrap.style.height = `${h * scale}px`;
      wrap.setAttribute("aria-current", String(i === selected));
      return wrap;
    }),
  );
}

function sendSlide(i: number): void {
  const frame = frames[i];
  const slide = post.slides[i];
  if (!frame?.contentWindow || !slide) return;
  frame.contentWindow.postMessage(
    { type: "slide", slide, format: post.format, index: i, total: post.slides.length, counter: post.counter },
    location.origin,
  );
}

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.data?.type !== "render-ready") return;
  const i = frames.findIndex((frame) => frame.contentWindow === event.source);
  if (i >= 0) sendSlide(i);
});

function refreshAll(): void {
  frames.forEach((_, i) => sendSlide(i));
}

function select(i: number): void {
  selected = i;
  document.querySelectorAll<HTMLElement>(".thumb").forEach((t, n) => t.setAttribute("aria-current", String(n === i)));
  document
    .querySelectorAll<HTMLElement>("#slide-list li")
    .forEach((t, n) => t.setAttribute("aria-current", String(n === i)));
  document.querySelectorAll(".thumb")[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  renderInspector();
}

function move(i: number, by: number): void {
  const j = i + by;
  if (j < 0 || j >= post.slides.length) return;
  const [slide] = post.slides.splice(i, 1);
  post.slides.splice(j, 0, slide!);
  selected = j;
  markDirty();
  renderAll();
}

function duplicate(i: number): void {
  if (full()) return;
  post.slides.splice(i + 1, 0, structuredClone(post.slides[i]!));
  selected = i + 1;
  markDirty();
  renderAll();
}

function remove(i: number): void {
  if (post.slides.length === 1) return status("A post needs at least one slide");
  post.slides.splice(i, 1);
  selected = Math.min(selected, post.slides.length - 1);
  markDirty();
  renderAll();
}

/* ---------- Inspector ---------- */

function fieldInput(field: Field, slide: Slide): HTMLElement {
  const value = slide.fields[field.key] ?? "";
  const update = (next: string) => {
    slide.fields[field.key] = next;
    markDirty();
    sendSlide(selected);
    renderSlideList();
  };
  if (field.type === "toggle") {
    const input = el("input", { type: "checkbox", checked: value === "on" });
    input.onchange = () => update(input.checked ? "on" : "");
    return el("label", { className: "check" }, input, field.label);
  }
  if (field.type === "image") {
    const preview = el("span", { className: "preview" });
    const paint = () =>
      (preview.style.backgroundImage = slide.fields[field.key] ? `url("${slide.fields[field.key]}")` : "none");
    paint();
    const choose = el("button", {
      className: "ghost",
      type: "button",
      textContent: "Choose…",
      onclick: () =>
        pickImage((url) => {
          update(url);
          paint();
        }),
    });
    const clear = el("button", {
      className: "ghost",
      type: "button",
      textContent: "Remove",
      onclick: () => {
        update("");
        paint();
      },
    });
    return el(
      "div",
      { className: "field" },
      el("span", { textContent: field.label }),
      el("div", { className: "image-field" }, preview, el("div", { className: "buttons" }, choose, clear)),
      ...(field.hint ? [el("small", { textContent: field.hint })] : []),
    );
  }
  const input =
    field.type === "text"
      ? el("input", { type: "text", value })
      : el("textarea", { value, rows: field.type === "lines" ? 8 : 3 });
  input.oninput = () => update(input.value);
  return el(
    "label",
    { className: "field" },
    el("span", { textContent: field.label }),
    input,
    ...(field.hint ? [el("small", { textContent: field.hint })] : []),
  );
}

function renderInspector(): void {
  const slide = post.slides[selected];
  const host = $("#inspector");
  if (!slide) return host.replaceChildren();
  const template = el(
    "select",
    {
      onchange: () => {
        slide.template = template.value as TemplateId;
        markDirty();
        sendSlide(selected);
        renderSlideList();
        renderInspector();
      },
    },
    ...Object.entries(TEMPLATES).map(([id, t]) =>
      el("option", { value: id, textContent: t.label, selected: id === slide.template }),
    ),
  );
  const theme = el(
    "select",
    {
      onchange: () => {
        slide.theme = theme.value as ThemeId;
        markDirty();
        sendSlide(selected);
      },
    },
    ...Object.entries(THEMES).map(([id, label]) =>
      el("option", { value: id, textContent: label, selected: id === slide.theme }),
    ),
  );
  host.replaceChildren(
    el("h2", { textContent: `Slide ${selected + 1}` }),
    el(
      "label",
      { className: "field" },
      el("span", { textContent: "Template" }),
      template,
      el("small", { textContent: TEMPLATES[slide.template].description }),
    ),
    el("label", { className: "field" }, el("span", { textContent: "Background" }), theme),
    ...TEMPLATES[slide.template].fields.map((field) => fieldInput(field, slide)),
  );
}

function renderCaptions(): void {
  const host = $("#captions");
  host.replaceChildren(
    ...(Object.keys(CAPTION_LIMITS) as (keyof Post["captions"])[]).map((network) => {
      const limit = CAPTION_LIMITS[network];
      const count = el("small", { className: "caption-count" });
      const area = el("textarea", { value: post.captions[network], rows: network === "x" ? 4 : 7 });
      const paint = () => {
        count.textContent = `${area.value.length} / ${limit}`;
        count.classList.toggle("over", area.value.length > limit);
      };
      area.oninput = () => {
        post.captions[network] = area.value;
        markDirty();
        paint();
      };
      paint();
      const label = { instagram: "Instagram", x: "X", linkedin: "LinkedIn" }[network];
      return el("label", { className: "field" }, el("span", { textContent: label }), area, count);
    }),
  );
}

/* ---------- Library ---------- */

async function loadLibrary(): Promise<void> {
  libraryItems = await (await fetch("/api/library")).json();
}

function isImage(item: LibraryItem): boolean {
  return /\.(png|jpe?g|webp|svg|gif)$/i.test(item.name);
}

function shelfSection(shelf: string, items: LibraryItem[], onPick: (item: LibraryItem) => void): HTMLElement {
  const wide = ["captures", "themes"].includes(shelf);
  const grid = el("div", { className: `grid${wide ? " wide" : ""}` });
  for (const item of items) {
    const img = el("span", { className: "img" });
    img.style.backgroundImage = `url("${item.url}")`;
    grid.append(
      el(
        "button",
        {
          className: `tile${shelf === "quokka-line" || shelf === "logo" ? " line" : ""}`,
          title: item.url,
          onclick: () => onPick(item),
        },
        img,
        el("b", { textContent: item.name }),
        el("small", { textContent: `${Math.max(1, Math.round(item.bytes / 1024))} KB` }),
      ),
    );
  }
  return el(
    "section",
    { className: "shelf" },
    el("h2", {}, SHELF_LABELS[shelf] ?? shelf, el("span", { textContent: ` · ${items.length}` })),
    grid,
  );
}

function byShelf(filter: (item: LibraryItem) => boolean): [string, LibraryItem[]][] {
  const groups = new Map<string, LibraryItem[]>();
  for (const item of libraryItems.filter(filter)) groups.set(item.shelf, [...(groups.get(item.shelf) ?? []), item]);
  return [...groups.entries()].sort(([a], [b]) => SHELF_ORDER.indexOf(a) - SHELF_ORDER.indexOf(b));
}

async function renderLibrary(): Promise<void> {
  await loadLibrary();
  const host = $("#library");
  const sections: HTMLElement[] = [];
  for (const [shelf, items] of byShelf(isImage)) {
    sections.push(
      shelfSection(shelf, items, async (item) => {
        await navigator.clipboard.writeText(item.url).catch(() => {});
        status(`Copied ${item.url}`);
      }),
    );
  }
  const colors = libraryItems.find((i) => i.shelf === "colors");
  if (colors) {
    const tokens = (await (await fetch(colors.url)).json()) as {
      core: Record<string, string>;
      supporting: Record<string, string>;
    };
    const swatches = el("div", { className: "swatches" });
    for (const [name, hex] of Object.entries({ ...tokens.core, ...tokens.supporting })) {
      const chip = el("div");
      chip.style.background = hex;
      swatches.append(
        el(
          "button",
          {
            className: "swatch",
            title: `Copy ${hex}`,
            onclick: () => {
              void navigator.clipboard.writeText(hex);
              status(`Copied ${hex}`);
            },
          },
          chip,
          el("p", {}, `${name} `, el("code", { textContent: hex })),
        ),
      );
    }
    sections.push(el("section", { className: "shelf" }, el("h2", { textContent: "Colors" }), swatches));
  }
  sections.push(
    el(
      "section",
      { className: "shelf" },
      el("h2", { textContent: "Fonts" }),
      el(
        "div",
        { className: "grid wide" },
        el(
          "div",
          { className: "font-sample" },
          el("p", { textContent: "rotli", className: "sample-wordmark" }),
          el("small", { textContent: "Baloo 2 SemiBold · the wordmark only" }),
        ),
        el(
          "div",
          { className: "font-sample" },
          el("p", { textContent: "Room to think.", className: "sample-body" }),
          el("small", { textContent: "General Sans · Regular, Medium, Semibold" }),
        ),
      ),
    ),
  );
  host.replaceChildren(...sections);
}

function pickImage(onPick: (url: string) => void): void {
  const dialog = $<HTMLDialogElement>("#picker");
  const grid = $("#picker-grid");
  const draw = () =>
    grid.replaceChildren(
      ...byShelf((item) => isImage(item) && item.shelf !== "patterns").map(([shelf, items]) =>
        shelfSection(shelf, items, (item) => {
          onPick(item.url);
          dialog.close();
        }),
      ),
    );
  void loadLibrary().then(draw);
  dialog.showModal();
}

async function upload(files: FileList | File[]): Promise<void> {
  const form = new FormData();
  for (const file of files) form.append("file", file);
  const res = await (await fetch("/api/upload", { method: "POST", body: form })).json();
  status(`Uploaded ${res.saved.length} file${res.saved.length === 1 ? "" : "s"}`);
  await renderLibrary();
}

/* ---------- Export ---------- */

function openExport(): void {
  const host = $("#export-formats");
  host.replaceChildren(
    ...(Object.entries(FORMATS) as [FormatId, (typeof FORMATS)[FormatId]][]).map(([id, f]) =>
      el(
        "label",
        { className: "check" },
        el("input", { type: "checkbox", value: id, checked: id === post.format }),
        `${f.label} · ${f.w} × ${f.h}`,
      ),
    ),
  );
  $("#export-result").replaceChildren();
  $<HTMLDialogElement>("#export-dialog").showModal();
}

async function runExport(): Promise<void> {
  const formats = [...document.querySelectorAll<HTMLInputElement>("#export-formats input:checked")].map((i) => i.value);
  if (!formats.length) return;
  const result = $("#export-result"),
    go = $<HTMLButtonElement>("#export-go");
  // export renders what is on disk: never export a post whose save failed
  if (dirty && !(await savePost()))
    return void result.replaceChildren(
      el("p", { textContent: "Could not save the post, so nothing was exported. Your changes are still here." }),
    );
  go.disabled = true;
  result.replaceChildren(el("p", { textContent: "Rendering…" }));
  let res: Response, data: { error?: string; files: string[] };
  try {
    res = await fetch(`/api/export/${post.slug}`, { method: "POST", body: JSON.stringify({ formats }) });
    data = await res.json();
  } catch {
    return void result.replaceChildren(el("p", { textContent: "Export failed: the studio server did not answer." }));
  } finally {
    go.disabled = false;
  }
  if (!res.ok) return void result.replaceChildren(el("p", { textContent: data.error ?? "Export failed" }));
  result.replaceChildren(
    el("p", { textContent: `${data.files.length} files written.` }),
    el(
      "ul",
      {},
      ...data.files.map((f: string) =>
        el(
          "li",
          {},
          el("a", { href: f, target: "_blank", textContent: decodeURIComponent(f.replace("/exports/", "")) }),
        ),
      ),
    ),
    el("button", {
      className: "ghost",
      type: "button",
      textContent: "Show in Finder",
      onclick: () => fetch(`/api/reveal/${post.slug}`, { method: "POST" }),
    }),
  );
  status("Exported");
}

/* ---------- Wiring ---------- */

function showTab(tab: "create" | "library"): void {
  $("#tab-create").setAttribute("aria-selected", String(tab === "create"));
  $("#tab-library").setAttribute("aria-selected", String(tab === "library"));
  $("#view-create").hidden = tab !== "create";
  $("#view-library").hidden = tab !== "library";
  if (tab === "library") void renderLibrary();
}

async function boot(): Promise<void> {
  $("#bar-mark").innerHTML = await (await fetch("/library/logo/_logo.svg")).text();
  $<HTMLSelectElement>("#post-format").replaceChildren(
    ...Object.entries(FORMATS).map(([id, f]) => el("option", { value: id, textContent: `${f.label} · ${f.w}×${f.h}` })),
  );
  $<HTMLSelectElement>("#add-template").replaceChildren(
    ...Object.entries(TEMPLATES).map(([id, t]) => el("option", { value: id, textContent: t.label })),
  );
  $("#tab-create").onclick = () => showTab("create");
  $("#tab-library").onclick = () => showTab("library");
  $<HTMLSelectElement>("#post-select").onchange = (e) => {
    if (dirty && !confirm("Discard unsaved changes?"))
      return void ($<HTMLSelectElement>("#post-select").value = post.slug);
    void loadPost((e.target as HTMLSelectElement).value);
  };
  $("#new-post").onclick = () => void createPost();
  $("#duplicate-post").onclick = () => void createPost(post);
  $("#save").onclick = () => void savePost();
  $("#export").onclick = openExport;
  $("#export-go").onclick = (e) => {
    e.preventDefault();
    void runExport();
  };
  $<HTMLInputElement>("#post-title").oninput = (e) => {
    post.title = (e.target as HTMLInputElement).value;
    markDirty();
  };
  $<HTMLSelectElement>("#post-format").onchange = (e) => {
    post.format = (e.target as HTMLSelectElement).value as FormatId;
    markDirty();
    renderStrip();
  };
  $<HTMLInputElement>("#post-counter").onchange = (e) => {
    post.counter = (e.target as HTMLInputElement).checked;
    markDirty();
    refreshAll();
  };
  $("#add-slide").onclick = () => {
    if (full()) return;
    const slide = blankSlide($<HTMLSelectElement>("#add-template").value as TemplateId);
    if (slide.template !== "statement") slide.fields = { headline: "A new slide" };
    post.slides.splice(selected + 1, 0, slide);
    selected += 1;
    markDirty();
    renderAll();
  };
  $<HTMLInputElement>("#upload").onchange = (e) => void upload((e.target as HTMLInputElement).files ?? []);
  const libraryView = $("#view-library");
  libraryView.ondragover = (e) => {
    e.preventDefault();
    libraryView.classList.add("dragging");
  };
  libraryView.ondragleave = () => libraryView.classList.remove("dragging");
  libraryView.ondrop = (e) => {
    e.preventDefault();
    libraryView.classList.remove("dragging");
    if (e.dataTransfer?.files.length) void upload(e.dataTransfer.files);
  };
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      void savePost();
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (dirty) e.preventDefault();
  });
  let resize = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resize);
    resize = window.setTimeout(renderStrip, 150);
  });

  await fillPostSelect();
  const posts = await listPosts();
  const last = localStorage.getItem("studio:last");
  const start = posts.find((p) => p.slug === last) ?? posts[0];
  if (start) await loadPost(start.slug);
  else await createPost();
}

void boot();
