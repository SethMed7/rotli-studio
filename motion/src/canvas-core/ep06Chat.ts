// EPISODE 06 · CHAT — "Ask your notes." (30 s, 1920x1080)
// Story: a question is typed into Chat; it reads three notes in the vault and answers from what is
// there; Conversation notes fill in beside it; "Make this a PDF" files a PDF next to the chat;
// the model picker shows a model on your Mac or Claude Code and Codex; the chat is a .md file.
// Turn: frame 556, the PDF lands in the folder (chat made a real file). Token: rottnest-trip.md.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { C, easeInOut, fillRR, pop, seg, sparkle, text, typed } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { makeScore } from "./studio/score2";
import { drift, endCard, ground, host, lowerThird, titleCard, END, TITLE } from "./studio/series";
import { FONTS } from "./studio/stage";
import { LIGHT as T, appFrame, caret, fileList, measure, pointer, tagChip } from "./studio/ui";
import { useFamilyUI } from "./studio/ui";

// this episode speaks the IRIS theme family: grounds, UI, captions, accents and the quokka
useFamilyUI("iris");

const TOTAL = 900,
  DEMO_END = TOTAL - END,
  R = T.roles;
// cue table (frames)
const Q = {
  q1: [112, 160],
  send1: 166,
  src: [174, 180, 186],
  ans: [206, 234, 262],
  notes: 300,
  rows: [318, 342, 366, 390],
  files: 420,
  q2: [466, 492],
  send2: 500,
  reply: [520, 548],
  pdf: 556,
  model: 640,
  modelOff: 712,
  chatFile: 750,
};
const ptr: [number, number, number][] = [
  [140, 1260, 880],
  [160, 1140, 806],
  [195, 1140, 806],
  [225, 1210, 866],
  [480, 1210, 866],
  [496, 1140, 806],
  [515, 1140, 806],
  [540, 1210, 866],
  [624, 1210, 866],
  [638, 1154, 186],
  [652, 1154, 186],
  [672, 1130, 296],
  [712, 1130, 296],
  [744, 1610, 672],
  [780, 1610, 672],
];
const ptrAt = (l: number) => {
  if (l <= ptr[0][0]) return { x: ptr[0][1], y: ptr[0][2] };
  for (let i = 1; i < ptr.length; i++)
    if (l < ptr[i][0]) {
      const [f0, x0, y0] = ptr[i - 1],
        [f1, x1, y1] = ptr[i],
        k = easeInOut((l - f0) / (f1 - f0));
      return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
    }
  const z = ptr[ptr.length - 1];
  return { x: z[1], y: z[2] };
};
const press = (l: number, at: number) => (l >= at && l < at + 12 ? (l - at) / 12 : 0);

// layout (logical): chat column on the left, Conversation notes + files on the right
const CX = 470,
  CR = 1180,
  RX = 1220,
  RW = 550;
const Q1 = "What's left before Rottnest?",
  Q2 = "Make this a PDF.",
  REPLY = "Made rottnest-plan.pdf, beside this chat.";
const ANSWER = [
  "Your ferry is booked: Saturday, 8:30.",
  "Still to pack: the snorkel.",
  "Not planned yet: the pink lake.",
];
const SOURCES = ["Trip plan", "Ferry times", "Packing list"];
const NOTES: [string, string][] = [
  ["Decision", "Saturday, 8:30 ferry."],
  ["Fact", "The ferry is booked."],
  ["Action", "Maya packs the snorkel."],
  ["Open", "Who plans the pink lake?"],
];
const MODELS = ["On this Mac", "Claude Code", "Codex"];

/** camera: wide, pushed in (1.15×) on the chat + notes while it works, back out for the payoff */
const camera = (ctx: Ctx, env: Env, l: number) => {
  const z = easeInOut(seg(l, 100, 126)) * (1 - easeInOut(seg(l, 715, 741))),
    s = 1 + 0.15 * z,
    tx = -335 * 1.15 * z,
    ty = -90 * 1.15 * z;
  ctx.setTransform(env.scale * s, 0, 0, env.scale * s, env.scale * tx, env.scale * ty);
  drift(ctx, env, l);
};
/** a sent message: right-aligned tinted bubble that pops from its right edge */
const bubble = (ctx: Ctx, s: string, y: number, k: number) => {
  if (k <= 0) return;
  const w = measure(ctx, s, 28, 500) + 48,
    x = CR - w;
  ctx.save();
  ctx.translate(CR, y + 30);
  ctx.scale(k, k);
  ctx.translate(-CR, -y - 30);
  fillRR(ctx, x, y, w, 60, 22, R.tint);
  text(ctx, s, x + 24, y + 40, { size: 28, color: R.text });
  ctx.restore();
};
const dots = (ctx: Ctx, x: number, y: number, l: number, t0: number) => {
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = R["text-muted"];
    ctx.beginPath();
    ctx.arc(x + i * 24, y - Math.max(0, Math.sin((l - t0) / 3 - i)) * 9, 7, 0, 6.29);
    ctx.fill();
  }
};
const chevron = (ctx: Ctx, x: number, y: number) => {
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 4);
  ctx.lineTo(x, y + 4);
  ctx.lineTo(x + 7, y - 4);
  ctx.strokeStyle = R["text-muted"];
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
};

const demo = (ctx: Ctx, l: number, env: Env) => {
  ground(ctx, l);
  camera(ctx, env, l);
  appFrame(
    ctx,
    T,
    { x: 120, y: 80, w: 1680, h: 800 },
    { notes: ["Trip plan", "Ferry times", "Packing list"], active: -1, title: "rottnest-trip.md" },
  );
  // ---- chat header: title + model picker
  text(ctx, "Chat", CX, 196, { size: 34, weight: 600, color: R.text });
  const open = l >= Q.model && l < Q.modelOff,
    mw = measure(ctx, MODELS[0], 24, 600) + 70,
    mx = CR - mw;
  fillRR(ctx, mx, 162, mw, 44, 22, open ? R.tint : R.surface, R.border, 2);
  text(ctx, MODELS[0], mx + 20, 192, { size: 24, weight: 600, color: R["accent-text"] });
  chevron(ctx, CR - 26, 184);
  ctx.fillStyle = R.border;
  ctx.fillRect(CX, 226, CR - CX, 2);
  // ---- question 1, what it read, the grounded answer
  bubble(ctx, Q1, 250, pop(seg(l, Q.send1 + 2, Q.send1 + 14)));
  if (l >= Q.src[0]) {
    text(ctx, "Read", CX, 362, { size: 26, color: R["text-muted"] });
    let sx = CX + 76;
    SOURCES.forEach((s, i) => {
      const k = pop(seg(l, Q.src[i], Q.src[i] + 10)),
        w = measure(ctx, s, 24, 600) + 30;
      if (k > 0) {
        ctx.save();
        ctx.translate(sx + w / 2, 350);
        ctx.scale(k, k);
        ctx.translate(-sx - w / 2, -350);
        tagChip(ctx, T, sx, 362, s);
        ctx.restore();
      }
      sx += w + 12;
    });
  }
  if (l >= 190 && l < Q.ans[0]) dots(ctx, CX + 30, 440, l, 190);
  let cur: [number, number] | null = null;
  if (l >= Q.ans[0]) {
    fillRR(ctx, CX, 392, CR - CX, 170, 18, R.ground, R.border, 2);
    ANSWER.forEach((a, i) => {
      const t0 = Q.ans[i],
        k = seg(l, t0, t0 + 24);
      if (k <= 0) return;
      const s = typed(a, k);
      text(ctx, s, CX + 28, 442 + i * 46, { size: 30, weight: i === 0 ? 600 : 500, color: R.text });
      if (k < 1) cur = [CX + 28 + measure(ctx, s, 30, i === 0 ? 600 : 500), 442 + i * 46];
    });
  }
  // ---- question 2 and the file it makes
  bubble(ctx, Q2, 590, pop(seg(l, Q.send2 + 2, Q.send2 + 14)));
  if (l >= 506 && l < Q.reply[0]) dots(ctx, CX + 30, 706, l, 506);
  if (l >= Q.reply[0]) {
    fillRR(ctx, CX, 674, CR - CX, 70, 18, R.ground, R.border, 2);
    const k = seg(l, Q.reply[0], Q.reply[1]),
      s = typed(REPLY, k);
    text(ctx, s, CX + 28, 719, { size: 28, color: R.text });
    if (k < 1) cur = [CX + 28 + measure(ctx, s, 28, 500), 719];
  }
  // ---- composer (kept above the caption zone)
  fillRR(ctx, CX, 776, CR - CX, 60, 18, R.surface, R.border, 2);
  const draft =
    l >= Q.q1[0] && l < Q.send1
      ? typed(Q1, seg(l, Q.q1[0], Q.q1[1]))
      : l >= Q.q2[0] && l < Q.send2
        ? typed(Q2, seg(l, Q.q2[0], Q.q2[1]))
        : "";
  if (draft) {
    text(ctx, draft, CX + 24, 815, { size: 28, color: R.text });
    caret(ctx, T, CX + 24 + measure(ctx, draft, 28, 500), 815, l, 30);
  } else text(ctx, "Ask your notes…", CX + 24, 815, { size: 26, color: R["text-muted"] });
  ctx.fillStyle = draft ? R.accent : R.border;
  ctx.beginPath();
  ctx.arc(CR - 36, 806, 20, 0, 6.29);
  ctx.fill();
  ctx.strokeStyle = R.surface;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(CR - 36, 816);
  ctx.lineTo(CR - 36, 796);
  ctx.moveTo(CR - 44, 804);
  ctx.lineTo(CR - 36, 796);
  ctx.lineTo(CR - 28, 804);
  ctx.stroke();
  if (cur) caret(ctx, T, cur[0], cur[1], l, 30);
  // ---- Conversation notes: a section of the chat file, rewritten after each reply
  const pk = pop(seg(l, Q.notes, Q.notes + 14));
  if (pk > 0) {
    ctx.save();
    ctx.globalAlpha *= Math.min(1, pk * 1.4);
    ctx.translate(RX + RW / 2, 150);
    ctx.scale(1, 0.9 + 0.1 * pk);
    ctx.translate(-RX - RW / 2, -150);
    fillRR(ctx, RX, 150, RW, 400, 18, R.surface, R.border, 2);
    text(ctx, "Conversation notes", RX + 28, 204, { size: 30, weight: 600, color: R.text });
    const up = pop(seg(l, Q.pdf + 4, Q.pdf + 16)) * (1 - seg(l, 700, 710));
    if (up > 0) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, up);
      fillRR(ctx, RX + RW - 128, 176, 104, 36, 18, R.success);
      text(ctx, "updated", RX + RW - 76, 201, { size: 20, weight: 600, align: "center", color: R["on-accent"] });
      ctx.restore();
    }
    ctx.fillStyle = R.border;
    ctx.fillRect(RX + 28, 228, RW - 56, 2);
    NOTES.forEach(([lab, s], i) => {
      const k = pop(seg(l, Q.rows[i], Q.rows[i] + 12));
      if (k <= 0) return;
      const y = 282 + i * 68;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k);
      ctx.translate(RX + 28, y - 10);
      ctx.scale(k, k);
      ctx.translate(-RX - 28, -y + 10);
      fillRR(ctx, RX + 28, y - 30, 118, 42, 21, R.tint);
      text(ctx, lab, RX + 87, y - 2, { size: 21, weight: 600, align: "center", color: R["accent-text"] });
      text(ctx, s, RX + 162, y, { size: 26, color: R.text });
      ctx.restore();
    });
    ctx.restore();
  }
  // ---- the folder: the chat is a .md file; the PDF lands beside it
  const fk = seg(l, Q.files, Q.files + 10);
  if (fk > 0) {
    const rows = [
      { name: "chats", kind: "dir" },
      { name: "rottnest-trip.md", kind: "chat", depth: 1, note: "this chat" },
      ...(l >= Q.pdf ? [{ name: "rottnest-plan.pdf", kind: "pdf", depth: 1, note: "new" }] : []),
    ];
    const sel = l >= Q.chatFile ? 1 : l >= Q.pdf ? 2 : -1;
    ctx.save();
    ctx.globalAlpha *= fk;
    ctx.translate(0, 16 * (1 - easeInOut(fk)));
    fileList(ctx, T, { x: RX, y: 580, w: RW, h: 192 }, rows, sel);
    ctx.restore();
    if (l >= Q.pdf && l < Q.pdf + 16) sparkle(ctx, RX + RW - 30, 690, 20 * (1 - (l - Q.pdf) / 16), C.clay, l / 5);
    if (l >= Q.chatFile && l < Q.chatFile + 16)
      sparkle(ctx, RX + RW - 30, 636, 20 * (1 - (l - Q.chatFile) / 16), C.clay, l / 5);
  }
  // ---- the model picker: a model on your Mac, or tools you already use
  const dk = open ? pop(seg(l, Q.model + 2, Q.model + 14)) : 0;
  if (dk > 0) {
    const dx = CR - 270,
      dy = 214;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, dk * 1.4);
    ctx.translate(CR, dy);
    ctx.scale(0.92 + 0.08 * dk, 0.92 + 0.08 * dk);
    ctx.translate(-CR, -dy);
    fillRR(ctx, dx, dy, 270, 180, 16, R.surface, R.text, 2);
    MODELS.forEach((m, i) => {
      const y = dy + 10 + i * 54;
      if (i === 0) fillRR(ctx, dx + 8, y, 254, 50, 10, R.tint);
      else if (i === 1 && l >= 672) fillRR(ctx, dx + 8, y, 254, 50, 10, R["surface-2"]);
      text(ctx, m, dx + 26, y + 35, { size: 26, weight: i === 0 ? 600 : 500, color: R.text });
    });
    ctx.restore();
  }
  if (l >= 140) {
    const p = ptrAt(l);
    pointer(ctx, p.x, p.y, press(l, Q.send1) || press(l, Q.send2) || press(l, Q.model) || press(l, Q.chatFile));
  }
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  host(ctx, env, l, {
    pose: l < Q.notes ? "ai_chat" : l < Q.q2[0] ? "notes" : l < Q.chatFile ? "ai_chat" : "celebrating",
  });
  lowerThird(ctx, l, 110, 292, "Chat reads the vault you are in.", "It answers from what is actually there.");
  lowerThird(
    ctx,
    l,
    296,
    458,
    "After every reply: Conversation notes.",
    "Decisions, facts, action items, open questions.",
  );
  lowerThird(
    ctx,
    l,
    462,
    622,
    "Ask for a PDF. It's filed beside the chat.",
    "In the Mac app: new notes, edits, Word documents, boards.",
  );
  lowerThird(
    ctx,
    l,
    628,
    714,
    "A model that runs on your Mac,",
    "or the tools you already use, like Claude Code and Codex.",
  );
  lowerThird(ctx, l, 718, DEMO_END, "The chat is saved as Markdown too.", "rottnest-trip.md, in your folder.");
};

export const ep06Chat: Film = {
  meta: { title: "ep06Chat", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: TOTAL, raster: "cpu" },
  assets: { images: {}, fonts: FONTS },
  shots: [
    {
      id: "title",
      start: 0,
      end: TITLE,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        titleCard(c, e, l, l, { no: 6, title: ["Ask your notes."], pose: "ai_chat" });
      },
    },
    {
      id: "demo",
      start: TITLE,
      end: DEMO_END,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        demo(c, l + TITLE, e);
      },
    },
    {
      id: "end",
      start: DEMO_END,
      end: TOTAL,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        endCard(c, e, DEMO_END + l, l, { pose: "ai_chat" });
      },
    },
  ],
  audio: makeScore({
    frames: TOTAL,
    energeticFrom: 120,
    endAt: 780,
    bellAt: [DEMO_END],
    pops: [
      [Q.send1 + 2, 84],
      [Q.src[0], 79],
      [Q.src[1], 81],
      [Q.src[2], 84],
      [Q.ans[0], 86],
      [Q.ans[1], 88],
      [Q.ans[2], 91],
      [Q.notes, 84],
      [Q.rows[0], 86],
      [Q.rows[1], 88],
      [Q.rows[2], 91],
      [Q.rows[3], 93],
      [Q.files, 88],
      [Q.send2 + 2, 86],
      [Q.reply[0], 88],
      [Q.pdf, 96],
      [Q.model, 91],
      [Q.chatFile, 96],
    ],
    clicks: [
      ...[Q.q1, Q.q2].flatMap(([a, b]) => Array.from({ length: Math.floor((b - a) / 3) }, (_, i) => a + i * 3)),
      Q.send1,
      Q.send2,
    ],
  }),
};

// crops are in the rendered frame (camera pushed in 1.15× from 126 to 715)
export const ep06Derive: DeriveSpec = {
  no: 6,
  series: "chat",
  vertical: [
    {
      frame: 165,
      len: 135,
      crop: { x: 121, y: 40, w: 890, h: 540 },
      title: "Chat reads your vault.",
      sub: "It answers from what is actually there.",
      hi: "your vault",
    },
    {
      frame: 315,
      len: 135,
      crop: { x: 981, y: 30, w: 710, h: 530 },
      title: "Conversation notes.",
      sub: "Rewritten after every reply.",
      hi: "notes",
    },
    {
      frame: 465,
      len: 120,
      crop: { x: 971, y: 40, w: 720, h: 770 },
      title: "Make this a PDF.",
      sub: "Filed beside the chat.",
      hi: "PDF",
    },
    {
      frame: 630,
      len: 75,
      crop: { x: 121, y: 40, w: 890, h: 510 },
      title: "Tools you already use.",
      sub: "A model on your Mac, or Claude Code and Codex.",
      hi: "already use",
    },
  ],
  slides: [
    {
      frame: 295,
      crop: { x: 121, y: 40, w: 890, h: 540 },
      title: "Chat reads your vault.",
      sub: "It answers from what is actually there.",
      hi: "your vault",
    },
    {
      frame: 450,
      crop: { x: 981, y: 30, w: 710, h: 530 },
      title: "Conversation notes.",
      sub: "Decisions, facts, actions, open questions.",
      hi: "notes",
    },
    {
      frame: 590,
      crop: { x: 981, y: 320, w: 710, h: 490 },
      title: "Make this a PDF.",
      sub: "Filed beside the chat, in your folder.",
      hi: "PDF",
    },
    {
      frame: 700,
      crop: { x: 121, y: 40, w: 890, h: 510 },
      title: "Tools you already use.",
      sub: "A model on your Mac, or Claude Code and Codex.",
      hi: "already use",
    },
  ],
  single: {
    frame: 624,
    crop: { x: 141, y: 24, w: 1540, h: 856 },
    title: "Ask your notes.",
    sub: "Answers from what is actually there.",
    hi: "notes",
  },
};
