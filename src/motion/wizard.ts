// "Make one for your product" (#/use): a step-by-step questionnaire whose result is a prompt. The prompt does the
// AI part: it makes the model interview the visitor for anything still missing, fetch the logo, colours, fonts and
// sentences from their site, write a brief, build the piece and review it. The site itself calls no model (the
// hosted copy is static), so the answers stay in this browser (localStorage) and leave it only when copied.
import { esc } from "./md";

export type WizardStudy = {
  id: string;
  no: number;
  title: string;
  family: string;
  subject: string;
  poster: string;
  piece: string;
  brief: string;
};
type Ctx = {
  main: HTMLElement;
  step: number;
  studies: WizardStudy[];
  families: { id: string; label: string }[];
  /** fetch a study brief (JSON) from the room */
  brief: (path: string) => Promise<Record<string, unknown>>;
  /** the router's go-to for a step (updates the hash) */
  go: (step: number) => void;
};

type Answers = {
  mode: "product" | "explore";
  name: string;
  url: string;
  what: string;
  audience: string;
  goal: string;
  sizes: string[];
  studies: string[];
  message: string;
  claims: string;
  cta: string;
  assets: string[];
  colours: string;
  fonts: string;
  fetch: boolean;
  sound: string;
  pace: string;
  length: string;
  tool: "chat" | "code";
};
const KEY = "rotli-studio:make-yours";
const EMPTY: Answers = {
  mode: "product",
  name: "",
  url: "",
  what: "",
  audience: "",
  goal: "launch",
  sizes: ["landscape", "vertical"],
  studies: [],
  message: "",
  claims: "",
  cta: "",
  assets: [],
  colours: "",
  fonts: "",
  fetch: true,
  sound: "music",
  pace: "lively",
  length: "30",
  tool: "chat",
};
const load = (): Answers => {
  try {
    return { ...EMPTY, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Answers>) };
  } catch {
    return { ...EMPTY };
  }
};
const save = (a: Answers) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    // private mode: the answers live only as long as the page
  }
};

const GOALS: [string, string, string][] = [
  ["launch", "A launch film", "What it is, why it matters, where to get it."],
  ["feature", "A feature explainer", "One feature, shown working."],
  ["loop", "A social loop", "A short piece that repeats seamlessly."],
  ["lesson", "A lesson", "Teach a real topic your audience cares about."],
  ["carousel", "A carousel or stills", "Slides for a feed, or a poster."],
];
const SIZES: [string, string, string][] = [
  ["landscape", "Landscape 16:9", "1920 × 1080 · YouTube, X, LinkedIn, a site hero"],
  ["vertical", "Vertical 9:16", "1080 × 1920 · Reels, Shorts, TikTok, Stories"],
  ["square", "Square 1:1", "1080 × 1080 · feeds"],
  ["portrait", "Portrait 4:5", "1080 × 1350 · Instagram feed, carousels"],
];
const ASSETS: [string, string][] = [
  ["logo", "A logo (SVG is best)"],
  ["colours", "Brand colours"],
  ["fonts", "Brand fonts, with a licence to use them"],
  ["screens", "Product screenshots"],
  ["mascot", "A mascot or character"],
];
const STEPS = [
  { id: "product", title: "Your product" },
  { id: "goal", title: "The goal" },
  { id: "sizes", title: "Where it goes" },
  { id: "style", title: "The style" },
  { id: "story", title: "What it says" },
  { id: "assets", title: "Your assets" },
  { id: "feel", title: "Sound and pace" },
  { id: "result", title: "Your prompt" },
] as const;

/** the side column: what a studio learns the hard way, one step at a time */
const POINTERS: Record<(typeof STEPS)[number]["id"], string[]> = {
  product: [
    "Use the sentence from your own homepage. Captions may only say what is true, and your site is the source.",
    "No product yet? Choose <b>Just exploring</b>: the prompt uses Oriel, the studio's imaginary scheduling app, so nothing claims anything real.",
    'Name your audience in their words ("freelance designers"), not a segment ("SMB").',
  ],
  goal: [
    "One piece, one job. A launch film that also explains three features explains none of them.",
    "Loops are the cheapest to make and the easiest to post; a lesson earns the most saves.",
    "A lesson must be true: the prompt asks the AI to source every fact and hedge it the way the source does.",
  ],
  sizes: [
    "Each size is designed, not cropped: a vertical re-stacks its layout, so every size you add is real work.",
    "Two sizes is the sweet spot: landscape for the site and X, vertical for Reels and Shorts.",
    "Platforms cover the edges with buttons and captions; the prompt keeps text inside safe margins.",
  ],
  style: [
    "Pick one or two studies. One technique carrying a whole piece reads as a style; four read as a demo reel.",
    "Each study has a portable prompt of its own; this flow folds the ones you choose into yours.",
    "Match the style to the claim: calm and exact for a tool you trust with data, loud and fast for a game.",
  ],
  story: [
    "Write the one line someone should remember. Everything else supports it.",
    "Claims are sentences you can stand behind today: no roadmap, no competitor names, no numbers your site doesn't state.",
    'The call to action is a place, not a plea: "Free on the Mac App Store", "yourapp.com".',
  ],
  assets: [
    "An SVG logo scales to any size; a PNG under 1000 px will look soft on a 4K display.",
    "Fonts are software with licences. Google Fonts are free to embed; a paid font needs your licence to cover video.",
    "With <b>fetch from my site</b> on, the AI looks for your logo, colours, fonts and sentences first and asks you to confirm each one.",
  ],
  feel: [
    "Sound is half the piece on a phone, and muted autoplay is the other half: every word must also be on screen.",
    "Cuts should land on the beat. The prompt fixes a tempo so every change of state starts on one.",
    "Shorter is harder, not easier: 15 seconds has no room for a slow start.",
  ],
  result: [
    "Paste the prompt into a new chat. The AI asks for anything missing one question at a time, so answer as you go.",
    "Approve the brief before the build. Changing a beat in the brief costs a sentence; in the code it costs a rebuild.",
    "Ask for eight timestamps and look at each one. Most problems are on screen for less than a second.",
  ],
};

const radio = (name: string, value: string, checked: boolean, label: string, hint = "") =>
  `<label class="opt"><input type="radio" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}><span><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ""}</span></label>`;
const check = (name: string, value: string, checked: boolean, label: string, hint = "") =>
  `<label class="opt"><input type="checkbox" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}><span><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ""}</span></label>`;
const field = (name: string, label: string, value: string, hint = "", area = false, placeholder = "") =>
  `<label class="field"><span>${esc(label)}</span>${
    area
      ? `<textarea name="${name}" rows="4" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
      : `<input type="text" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}">`
  }${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;

function stepBody(id: (typeof STEPS)[number]["id"], a: Answers, ctx: Ctx): string {
  switch (id) {
    case "product":
      return `<fieldset class="opts"><legend>Is this for a product?</legend>${radio("mode", "product", a.mode === "product", "Yes, my product", "Its site is the source for every claim.")}${radio("mode", "explore", a.mode === "explore", "Just exploring", "Use Oriel, the imaginary app the studies advertise.")}</fieldset>
        ${
          a.mode === "product"
            ? `${field("name", "Product name", a.name, "", false, "Acme Notes")}${field("url", "Website", a.url, "The AI starts here for your logo, colours, fonts and wording.", false, "https://acme.example")}${field("what", "What it does, in one sentence", a.what, "Your homepage's own sentence is best.", false, "The calm notes app for your Mac.")}${field("audience", "Who it's for", a.audience, "", false, "Writers who keep everything in plain files")}`
            : `<p class="muted">The prompt will use <b>Oriel</b>, a scheduling assistant that finds a time that works for everyone. It is invented: no site, no app, no company.</p>`
        }`;
    case "goal":
      return `<fieldset class="opts"><legend>What should the piece do?</legend>${GOALS.map(([v, l, h]) => radio("goal", v, a.goal === v, l, h)).join("")}</fieldset>`;
    case "sizes":
      return `<fieldset class="opts"><legend>Which sizes? Pick one or more.</legend>${SIZES.map(([v, l, h]) => check("sizes", v, a.sizes.includes(v), l, h)).join("")}</fieldset>`;
    case "style": {
      const byFam = ctx.families
        .map((f) => ({ f, list: ctx.studies.filter((s) => s.family === f.id) }))
        .filter((x) => x.list.length);
      return `<p class="muted">Pick one or two looks from the studies (${a.studies.length} chosen). Each opens on its own page if you want to watch it first.</p>
        ${byFam
          .map(
            ({ f, list }) =>
              `<h3 class="pick-fam">${esc(f.label)}</h3><div class="pick-grid">${list
                .map(
                  (s) =>
                    `<label class="pick"><input type="checkbox" name="studies" value="${esc(s.id)}"${a.studies.includes(s.id) ? " checked" : ""}><img src="${esc(s.poster)}" alt="" loading="lazy"><span><b>${String(s.no).padStart(2, "0")} ${esc(s.title)}</b></span></label>`,
                )
                .join("")}</div>`,
          )
          .join("")}`;
    }
    case "story":
      return `${field("message", "The one line to remember", a.message, "", false, "Your notes, in files you keep.")}${field("claims", "Up to five sentences you can stand behind", a.claims, "One per line. Quote your site where you can.", true, "Works offline.\nEvery note is a plain Markdown file.\nNo account needed.")}${field("cta", "Call to action", a.cta, "Where to go, not a plea.", false, "acme.example")}`;
    case "assets":
      return `<fieldset class="opts"><legend>What do you already have?</legend>${ASSETS.map(([v, l]) => check("assets", v, a.assets.includes(v), l)).join("")}</fieldset>
        ${field("colours", "Colours, if you know them", a.colours, "Hex values, with a word for each if you like.", false, "#1b2a22 ink, #2f8f5b accent, #ebeae4 ground")}
        ${field("fonts", "Fonts, if you know them", a.fonts, "Say whether you have a licence for video.", false, "Inter (Google Fonts)")}
        <fieldset class="opts"><legend>Look for them on your site?</legend>${radio("fetch", "yes", a.fetch, "Yes, fetch from my site first", "The AI lists what it finds and asks you to confirm each item.")}${radio("fetch", "no", !a.fetch, "No, I'll paste them in")}</fieldset>`;
    case "feel":
      return `<fieldset class="opts"><legend>Length</legend>${[
        ["8", "8 seconds, a loop"],
        ["15", "15 seconds"],
        ["30", "30 seconds"],
        ["60", "60 seconds"],
      ]
        .map(([v, l]) => radio("length", v!, a.length === v, l!))
        .join("")}</fieldset>
        <fieldset class="opts"><legend>Pace</legend>${radio("pace", "calm", a.pace === "calm", "Calm", "Long holds that keep drifting; soft arrivals.")}${radio("pace", "lively", a.pace === "lively", "Lively", "Something new every two to four seconds.")}${radio("pace", "punchy", a.pace === "punchy", "Punchy", "Cuts and slams on the beat.")}</fieldset>
        <fieldset class="opts"><legend>Sound</legend>${radio("sound", "music", a.sound === "music", "Music and hits", "A beat, with a sound on each cut and landing.")}${radio("sound", "hits", a.sound === "hits", "Hits only", "Ticks, whooshes and pops; no music bed.")}${radio("sound", "none", a.sound === "none", "Silent")}</fieldset>
        <fieldset class="opts"><legend>Where will you run the prompt?</legend>${radio("tool", "chat", a.tool === "chat", "Any AI chat", "Claude, or any capable model: you get one HTML file that plays and exports the piece.")}${radio("tool", "code", a.tool === "code", "Claude Code, in this repository", "Clone it first: renders real MP4s, contact sheets, a scored critique and a golden.")}</fieldset>`;
    case "result":
      return `<div id="wiz-result"><p class="muted">Writing your prompt…</p></div>`;
  }
}

/** the questions the AI must still ask, from what was left blank */
function missing(a: Answers): string[] {
  const q: string[] = [];
  if (a.mode === "product") {
    if (!a.name) q.push("What is the product called?");
    if (!a.url) q.push("Does it have a website I can read? (the URL)");
    if (!a.what) q.push("What does it do, in one sentence, ideally the one on its homepage?");
    if (!a.audience) q.push("Who is it for, in their own words?");
  }
  if (!a.message) q.push("What is the one line the viewer should remember?");
  if (!a.claims.trim()) q.push("Which three to five sentences about it are true today and can go on screen?");
  if (!a.cta) q.push("Where should the viewer go at the end (a URL or store name)?");
  if (!a.studies.length) q.push("Which look do you want? Offer me three contrasting styles, each in one sentence.");
  if (!a.colours && !a.fetch) q.push("What are the brand colours (hex)?");
  if (!a.fonts && !a.fetch) q.push("Which fonts, and are they licensed for video?");
  return q;
}

async function prompt(a: Answers, ctx: Ctx): Promise<string> {
  const picked = ctx.studies.filter((s) => a.studies.includes(s.id));
  const briefs = await Promise.all(picked.map((s) => ctx.brief(s.brief).catch(() => ({}) as Record<string, unknown>)));
  const oriel = a.mode === "explore";
  const name = oriel ? "Oriel" : a.name || "my product";
  const sizes = SIZES.filter(([v]) => a.sizes.includes(v)).map(([, l, h]) => `${l} (${h.split(" · ")[0]})`);
  const goal = GOALS.find(([v]) => v === a.goal)!;
  const lines = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  const bpm = a.pace === "calm" ? 90 : a.pace === "punchy" ? 120 : 100;
  const told = [
    oriel
      ? `- Product: Oriel, an IMAGINARY scheduling assistant that finds a time that works for everyone. It has no website, app or company; invent its UI and keep every claim modest and generic.`
      : `- Product: ${name}${a.url ? ` (${a.url})` : ""}${a.what ? `. ${a.what}` : ""}${a.audience ? `\n- Audience: ${a.audience}` : ""}`,
    `- Goal: ${goal[1]} (${goal[2].toLowerCase().replace(/\.$/, "")})`,
    `- Length: ${a.length} seconds${a.length === "8" || a.goal === "loop" ? ", looping seamlessly" : ""}, ${a.pace} pace, ${bpm} bpm`,
    `- Sizes: ${sizes.join("; ") || "ask me"}`,
    a.message && `- The one line to remember: "${a.message}"`,
    lines(a.claims).length &&
      `- Claims I stand behind (use only these, word for word or shortened):\n${lines(a.claims)
        .map((c) => `  - "${c}"`)
        .join("\n")}`,
    a.cta && `- Call to action: "${a.cta}"`,
    `- Sound: ${a.sound === "music" ? "a music bed plus hits on cuts and landings" : a.sound === "hits" ? "hits only (ticks, whooshes, pops), no music bed" : "silent"}`,
    a.assets.length &&
      `- Assets I have: ${ASSETS.filter(([v]) => a.assets.includes(v))
        .map(([, l]) => l.toLowerCase())
        .join(", ")}`,
    a.colours && `- Colours: ${a.colours}`,
    a.fonts && `- Fonts: ${a.fonts}`,
  ]
    .filter(Boolean)
    .join("\n");
  const styles = picked.length
    ? picked
        .map((s, i) => {
          const b = briefs[i] as { portable?: { style?: string }; teaches?: string };
          return `${i + 1}. "${s.title}"${b.teaches ? `: ${b.teaches}` : ""}\n   ${b.portable?.style ?? ""}`;
        })
        .join("\n")
    : "None chosen yet: offer me three contrasting styles (one sentence each) and let me pick.";
  const ask = missing(a);
  const assets = oriel
    ? "Oriel is imaginary, so there is nothing to fetch: design a simple mark (a rounded window or a calendar tile) and a palette from the style references, and show them to me before building."
    : a.fetch && a.url
      ? `Read ${a.url} (and, if they exist, its /features, /about, /pricing and /press pages). Find:
   - the logo: an inline SVG or <img> in the header, else the favicon, apple-touch-icon or og:image. Give me the URL of each candidate.
   - the colours: CSS custom properties, button and link colours, section backgrounds. List each hex with where you found it and the role you'd give it (ground, surface, ink, muted, accent).
   - the fonts: every font-family in use, and whether each is on Google Fonts (free to embed) or needs a licence I must confirm.
   - the product: screenshots or UI you can redraw as flat shapes (never paste a real screenshot into the piece unless I say so).
   - the words: five to ten sentences from the site that captions may quote, each with its URL.
   Show all of it as one table and ask me to confirm, replace or drop each row. If you cannot browse, say so and ask me to paste them.`
      : "Ask me to paste or describe my logo, colours and fonts. For fonts, ask whether each is licensed for video; if not, suggest a close free Google Font.";
  if (a.tool === "code")
    return `You are working in a local clone of rotli studio (https://github.com/SethMed7/rotli-studio), an open-source studio where every frame of a video is a pure function drawn in code. Make ${a.goal === "carousel" ? "a carousel" : "a piece"} for ${name} with me, step by step.

Read first: AGENTS.md, ARCHITECTURE.md, docs/use-it-for-your-product.md, .claude/skills/brand-motion-studio/SKILL.md, motion/series/studies/bible.md and motion/workflows/critique.md.

WHAT I'VE TOLD YOU
${told}

STYLE REFERENCES (studies in this repository)
${styles}
${picked.length ? `Their briefs: ${picked.map((s) => `motion/${s.brief}`).join(", ")}. Their modules show how each technique is drawn.` : ""}

HOW WE WORK (stop and wait for me at every question)
1. Interview. Use AskUserQuestion, one to four questions per call, the recommended option first, a preview for anything visual. ${ask.length ? `Still to ask:\n${ask.map((q) => `   - ${q}`).join("\n")}` : "I have answered the basics; ask only what the evidence below cannot settle."}
2. Assets. ${oriel ? "Oriel is imaginary: use the neutral pack, motion/brand/packs/studio/." : `Run \`cd motion && node tools/discover.mjs ${a.url || "<url>"} --out ../tmp/${slug(name)}/discovery --pages 8\` and \`node tools/propose-brand.mjs ../tmp/${slug(name)}/discovery/discovery.json --out ../tmp/${slug(name)}/brand.proposal\`. Read evidence.md and the page shots, then ask me to confirm the accent, grounds and fonts. Make a pack at motion/brand/packs/${slug(name)}/ (copy the studio pack; fonts only with my licence confirmation, each with its sha256 and licence file).`}
3. Brief. Write motion/series/studies/briefs/${slug(name)}.json in the exact shape of the briefs beside it: beats on the beat grid (${bpm} bpm; one beat must be a whole number of frames), exact copy in quotes, every size designed. Show it to me and wait for approval.
4. Build. \`node tools/study-prompt.mjs <brief>\` gives the rules; build the module in motion/src/canvas-core/studies/ on the kit and the pack, one Film per size.
5. Prove it. Contact sheets (tools/frames.mjs --sheet) read as images for every size; render; tools/still-frames.mjs prints no windows; loudness about −16 LUFS; tools/critique.mjs scored against workflows/critique.md until every criterion is 8 or more. Show me the sheets.
6. Register and lock: pieces.json, render, golden. Do not commit or push unless I ask.

RULES
- Every caption is one of my claims or a sentence from my site. Nothing unreleased, no competitor names, no numbers I haven't given you.
- Never write outside this repository.
- Tell me plainly what you ran and what failed.`;
  return `You are a world-class motion designer who works in code. We are going to make ${a.goal === "carousel" ? "a carousel" : "a short piece"} for ${name} together, step by step, and you will build it as one self-contained HTML file.

WHAT I'VE TOLD YOU
${told}

STYLE REFERENCES
${styles}

HOW WE WORK (follow in order; at every "ask", stop and wait for my answer)
1. Interview me. Ask ONE question at a time, offering two to four options with your recommendation first. ${ask.length ? `Still to ask:\n${ask.map((q) => `   - ${q}`).join("\n")}` : "I have answered the basics; only ask what you still need."}
2. Get the assets. ${assets}
3. Write the brief and ask me to approve it: the palette (hex, by role), the fonts, the tempo (${bpm} bpm; every change of state starts on a beat), and the beats as a table of timestamps with exactly what is on screen and the exact copy in quotes. Say how each size re-stacks (a vertical is designed, never cropped).
4. Build it: one HTML file with a <canvas> at the first size (?size=<name> for the others). Every frame is a pure function of time, draw(ctx, t), with no state carried between frames. No libraries and no image files except the logo I approve; fonts from Google Fonts only if free, loaded before the first frame. A player: autoplays muted, the first click turns sound on, ← and → step one frame, ?t=<seconds> opens paused there, and a "Record" button that exports a video with MediaRecorder. ${a.sound === "none" ? "No sound." : "Sound is synthesised with the Web Audio API on the same beat grid (no samples)."}
5. Review it like a harsh motion director: name eight timestamps and exactly what is on screen at each. Check that the first two seconds hook, every line is readable at phone size for as long as it is on screen, nothing overlaps or leaves the safe margins, no text is under 22 px at 1080 px on the short side, and nothing sits still for more than half a second. Fix what fails and give me the complete file again.
6. End with three pointers for the next piece: what to change first if it underperforms, and which other size to make.

RULES
- Captions only say what I told you or what my site says; never invent features, numbers or quotes.
- Ease every arrival (ease-out, or a spring with a little overshoot); nothing moves linearly except ambient drift.
- Keep it to what I asked for. If something is impossible in one HTML file, say so and offer the nearest thing.`;
}
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "my-product";

export async function wizard(ctx: Ctx) {
  const a = load();
  const step = Math.max(0, Math.min(STEPS.length - 1, ctx.step));
  const cur = STEPS[step]!;
  const { main } = ctx;
  const intro = `<header class="page-head"><h1>Make one for your product</h1><p>Answer a few questions, one screen at a time. You get a prompt for Claude or any capable model that interviews you for whatever is still missing, fetches your logo, colours and fonts from your site, writes a brief for you to approve, builds the piece and reviews it. Your answers stay in this browser.</p></header>`;
  main.innerHTML = `<nav class="crumbs"><a href="#/">Studio</a> › Make one for your product</nav>${intro}
    <ol class="wiz-steps" aria-label="Steps">${STEPS.map((s, i) => `<li${i === step ? ' aria-current="step"' : ""}><a href="#/use?step=${i + 1}"><span>${i + 1}</span>${esc(s.title)}</a></li>`).join("")}</ol>
    <div class="wiz">
      <form class="wiz-form" id="wiz" autocomplete="off"><h2>${step + 1}. ${esc(cur.title)}</h2>${stepBody(cur.id, a, ctx)}
        <div class="wiz-nav">${step > 0 ? `<button class="button ghost" type="button" data-go="${step - 1}">Back</button>` : ""}${step < STEPS.length - 1 ? `<button class="button" type="submit">${step === STEPS.length - 2 ? "Write my prompt" : "Next"}</button>` : `<button class="button ghost" type="button" id="wiz-reset">Start over</button>`}</div>
      </form>
      <aside class="wiz-tips" aria-label="Pointers"><h2>Pointers</h2><ul>${POINTERS[cur.id].map((p) => `<li>${p}</li>`).join("")}</ul></aside>
    </div>
    <section class="sec wiz-deeper"><h2>Going deeper</h2><ul class="links">
      <li><a href="#/doc/${encodeURIComponent("../docs/use-it-for-your-product.md")}">The guide: point the studio at your brand →</a><p>Brand packs, the kit, sizes, and how a piece is made, proved and registered.</p></li>
      <li><a href="#/prompts">Prompt library →</a><p>Every study's portable prompt, one click to copy.</p></li>
      <li><a href="#/skills?doc=${encodeURIComponent("skill:studio:brand-motion-studio")}">The brand-motion-studio skill →</a><p>The same flow for Claude Code, from a website to a season of films.</p></li>
      <li><a href="#/doc/${encodeURIComponent("../docs/evaluation.md")}">What ports, what doesn't →</a><p>What carries over to another product, and what is still shaped like Rotli.</p></li>
    </ul></section>`;
  const form = main.querySelector<HTMLFormElement>("#wiz")!;
  const read = () => {
    const d = new FormData(form);
    const next = { ...load() } as Record<string, unknown>;
    for (const el of Array.from(form.elements) as HTMLInputElement[]) {
      if (!el.name) continue;
      if (el.type === "checkbox") next[el.name] = d.getAll(el.name).map(String);
      else if (el.name === "fetch") next.fetch = d.get("fetch") === "yes";
      else if (el.type === "radio" || el.tagName !== "BUTTON") next[el.name] = String(d.get(el.name) ?? "");
    }
    save(next as Answers);
    return next as Answers;
  };
  form.addEventListener("input", () => read());
  form.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    read();
    if (t.name === "mode") void wizard(ctx); // the product fields appear or go
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    read();
    ctx.go(step + 1);
  });
  main
    .querySelectorAll<HTMLButtonElement>("[data-go]")
    .forEach((b) => (b.onclick = () => ctx.go(Number(b.dataset.go))));
  const reset = main.querySelector<HTMLButtonElement>("#wiz-reset");
  if (reset)
    reset.onclick = () => {
      save({ ...EMPTY });
      ctx.go(0);
    };
  if (cur.id === "result") {
    const text = await prompt(a, ctx);
    const out = main.querySelector<HTMLElement>("#wiz-result");
    if (!out) return;
    const ask = missing(a);
    out.innerHTML = `<p>Copy this into ${a.tool === "code" ? "Claude Code, opened in your clone of the studio" : "a new chat with Claude or any capable model"}. ${ask.length ? `It will ask you ${ask.length} more question${ask.length > 1 ? "s" : ""} first, one at a time.` : "You answered everything it needs to start."}</p>
      <p class="actions"><button class="button copy" type="button" data-label="Copy prompt" data-copy="${esc(text)}">Copy prompt</button><a class="button ghost" download="${slug(a.mode === "explore" ? "oriel" : a.name)}-prompt.md" href="data:text/markdown;charset=utf-8,${encodeURIComponent(text)}">Download .md</a></p>
      <pre class="prompt">${esc(text)}</pre>`;
  }
}
