// The studio's data model: social formats, themes, templates (with the fields
// the editor shows for each), and the post saved as posts/<slug>.json.

export type FormatId = "ig-portrait" | "ig-square" | "story" | "x-post" | "linkedin";

export const FORMATS: Record<FormatId, { label: string; w: number; h: number }> = {
  "ig-portrait": { label: "Instagram · portrait 4:5", w: 1080, h: 1350 },
  "ig-square": { label: "Instagram · square 1:1", w: 1080, h: 1080 },
  story: { label: "Story / Reel cover 9:16", w: 1080, h: 1920 },
  "x-post": { label: "X · landscape 16:9", w: 1600, h: 900 },
  linkedin: { label: "LinkedIn · 1.91:1", w: 1200, h: 627 },
};

export type ThemeId = "light" | "warm" | "dark";
export const THEMES: Record<ThemeId, string> = {
  light: "Linen",
  warm: "Warm band",
  dark: "Cocoa (dark)",
};

export type FieldType = "text" | "textarea" | "image" | "lines" | "toggle";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
}

export type TemplateId =
  | "statement"
  | "product"
  | "chat"
  | "terminal"
  | "note"
  | "markdown"
  | "points"
  | "quokka"
  | "cta";

export const TEMPLATES: Record<TemplateId, { label: string; description: string; fields: Field[] }> = {
  statement: {
    label: "Statement",
    description: "One big line over the icon pattern, with an optional quokka.",
    fields: [
      { key: "headline", label: "Headline", type: "textarea", hint: "Line breaks are kept." },
      { key: "subline", label: "Subline", type: "textarea" },
      { key: "image", label: "Character", type: "image", hint: "Optional. A quokka works best." },
      { key: "pattern", label: "Icon pattern", type: "toggle" },
    ],
  },
  product: {
    label: "Product shot",
    description: "A headline above a real capture of the app.",
    fields: [
      { key: "headline", label: "Headline", type: "textarea" },
      { key: "subline", label: "Subline", type: "textarea" },
      { key: "image", label: "Capture", type: "image" },
      { key: "caption", label: "Caption under the capture", type: "text" },
    ],
  },
  chat: {
    label: "Chat",
    description: "A conversation drawn the way rotli's chat shows it: your question and the answer.",
    fields: [
      { key: "headline", label: "Headline", type: "textarea" },
      { key: "question", label: "Your question", type: "textarea" },
      {
        key: "answer",
        label: "Answer",
        type: "lines",
        hint: "One per line: a line ending in “:” is a bold label, - item is a bullet, anything else is text.",
      },
      { key: "caption", label: "Small print", type: "text" },
    ],
  },
  terminal: {
    label: "Terminal",
    description: "Commands in a terminal block, e.g. how to install and sign in to an AI tool.",
    fields: [
      { key: "headline", label: "Headline", type: "textarea" },
      { key: "subline", label: "Subline", type: "textarea" },
      { key: "title", label: "Window title", type: "text", hint: "e.g. Claude Code · Anthropic" },
      {
        key: "lines",
        label: "Lines",
        type: "lines",
        hint: "Each line is a command ($ is added). Start a line with # for a comment.",
      },
      { key: "caption", label: "Small print", type: "text" },
    ],
  },
  note: {
    label: "Note",
    description: "A note drawn the way rotli renders it: headings, tasks, and text.",
    fields: [
      { key: "headline", label: "Headline", type: "textarea" },
      { key: "title", label: "Note title", type: "text" },
      {
        key: "lines",
        label: "Note lines",
        type: "lines",
        hint: "One per line: ## heading, - [x] done, - [/] in progress, - [ ] open, or plain text.",
      },
    ],
  },
  markdown: {
    label: "Markdown ↔ rendered",
    description: "The same lines as plain Markdown and as rotli draws them.",
    fields: [
      { key: "headline", label: "Headline", type: "textarea" },
      { key: "lines", label: "Markdown lines", type: "lines", hint: "Same grammar as the Note template." },
    ],
  },
  points: {
    label: "Points",
    description: "A headline and up to four short points.",
    fields: [
      { key: "headline", label: "Headline", type: "textarea" },
      { key: "lines", label: "Points", type: "lines", hint: "One per line: Title — explanation." },
      { key: "image", label: "Character", type: "image", hint: "Optional, sits in the corner." },
    ],
  },
  quokka: {
    label: "Quokka",
    description: "A character front and center with one line.",
    fields: [
      { key: "image", label: "Character", type: "image" },
      { key: "headline", label: "Line", type: "textarea" },
      { key: "subline", label: "Small print", type: "text" },
    ],
  },
  cta: {
    label: "Call to action",
    description: "The closing card: promise, address, and the ways in.",
    fields: [
      { key: "headline", label: "Headline", type: "textarea" },
      { key: "subline", label: "Subline", type: "text" },
      { key: "url", label: "Address", type: "text" },
      { key: "primary", label: "Primary button", type: "text" },
      { key: "secondary", label: "Secondary button", type: "text" },
    ],
  },
};

export interface Slide {
  template: TemplateId;
  theme: ThemeId;
  fields: Record<string, string>;
}

export interface Post {
  slug: string;
  title: string;
  format: FormatId;
  /** Show "1 / 5" on each slide of a carousel. */
  counter: boolean;
  captions: { instagram: string; x: string; linkedin: string };
  slides: Slide[];
}

/** A carousel posts as-is, and an X post takes at most four images. */
export const MAX_SLIDES = 4;

export const CAPTION_LIMITS: Record<keyof Post["captions"], number> = {
  instagram: 2200,
  x: 280,
  linkedin: 3000,
};

export function blankSlide(template: TemplateId = "statement"): Slide {
  return { template, theme: "light", fields: { headline: "Room to think.\nFiles you keep.", pattern: "on" } };
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "post"
  );
}

export interface LibraryItem {
  shelf: string;
  name: string;
  /** URL the studio serves it from, e.g. /library/captures/chat.webp */
  url: string;
  bytes: number;
}
