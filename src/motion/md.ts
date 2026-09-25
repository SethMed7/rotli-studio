// A small, safe Markdown renderer for the studio's own docs (bible, prompts, skills, runs, plans).
// Everything is escaped first; only the syntax those files use becomes HTML: headings, paragraphs,
// lists, tables, fenced code, quotes, rules, links, bold, italic and inline code. Frontmatter is
// shown as a key/value list, not hidden.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(s: string): string {
  const codes: string[] = [];
  let t = esc(s).replace(/`([^`]+)`/g, (_, c: string) => `\u0000${codes.push(c) - 1}\u0000`);
  t = t
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_, label: string, href: string) =>
        `<a href="${/^(https?:|#|\/)/.test(href) ? href : "#"}"${/^https?:/.test(href) ? ' target="_blank" rel="noreferrer"' : ""}>${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_([^_\s][^_]*?)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  // NUL bytes fence the placeholders: they can never occur in escaped Markdown, so they cannot collide with text
  // oxlint-disable-next-line no-control-regex
  return t.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${codes[Number(i)]}</code>`);
}

export function markdown(src: string): string {
  const out: string[] = [];
  let lines = src.replace(/\r/g, "").split("\n");
  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) {
      out.push(
        `<dl class="frontmatter">${lines
          .slice(1, end)
          .map((l) => {
            const i = l.indexOf(":");
            return i > 0 ? `<dt>${esc(l.slice(0, i))}</dt><dd>${inline(l.slice(i + 1).trim())}</dd>` : "";
          })
          .join("")}</dl>`,
      );
      lines = lines.slice(end + 1);
    }
  }
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!;
    const fence = line.match(/^(`{3,})(\w*)/);
    if (fence) {
      const close = fence[1]!,
        body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith(close)) body.push(lines[i++]!);
      i++;
      out.push(`<pre><code class="lang-${fence[2] || "text"}">${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const n = h[1]!.length,
        text = h[2]!,
        id = text
          .toLowerCase()
          .replace(/[^\w]+/g, "-")
          .replace(/^-|-$/g, "");
      out.push(`<h${n} id="${id}">${inline(text)}</h${n}>`);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }
    if (/^\|.*\|\s*$/.test(line) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      const row = (l: string) =>
        l
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
      const head = row(line);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i]!)) body.push(row(lines[i++]!));
      out.push(
        `<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
      );
      continue;
    }
    if (/^>\s?/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) q.push(lines[i++]!.replace(/^>\s?/, ""));
      out.push(`<blockquote>${markdown(q.join("\n"))}</blockquote>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line),
        items: string[] = [];
      while (
        i < lines.length &&
        (/^\s*([-*]|\d+\.)\s+/.test(lines[i]!) || (/^\s{2,}\S/.test(lines[i]!) && items.length))
      ) {
        const l = lines[i++]!;
        if (/^\s*([-*]|\d+\.)\s+/.test(l) && !/^\s{4,}/.test(l)) items.push(l.replace(/^\s*([-*]|\d+\.)\s+/, ""));
        else items[items.length - 1] += `\n${l.trim()}`;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(
        `<${tag}>${items
          .map((it) => {
            const [first, ...rest] = it.split("\n");
            const sub = rest.filter((r) => /^([-*]|\d+\.)\s+/.test(r));
            const more = rest.filter((r) => !/^([-*]|\d+\.)\s+/.test(r));
            return `<li>${inline([first, ...more].join(" "))}${sub.length ? `<ul>${sub.map((s) => `<li>${inline(s.replace(/^([-*]|\d+\.)\s+/, ""))}</li>`).join("")}</ul>` : ""}</li>`;
          })
          .join("")}</${tag}>`,
      );
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !/^(#{1,6}\s|`{3,}|>|\s*([-*]|\d+\.)\s+|\|.*\|\s*$|-{3,}\s*$)/.test(lines[i]!)
    )
      para.push(lines[i++]!);
    if (!para.length) {
      out.push(`<p>${inline(line)}</p>`);
      i++;
      continue;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

export { esc };
