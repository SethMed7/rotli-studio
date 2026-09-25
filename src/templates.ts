// Slide renderers. Each returns the inner HTML of one slide; slide.css sizes
// everything in container units, so one template fits every format.
import { FORMATS, type FormatId, type Slide } from "./model";

const MARK = `<svg viewBox="0 0 64 64" aria-hidden="true" class="mark-fallback"></svg>`;

export function esc(text: string | undefined): string {
  return (text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A display headline that fits its longest line to the slide width
 * (General Sans Semibold at -0.045em runs about half an em per character). */
function displayStyle(text: string | undefined): string {
  const longest = Math.max(1, ...(text ?? "").split("\n").map((line) => line.length));
  return `style="font-size:min(12.5cqmin, ${(166 / longest).toFixed(2)}cqw)"`;
}

/** Multi-line text keeps its line breaks. */
function lines(text: string | undefined): string {
  return esc(text).replace(/\n/g, "<br />");
}

type Line =
  | { kind: "h"; text: string }
  | { kind: "task"; state: "done" | "doing" | "open"; text: string }
  | { kind: "text"; text: string };

/** The small Markdown grammar the Note and Markdown templates understand. */
export function parseLines(source: string | undefined): Line[] {
  return (source ?? "")
    .split("\n")
    .map((raw) => raw.trimEnd())
    .filter((raw) => raw.trim() !== "")
    .map((raw): Line => {
      const heading = raw.match(/^#{1,3}\s+(.*)$/);
      if (heading) return { kind: "h", text: heading[1] ?? "" };
      const task = raw.match(/^-\s\[( |x|X|\/)\]\s+(.*)$/);
      if (task) {
        const mark = task[1] ?? " ";
        return {
          kind: "task",
          state: mark === "/" ? "doing" : mark.toLowerCase() === "x" ? "done" : "open",
          text: task[2] ?? "",
        };
      }
      return { kind: "text", text: raw.replace(/^-\s+/, "") };
    });
}

function renderedNote(source: string | undefined, title?: string): string {
  const body = parseLines(source)
    .map((line) => {
      if (line.kind === "h") return `<p class="n-h">${esc(line.text)}</p>`;
      if (line.kind === "task")
        return `<p class="n-task ${line.state}"><span class="box" aria-hidden="true"></span><span>${esc(line.text)}</span></p>`;
      return `<p class="n-text">${esc(line.text)}</p>`;
    })
    .join("");
  return `<div class="note">${title ? `<p class="n-title">${esc(title)}</p>` : ""}${body}</div>`;
}

function rawNote(source: string | undefined): string {
  const body = (source ?? "")
    .split("\n")
    .filter((raw) => raw.trim() !== "")
    .map((raw) => {
      const escaped = esc(raw);
      const marked = escaped
        .replace(/^(#{1,3})(\s)/, '<b class="m">$1</b>$2')
        .replace(/^(-\s\[(?: |x|X|\/)\])/, '<b class="m">$1</b>')
        .replace(/^(-)(\s)/, '<b class="m">$1</b>$2');
      return `<span class="r-line">${marked}</span>`;
    })
    .join("");
  return `<pre class="raw">${body}</pre>`;
}

function image(url: string | undefined, className: string): string {
  return url ? `<img class="${className}" src="${esc(url)}" alt="" />` : "";
}

const TEMPLATE_HTML: Record<Slide["template"], (f: Record<string, string>) => string> = {
  statement: (f) => `
    ${f.pattern === "on" ? '<div class="pattern" aria-hidden="true"></div>' : ""}
    <div class="stack center statement">
      <h1 class="display" ${displayStyle(f.headline)}>${lines(f.headline)}</h1>
      ${f.subline ? `<p class="lede">${lines(f.subline)}</p>` : ""}
    </div>
    ${image(f.image, "peek")}`,

  product: (f) => `
    <div class="stack product">
      <h1 class="h1">${lines(f.headline)}</h1>
      ${f.subline ? `<p class="lede">${lines(f.subline)}</p>` : ""}
      <figure class="shot">${image(f.image, "shot-img")}${f.caption ? `<figcaption>${esc(f.caption)}</figcaption>` : ""}</figure>
    </div>`,

  chat: (f) => {
    const answer = (f.answer ?? "")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        const t = l.trim();
        if (/^[-•]\s+/.test(t)) return `<p class="c-bullet">${esc(t.replace(/^[-•]\s+/, ""))}</p>`;
        if (t.endsWith(":")) return `<p class="c-label">${esc(t)}</p>`;
        return `<p class="c-text">${esc(t)}</p>`;
      })
      .join("");
    return `
    <div class="stack chat-slide">
      ${f.headline ? `<h1 class="h1">${lines(f.headline)}</h1>` : ""}
      <div class="chat-card">
        ${f.question ? `<p class="bubble">${lines(f.question)}</p>` : ""}
        <div class="answer">${answer}</div>
      </div>
      ${f.caption ? `<p class="small-print">${esc(f.caption)}</p>` : ""}
    </div>`;
  },

  terminal: (f) => {
    const body = (f.lines ?? "")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) =>
        l.trim().startsWith("#")
          ? `<span class="t-line t-comment">${esc(l.trim())}</span>`
          : `<span class="t-line"><b class="t-prompt">$ </b>${esc(l.trim().replace(/^\$\s*/, ""))}</span>`,
      )
      .join("");
    return `
    <div class="stack terminal-slide">
      <h1 class="h1">${lines(f.headline)}</h1>
      ${f.subline ? `<p class="lede">${lines(f.subline)}</p>` : ""}
      <figure class="term">
        ${f.title ? `<figcaption>${esc(f.title)}</figcaption>` : ""}
        <pre>${body}</pre>
      </figure>
      ${f.caption ? `<p class="small-print">${esc(f.caption)}</p>` : ""}
    </div>`;
  },

  note: (f) => `
    <div class="stack note-slide">
      ${f.headline ? `<h1 class="h1">${lines(f.headline)}</h1>` : ""}
      <div class="paper">${renderedNote(f.lines, f.title)}</div>
    </div>`,

  markdown: (f) => `
    <div class="stack md-slide">
      ${f.headline ? `<h1 class="h1">${lines(f.headline)}</h1>` : ""}
      <div class="pair">
        <div class="pane"><p class="pane-label">On disk</p>${rawNote(f.lines)}</div>
        <div class="pane paper-pane"><p class="pane-label">In rotli</p>${renderedNote(f.lines)}</div>
      </div>
    </div>`,

  points: (f) => {
    const items = (f.lines ?? "")
      .split("\n")
      .filter((l) => l.trim())
      .slice(0, 4)
      .map((l) => {
        const [title, ...rest] = l.split(/\s+[—–-]\s+/);
        return `<li><b>${esc(title)}</b>${rest.length ? `<span>${esc(rest.join(" — "))}</span>` : ""}</li>`;
      })
      .join("");
    return `
      <div class="stack points-slide">
        <h1 class="h1">${lines(f.headline)}</h1>
        <ul class="points">${items}</ul>
      </div>
      ${image(f.image, "corner")}`;
  },

  quokka: (f) => `
    <div class="stack center quokka-slide">
      ${image(f.image, "hero-char")}
      <h1 class="h1">${lines(f.headline)}</h1>
      ${f.subline ? `<p class="lede">${esc(f.subline)}</p>` : ""}
    </div>`,

  cta: (f) => `
    <div class="pattern soft" aria-hidden="true"></div>
    <div class="stack center cta-slide">
      <h1 class="display" ${displayStyle(f.headline)}>${lines(f.headline)}</h1>
      ${f.subline ? `<p class="lede">${esc(f.subline)}</p>` : ""}
      <div class="buttons">
        ${f.primary ? `<span class="btn primary">${esc(f.primary)}</span>` : ""}
        ${f.secondary ? `<span class="btn secondary">${esc(f.secondary)}</span>` : ""}
      </div>
      ${f.url ? `<p class="url">${esc(f.url)}</p>` : ""}
    </div>`,
};

/** The whole slide element: sized to the format, themed, branded. */
export function renderSlide(
  slide: Slide,
  format: FormatId,
  options: { index: number; total: number; counter: boolean; mark: string },
): string {
  const { w, h } = FORMATS[format];
  const orientation = w / h > 1.15 ? "wide" : h / w > 1.4 ? "tall" : "boxy";
  const counter = options.counter && options.total > 1 ? `<span class="counter">${options.index + 1} / ${options.total}</span>` : "";
  return `
    <div class="slide t-${slide.template} theme-${slide.theme} o-${orientation}" style="width:${w}px;height:${h}px">
      <div class="frame">
        ${TEMPLATE_HTML[slide.template](slide.fields)}
        <footer class="brand">
          <span class="mark">${options.mark || MARK}</span><span class="word">rotli</span>
          ${counter}
        </footer>
      </div>
    </div>`;
}
