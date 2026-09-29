// STUDY 50 · ASCII CINEMA (24 s, 30 fps, 120 bpm). Every picture is made of characters on one fixed grid, used
// as pixels: a cursor types and the grid floods with noise; the classic spinning doughnut; a waterfall of falling
// columns through which a line of words locks in; an invented face that resolves out of flickering noise; and an
// end card with the ramp laid out big under a title built from a 5×7 bitmap font. No product: subject "fun".
// Brief: series/studies/briefs/ascii-cinema.json · prompt: series/studies/prompts/ascii-cinema.prompt.md
//
// Learns from Andy Sloane's donut maths (https://www.a1k0n.net/2011/07/20/donut-math.html) and Paul Bourke's
// character ramps (https://paulbourke.net/dataformats/asciiart/). Their code and artworks are not used.
//
// The film is one continuous function paint(F). Each frame fills a character grid (a scratch buffer cleared every
// frame: nothing is carried between frames), where every cell is a pure function of (column, row, F) with
// randomness only from a seeded hash, then stamps the grid from a glyph atlas built once per size and scale.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env, Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("amber"),
  MONO = P.face.mono;
const FPS = 30,
  BPM = 120,
  N = 720; // a beat is 15 frames
const T = { torus: 90, rain: 270, face: 420, end: 600, sign: 660 };

// ---- the ramp: ten characters, dark to light. A cell's colour follows its level.
const RAMP = " .:-=+*#%@";
const DIM = 0,
  INK = 1,
  ACC = 2;
const COLORS = [C.dim, C.ink, C.accent];
const tone = (l: number) => (l <= 3 ? DIM : l <= 7 ? INK : ACC);
// the rain's tails re-roll among characters of about the same weight as each ramp level
const FAMILY = [" ", ".,`'", ':;"', "-~^", "=<>", "+!?", "*xo", "#$&", "%8B", "@"];

// ---- a seeded integer hash → [0, 1)
const hash = (a: number, b: number, c = 0, d = 0) => {
  let h =
    Math.imul(a | 0, 374761393) ^
    Math.imul((b | 0) + 7, 668265263) ^
    Math.imul((c | 0) + 13, -2048144777) ^
    Math.imul((d | 0) + 29, -1028477379);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2246822519 | 0);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

// ---- a 5×7 bitmap font for the end title
const FONT: Record<string, string[]> = {
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
};
// the opening word, lowercase and proportional (so 'hello.' fits the narrow grid): 28 bitmap pixels wide
const HELLO: string[][] = [
  ["#....", "#....", "#.##.", "##..#", "#...#", "#...#", "#...#"],
  [".....", ".....", ".###.", "#...#", "#####", "#....", ".####"],
  ["##.", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
  ["##.", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
  [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
  ["..", "..", "..", "..", "..", "##", "##"],
];

// a line of typed copy: where it sits, when it starts, frames per letter, its one accent word, and its scale K
// (K > 1: each character is one big cell spanning K × K cells of the fine grid)
type Typed = { s: string; c: number; r: number; t0: number; rate: number; accent?: string; K?: number };
const letterAt = (L: Typed, i: number) => L.t0 + Math.round(i * L.rate);
const typedEnd = (L: Typed) => letterAt(L, L.s.length - 1);

export function make(size: Size, id: string): Film {
  const Lo = layout(size),
    { W, H, u, tall } = Lo;
  const cw = 14.4 * u,
    ch = 24 * u,
    COLS = Math.floor(W / cw + 1e-6),
    ROWS = Math.floor(H / ch + 1e-6),
    ox = (W - COLS * cw) / 2,
    oy = (H - ROWS * ch) / 2,
    NC = COLS * ROWS;
  // the last row whose cells sit fully inside layout().safe (the bottom captions sit on it)
  const rowBot = Math.floor((H - Lo.safe.bottom - oy) / ch) - 1;
  // CAPTION SCALE. The brief sets captions in the fine 24 px grid; in landscape that is about 4.5 px on a phone.
  // With the owner's approval the landscape captions sit on a coarser grid whose every cell is exactly 3 × 3 fine
  // cells (72 px characters, about 13.5 px on a phone), aligned to the fine grid. Vertical keeps the brief's 24 px.
  const CK = tall ? 1 : 3,
    capTop = rowBot - CK + 1; // the top fine row of a bottom caption
  const centreCol = (s: string, K = 1) => Math.floor((COLS - s.length * K) / 2);

  // the frame's grid: a char code and a colour per cell (scratch, fully cleared every frame)
  const chr = new Uint8Array(NC),
    col = new Uint8Array(NC);
  const put = (c: number, r: number, code: number, k: number) => {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
    chr[r * COLS + c] = code;
    col[r * COLS + c] = k;
  };
  const lv = (c: number, r: number, l: number) => {
    l = clamp(Math.round(l), 0, 9);
    put(c, r, RAMP.charCodeAt(l), tone(l));
  };
  const noise = (c: number, r: number, F: number, every = 2, salt = 0) => {
    const h = hash(c, r, Math.floor(F / every), 91 + salt);
    lv(c, r, 1 + Math.floor(h * h * 9));
  };
  let cursors: [number, number, number][] = [];
  // big characters (K × K fine cells each), stamped after the fine grid over cells cleared beneath them
  type Big = { c: number; r: number; code: number; k: number; K: number };
  let bigs: Big[] = [];
  const putT = (c: number, r: number, code: number, k: number, K: number) => {
    if (K === 1) put(c, r, code, k);
    else bigs.push({ c, r, code, k, K });
  };

  // ---- typed lines (the captions are characters in the grid: ink, one accent word)
  const typeLine = (L: Typed, F: number, hideAfter = Infinity) => {
    if (F < L.t0 || F >= hideAfter) return;
    const a = L.accent ? L.s.indexOf(L.accent) : -1,
      K = L.K ?? 1;
    let n = 0;
    for (let i = 0; i < L.s.length; i++) {
      if (letterAt(L, i) > F) break;
      n = i + 1;
      const inAccent = a >= 0 && i >= a && i < a + L.accent!.length;
      putT(L.c + i * K, L.r, L.s.charCodeAt(i), inAccent ? ACC : INK, K);
    }
    return n;
  };
  const cursorAfter = (L: Typed, F: number, until: number) => {
    if (F < L.t0 - 6 || F >= until) return;
    const n = L.s.split("").filter((_, i) => letterAt(L, i) <= F).length,
      typing = F <= typedEnd(L) + 2,
      K = L.K ?? 1;
    if (typing || Math.floor((F - typedEnd(L)) / 8) % 2 === 1) cursors.push([L.c + n * K, L.r, K]);
  };

  // ================================================================ 1 · HELLO
  // Frame 0 is already a full grid of ramp noise; by half a second it has resolved into a huge 'hello.' in the
  // bitmap font (each bitmap pixel a block of '#' cells), and the second line types under it.
  const hpW = tall ? 2 : 3,
    hpH = tall ? 1 : 2,
    helloW = HELLO.reduce((a, g) => a + g[0]!.length + 1, -1) * hpW,
    helloC0 = Math.floor((COLS - helloW) / 2),
    helloR0 = tall ? 32 : 11;
  const helloPix = new Uint8Array(NC);
  {
    let x = 0;
    for (const g of HELLO) {
      g.forEach((row, gy) =>
        [...row].forEach((b, gx) => {
          if (b !== "#") return;
          for (let i = 0; i < hpW; i++)
            for (let j = 0; j < hpH; j++) {
              const c = helloC0 + (x + gx) * hpW + i,
                r = helloR0 + gy * hpH + j;
              if (c >= 0 && c < COLS && r >= 0 && r < ROWS) helloPix[r * COLS + c] = 1;
            }
        }),
      );
      x += g[0]!.length + 1;
    }
  }
  const HELLO_IN = 15; // 'hello.' is complete on the first beat, with a hit
  const helloLines: Typed[] = tall
    ? [
        { s: "everything you see", c: 0, r: 41, t0: 17, rate: 1.4 },
        { s: "here is text.", c: 0, r: 42, t0: 43, rate: 1.4, accent: "text." },
      ]
    : [
        {
          s: "everything you see here is text.",
          c: 0,
          r: helloR0 + 7 * hpH + 3,
          t0: 17,
          rate: 1.3,
          accent: "text.",
          K: CK,
        },
      ];
  {
    const left = tall ? centreCol("everything you see") : centreCol(helloLines[0]!.s, CK);
    helloLines.forEach((L) => (L.c = left));
  }
  const heroRow = helloLines[0]!.r,
    heroCol = COLS / 2;
  const hello = (F: number) => {
    const last = helloLines[helloLines.length - 1]!,
      maxd = Math.hypot(COLS * 0.6, ROWS);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const k = r * COLS + c,
          d = Math.hypot((c - heroCol) * 0.6, r - heroRow) / maxd,
          floodAt = 62 + d * 12 + hash(c, r, 1) * 3,
          drainAt = 76 + (r / ROWS) * 12 + hash(c, r, 2) * 2;
        if (F >= floodAt) {
          // the flood pours out from the words, then drains away row by row from the top
          if (F < drainAt) noise(c, r, F, 2, 1);
          continue;
        }
        // the opening: every cell starts as noise and settles at its own seeded time (the word's cells first)
        const settle = helloPix[k] ? 3 + hash(c, r, 4) * 9 : 5 + hash(c, r, 5) * (HELLO_IN - 5);
        if (F < settle) noise(c, r, F, 1, 2);
        else if (helloPix[k]) put(c, r, 35, F < settle + 2 ? ACC : INK);
      }
    // big lines hide as the flood reaches them (the flood starts at their row)
    for (const L of helloLines) typeLine(L, F, (L.K ?? 1) > 1 ? 63 : 70);
    // the cursor rides the typing, then blinks at the end of the last line until the flood
    if (F >= HELLO_IN && F < 64) {
      const live = [...helloLines].reverse().find((L) => F >= L.t0 - 1) ?? helloLines[0]!,
        K = live.K ?? 1;
      const n = live.s.split("").filter((_, i) => letterAt(live, i) <= F).length,
        typing = F <= typedEnd(last) + 1 && F <= typedEnd(live) + 1;
      if (typing || Math.floor(F / 7) % 2 === 0) cursors.push([live.c + n * K, live.r, K]);
    }
  };

  // ================================================================ 2 · THE TORUS
  // donut maths: tube radius R1 = 1, ring radius R2 = 2, viewer distance K2 = 5, rotated by A = 0.07·F about
  // x and B = 0.03·F about z; projected in pixels and bucketed into cells, so the 0.6 cell aspect is corrected
  // (the doughnut stays round); a 1/z buffer per cell keeps the nearest surface; light from above-behind.
  const zbuf = new Float32Array(NC),
    tlev = new Int8Array(NC);
  const torusCx0 = W / 2,
    torusCy0 = tall ? oy + 27.5 * ch : oy + 20.5 * ch,
    torusK1 = tall ? 580 * u : 560 * u;
  // "one light": it starts above and behind the viewer, then snaps to a new side on the beat (a hit on each)
  const LIGHTS: [number, number[]][] = [
    [T.torus, [0, 1, -1]], // above, behind the viewer
    [165, [-1, 0.35, -0.55]], // from the left
    [195, [1, 0.35, -0.55]], // from the right
    [225, [0, -0.9, -0.6]], // from below
    [255, [0, 1, -1]], // home
  ];
  // each light snap is also a hard cut to a new framing: [dx, dy, scale] in px, per size
  const FRAMING: [number, number, number][] = tall
    ? [
        [0, 0, 1],
        [0, -150 * u, 0.62],
        [0, 30 * u, 1.2],
        [0, 170 * u, 0.62],
        [0, 0, 1],
      ]
    : [
        [0, 0, 1],
        [-0.22 * W, 0, 0.85],
        [0.22 * W, 0, 0.85],
        [0, 25 * u, 1.1],
        [0, 0, 1],
      ];
  const framingAt = (F: number) => {
    let v = FRAMING[0]!;
    LIGHTS.forEach(([f], i) => {
      if (F >= f) v = FRAMING[i]!;
    });
    return v;
  };
  const lightAt = (F: number) => {
    let v = LIGHTS[0]![1];
    for (const [f, l] of LIGHTS) if (F >= f) v = l;
    const n = Math.hypot(v[0]!, v[1]!, v[2]!);
    return [v[0]! / n, v[1]! / n, v[2]! / n] as const;
  };
  const torus = (F: number, scale: number) => {
    zbuf.fill(0);
    tlev.fill(-1);
    const [Lx, Ly, Lz] = lightAt(F),
      [fdx, fdy, fs] = framingAt(F),
      torusCx = torusCx0 + fdx,
      torusCy = torusCy0 + fdy;
    const A = 0.07 * F,
      B = 0.03 * F,
      cA = Math.cos(A),
      sA = Math.sin(A),
      cB = Math.cos(B),
      sB = Math.sin(B),
      K1 = torusK1 * scale * fs,
      R1 = 1,
      R2 = 2,
      K2 = 5;
    for (let i = 0; i < 90; i++) {
      const th = (i / 90) * Math.PI * 2,
        ct = Math.cos(th),
        st = Math.sin(th);
      for (let j = 0; j < 314; j++) {
        const ph = (j / 314) * Math.PI * 2,
          cp = Math.cos(ph),
          sp = Math.sin(ph);
        const hx = R2 + R1 * ct,
          hy = R1 * st;
        const x = hx * (cB * cp + sA * sB * sp) - hy * cA * sB,
          y = hx * (sB * cp - sA * cB * sp) + hy * cA * cB,
          z = K2 + cA * hx * sp + hy * sA,
          ooz = 1 / z;
        const c = Math.floor((torusCx + K1 * ooz * x - ox) / cw),
          r = Math.floor((torusCy - K1 * ooz * y - oy) / ch);
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
        const k = r * COLS + c;
        if (ooz <= zbuf[k]!) continue;
        zbuf[k] = ooz;
        // the surface normal (the same rotation with the tube's unit circle) · the light, in −1..1
        const Nx = ct * (cB * cp + sA * sB * sp) - st * cA * sB,
          Ny = ct * (sB * cp - sA * cB * sp) + st * cA * cB,
          Nz = cA * ct * sp + st * sA,
          Ln = Nx * Lx + Ny * Ly + Nz * Lz;
        tlev[k] = Ln < -0.3 ? 1 : Ln < 0 ? 2 : 3 + Math.min(6, Math.floor(Ln * 7));
      }
    }
  };
  const torusScene = (F: number) => {
    const fade = ease.outCubic(prog(F, T.torus, T.torus + 30)),
      grow = 0.55 + 0.45 * spring((F - T.torus) / FPS, { freq: 1.4, damp: 0.62 }),
      push = 1 + 0.07 * ease.inOutCubic(prog(F, T.torus + 30, T.rain + 30));
    torus(F, grow * push);
    // from the rain on, it dissolves downward: every column falls at its own seeded rate, and dims
    const fall = F - T.rain,
      dim = 1 - prog(F, T.rain + 12, T.rain + 44);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const l = tlev[r * COLS + c]!;
        if (l < 0) continue;
        let rr = r;
        if (fall > 0) rr = r + Math.floor(fall * fall * (0.012 + 0.03 * hash(c, 0, 5)) + fall * 0.2);
        const lvl = Math.round(l * fade * dim);
        if (lvl >= 1 || (fade > 0.05 && dim > 0.3)) lv(c, rr, Math.max(1, lvl));
      }
    // each cut to a new light and framing lands through two frames of full-grid static, on the hit
    if (LIGHTS.slice(1).some(([f]) => F >= f && F < f + 2))
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (tlev[r * COLS + c]! < 0) noise(c, r, F, 1, 7);
  };

  // ================================================================ 3 · THE RAIN
  // every column: a seeded speed (0.3–1 rows a frame), a drop spacing, a tail of 8–20 cells and a phase.
  // Time slows after the rain scene (a closed-form ease), so the waterfall decelerates into the portrait's noise.
  const R0 = T.rain - 4;
  const tau = (F: number) => (F <= T.face ? F : T.face + 22 * (1 - Math.exp(-(F - T.face) / 22)));
  const speed = new Float32Array(COLS),
    period = new Float32Array(COLS),
    tail = new Uint8Array(COLS),
    phase = new Float32Array(COLS),
    pre = new Float32Array(COLS);
  for (let c = 0; c < COLS; c++) {
    speed[c] = 0.3 + 0.7 * hash(c, 1, 3);
    period[c] = 26 + Math.floor(hash(c, 2, 3) * 26);
    tail[c] = 8 + Math.floor(hash(c, 3, 3) * 13);
    phase[c] = hash(c, 4, 3) * 10;
    // some columns are already falling when the rain begins (it fades up), so the waterfall fills a tall frame
    pre[c] = hash(c, 9, 3) * ROWS * (tall ? 0.55 : 0.3);
  }
  // the locked-in line: its columns get a phase so that a head crosses its row at the letter's lock time
  const lockLines: Typed[] = (
    tall
      ? [
          { s: "every glyph", c: 0, r: 39, t0: 0, rate: 0 },
          { s: "is a pixel", c: 0, r: 41, t0: 0, rate: 0, accent: "pixel" },
        ]
      : [{ s: "every glyph is a pixel", c: 0, r: 21, t0: 0, rate: 0, accent: "pixel", K: CK }]
  ).map((L: Typed) => ({ ...L, c: centreCol(L.s, L.K ?? 1) }));
  // a letter's carrying column and row: the middle fine cell of its (big) cell
  const mid = (L: Typed) => Math.floor((L.K ?? 1) / 2);
  {
    const first = lockLines[0]!,
      K = first.K ?? 1,
      lr = first.r + mid(first);
    [...first.s].forEach((_, i) => {
      const c = first.c + i * K + mid(first);
      // the columns that carry letters fall at the quick end of the range, so the line locks in on time
      speed[c] = 0.6 + 0.4 * hash(c, 1, 3);
      const want = Math.max(298 + i * 1.2 + hash(c, 7) * 5, R0 + Math.max(0, lr + 2 - pre[c]!) / speed[c]!),
        base = (want - R0) * speed[c]! + pre[c]! - lr;
      phase[c] = base - Math.floor(base / period[c]!) * period[c]!;
    });
  }
  // head of drop k (k = 0 is the lowest) in rows
  const headRow = (c: number, F: number, k: number) => (tau(F) - R0) * speed[c]! + pre[c]! - phase[c]! - k * period[c]!;
  // the first frame at or after `from` when a head passes row r in column c
  const crossAt = (c: number, r: number, from: number) => {
    for (let f = from; f < N; f++) {
      const h0 = headRow(c, f, 0);
      for (let k = 0; k <= h0 / period[c]! + 1; k++) if (Math.floor(headRow(c, f, k)) === r) return f;
    }
    return N;
  };
  const locks = lockLines.flatMap((L) =>
    [...L.s].map((chr_, i) => {
      const K = L.K ?? 1,
        c = L.c + i * K,
        a = L.accent ? L.s.indexOf(L.accent) : -1;
      return {
        c,
        r: L.r,
        K,
        mc: c + mid(L),
        code: chr_.charCodeAt(0),
        k: a >= 0 && i >= a ? ACC : INK,
        at: chr_ === " " ? N : crossAt(c + mid(L), L.r + mid(L), 296),
        off: 384 + Math.floor(hash(c, L.r, 8) * 18) + Math.floor((i / L.s.length) * 6),
      };
    }),
  );
  const band = lockLines.map((L) => ({
    c0: L.c - 2,
    c1: L.c + L.s.length * (L.K ?? 1) + 1,
    r0: L.r - 1,
    r1: L.r + (L.K ?? 1),
  }));
  const inBand = (c: number, r: number) => band.some((b) => c >= b.c0 && c <= b.c1 && r >= b.r0 && r <= b.r1);
  const rain = (F: number) => {
    const cap =
        F < T.face ? Math.round(9 * prog(F, R0, R0 + 26)) : Math.round(9 * (1 - prog(F, T.face + 4, T.face + 40))),
      quiet = Math.min(prog(F, 298, 312), 1 - prog(F, 386, 400));
    if (cap <= 0) return;
    for (let c = 0; c < COLS; c++) {
      const tl = tail[c]!,
        h0 = headRow(c, F, 0);
      for (let k = 0; ; k++) {
        const h = h0 - k * period[c]!;
        if (h < 0) break;
        const head = Math.floor(h);
        if (head - tl >= ROWS) continue;
        for (let i = 0; i <= tl; i++) {
          const r = head - i;
          if (r < 0 || r >= ROWS) continue;
          let l = i === 0 ? 9 : Math.max(1, Math.round(8 * (1 - i / (tl + 1)) + 0.4));
          // the band around the locked line clears while it holds, so the words read at phone size
          if (quiet > 0 && inBand(c, r)) l = Math.min(l, Math.round(9 - 9 * quiet));
          l = Math.min(l, cap);
          if (l <= 0) continue;
          if (i === 0 && l === 9) {
            put(c, r, 64, ACC);
            continue;
          }
          const fam = FAMILY[l]!,
            pick = fam[Math.floor(hash(c, r, Math.floor(F / 6), 17) * fam.length)]!;
          put(c, r, pick.charCodeAt(0), tone(l));
        }
      }
    }
  };
  const lockedLine = (F: number) => {
    for (const q of locks) {
      if (F < q.at) continue;
      if (F < q.off) {
        putT(q.c, q.r, q.code, q.k, q.K);
        continue;
      }
      // let go: the letter falls with its column and dims as it goes
      const t = F - q.off,
        rr = q.r + Math.floor(t * (0.35 + 0.6 * speed[q.mc]!));
      if (t < 30) putT(q.c, rr, q.code, t < 8 ? q.k : DIM, q.K);
    }
  };

  // ================================================================ 4 · THE PORTRAIT
  // an invented face (nobody in particular) as a luminance field from signed-distance shapes, lit from the
  // upper left. Units of S (px), y down, origin at the head's centre; the eye row is snapped to a cell row.
  const S = (tall ? 860 : 680) * u;
  const eyeY = -0.02,
    eyeRow = tall ? 28 : 16,
    faceCx = W / 2,
    faceCy = oy + (eyeRow + 0.5) * ch - eyeY * S;
  const ell = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
  const faceMax = Math.hypot(W / 2, H / 2),
    fadeEnd = oy + (capTop - 1) * ch; // the jacket has faded out a row above the caption
  type Cell = { l: number; eye: boolean; hair?: boolean };
  const face = (c: number, r: number, F: number): Cell => {
    // a slow push-in on the eyes through the hold: in a grid of characters, a zoom re-samples every edge
    const Sz = S * (1 + 0.1 * ease.inOutCubic(prog(F, 500, T.end + 12))),
      x = (ox + (c + 0.5) * cw - faceCx) / Sz,
      y = (oy + (r + 0.5) * ch - (faceCy + eyeY * S)) / Sz + eyeY;
    // the light drifts a little through the hold so the face never freezes
    const drift = ease.inOutCubic(prog(F, 470, T.end)),
      lx0 = -0.62 + 0.34 * drift,
      ly0 = -0.5,
      lz0 = 0.62,
      ln = Math.hypot(lx0, ly0, lz0),
      lx = lx0 / ln,
      ly = ly0 / ln,
      lz = lz0 / ln;
    const shade = (nx: number, ny: number) => {
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      return Math.max(0, nx * lx + ny * ly + nz * lz);
    };
    const none: Cell = { l: 0, eye: false };
    // shoulders and neck (clothing darker than skin); fade into the dark toward the bottom
    const breath = 0.006 * Math.sin((F / FPS) * 2.2);
    const sh = ell(x, y, 0, 0.84 + breath, 0.78, 0.42),
      py = oy + (r + 0.5) * ch,
      fadeDown = 1 - clamp((py - (fadeEnd - 6 * ch)) / (6 * ch));
    const faceIn = ell(x, y, 0, 0.04, 0.262, 0.36),
      hairIn = ell(x, y, 0, -0.07, 0.34, 0.4) < 1 && y < 0.2;
    // the fringe sweeps down from the right parting
    const fringe = -0.24 + 0.1 * clamp((0.12 - x) / 0.38) + 0.018 * Math.sin(x * 40);
    if (hairIn && !(faceIn < 1 && y > fringe)) {
      const n = shade((x / 0.34) * 0.9, ((y + 0.07) / 0.4) * 0.9);
      return { l: 1 + Math.round(clamp(0.12 + 0.5 * n) * 5), eye: false, hair: true };
    }
    if (faceIn < 1) {
      const nx = (x / 0.262) * 0.8,
        ny = ((y - 0.04) / 0.36) * 0.75;
      // a broad, soft light, so the whole upper-left cheek is lit (not only a band at the eyes)
      let lum = 0.34 + 0.66 * shade(nx * 0.8, ny * 0.8);
      // eyes: two almonds, dark; brows above them
      for (const ex of [-0.105, 0.105]) {
        if (ell(x, y, ex, eyeY, 0.058, 0.03) < 1) return { l: 0, eye: true };
        if (ell(x, y, ex + 0.004, eyeY - 0.075, 0.07, 0.022) < 1 && Math.abs(y - (eyeY - 0.075)) < 0.02) lum *= 0.32;
      }
      // the nose's shadow falls to the right of the bridge (the light is upper left); a nostril below
      if (ell(x, y, 0.035, 0.095, 0.03, 0.07) < 1) lum *= 0.5;
      if (ell(x, y, 0.01, 0.15, 0.045, 0.016) < 1) lum *= 0.35;
      // the mouth line, softly curved
      const my = 0.235 + 0.9 * x * x;
      if (Math.abs(x) < 0.085 && Math.abs(y - my) < Math.max(0.024, (12.5 * u) / S)) lum *= 0.2;
      return { l: 1 + Math.round(clamp(lum) * 8), eye: false };
    }
    // the neck: a cylinder, shadowed under the chin
    if (Math.abs(x) < 0.115 && y > 0.25 && y < 0.62) {
      const n = shade(x / 0.115, 0) * (0.35 + 0.65 * clamp((y - 0.4) / 0.25));
      return { l: 1 + Math.round(clamp(0.16 + 0.6 * n) * 8), eye: false };
    }
    if (sh < 1 && y > 0.4) {
      // a V neckline, then the jacket
      if (Math.abs(x) < 0.15 - (y - 0.46) * 0.7 && y > 0.46) return { l: 2, eye: false };
      const n = shade((x / 0.72) * 0.95, ((y - 0.9) / 0.42) * 0.95);
      const l = Math.round(clamp(0.1 + 0.62 * n) * 8 * fadeDown);
      return l > 1 || (l > 0 && fadeDown > 0.9) ? { l, eye: false } : none;
    }
    return none;
  };
  const resolveAt = (c: number, r: number) => {
    const d = Math.hypot(ox + (c + 0.5) * cw - faceCx, (oy + (r + 0.5) * ch - (faceCy + 0.15 * S)) * 1.1) / faceMax;
    return Math.min(536, 446 + d * 78 + hash(c, r, 21) * 16);
  };
  const BLINK = 556;
  const faceCaption: Typed = {
    s: "a portrait of nobody in particular",
    c: 0,
    r: capTop,
    t0: 546,
    rate: 1,
    accent: "nobody",
    K: CK,
  };
  faceCaption.c = centreCol(faceCaption.s, CK);

  // ================================================================ 5 · END
  const titleWords = tall ? ["TEXT", "MODE"] : ["TEXT MODE"],
    pxW = 2, // each bitmap pixel is 2 columns × 1 row of '#' (about square: 28.8 × 24 px)
    titleTop = tall ? 17 : 10,
    titleGap = 3;
  type Pix = { c: number; r: number; at: number; x01: number };
  const titlePix: Pix[] = [];
  const titleLetterAt: number[] = [];
  {
    let n = 0;
    titleWords.forEach((w, wi) => {
      const wcols = (w.length * 6 - 1) * pxW,
        c0 = Math.floor((COLS - wcols) / 2),
        r0 = titleTop + wi * (7 + titleGap);
      [...w].forEach((ch_, li) => {
        const g = FONT[ch_];
        if (!g) return;
        const at = 622 + n * 4;
        titleLetterAt.push(at);
        n++;
        g.forEach((row, gy) =>
          [...row].forEach((b, gx) => {
            if (b !== "#") return;
            for (let k = 0; k < pxW; k++) {
              const c = c0 + (li * 6 + gx) * pxW + k,
                r = r0 + gy;
              titlePix.push({ c, r, at: at + Math.floor(hash(c, r, 31) * 5), x01: (c - c0) / wcols });
            }
          }),
        );
      });
    });
  }
  const titleBottom = titleTop + titleWords.length * 7 + (titleWords.length - 1) * titleGap;
  const blockW = tall ? 6 : 11,
    rampRows = tall ? 7 : 5,
    rampC0 = Math.floor((COLS - blockW * 10) / 2),
    rampR0 = titleBottom + (tall ? 5 : 4),
    rampR1 = rampR0 + rampRows - 1,
    labelRow = rampR1 + 2;
  const inRamp = (c: number, r: number) => c >= rampC0 && c < rampC0 + blockW * 10 && r >= rampR0 && r <= rampR1;
  const lastLine: Typed = {
    s: "a love letter to text mode",
    c: 0,
    r: labelRow + (tall ? 5 : 2 + 2 * CK),
    t0: 664,
    rate: 1,
    accent: "love",
    K: CK,
  };
  lastLine.c = centreCol(lastLine.s, CK);
  const labels: Typed[] = [
    { s: "dark", c: rampC0, r: labelRow, t0: 640, rate: 1, K: CK },
    { s: "light", c: rampC0 + blockW * 10 - 5 * CK, r: labelRow, t0: 646, rate: 1, K: CK },
  ];
  // a glint sweeps across the title and the ramp through the hold
  const glint = (x01: number, r: number, F: number) => {
    // two glints half a period apart, so one is always crossing
    const t = (F - 650) / 40,
      k = x01 + (r - titleTop) * 0.012 + 0.1;
    return (
      F >= 650 && [t % 1.2, (t + 0.6) % 1.2].some((g) => (F - 650 >= 24 || g === t % 1.2) && Math.abs(k - g) < 0.04)
    );
  };

  // ---- the portrait, and its break into noise (both run into the end)
  const portrait = (F: number) => {
    const density = prog(F, T.face - 4, T.face + 22);
    const blink = F >= BLINK && F < BLINK + 4,
      shimmer = 0.45 * prog(F, BLINK + 4, BLINK + 20);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const res = resolveAt(c, r),
          brk = T.end + Math.floor(hash(c, r, 41) * 12),
          clear = inRamp(c, r) ? Infinity : T.end + 12 + Math.floor(hash(c, r, 42) * 14);
        if (F >= res && F < brk) {
          const q = face(c, r, F);
          if (q.eye) {
            if (blink) put(c, r, 45, INK);
          } else if (q.hair && q.l >= 3) {
            // hair is drawn in strokes that follow its fall (the ramp's '=' and '-' read as stripes)
            const x = (ox + (c + 0.5) * cw - faceCx) / S,
              g = Math.abs(x) > 0.25 ? "|" : x < 0.12 ? "/" : "\\";
            put(c, r, g.charCodeAt(0), tone(q.l + 1));
          } else if (q.l >= 4 && hash(c, r, Math.floor((F + hash(c, r, 44) * 3) / 3), 45) < shimmer) {
            // once complete, the face keeps breathing as text: cells swap among characters of the same weight
            const fam = FAMILY[q.l]!;
            put(c, r, fam.charCodeAt(Math.floor(hash(c, r, Math.floor(F / 3), 46) * fam.length)), tone(q.l));
          } else if (q.l > 0) lv(c, r, q.l);
        } else if (F >= brk ? F < clear : hash(c, r, 43) < density * 0.9) noise(c, r, F, 2, 3);
      }
  };
  const end = (F: number) => {
    // the ramp: its noise sorts itself left to right into ten blocks, dark to light
    for (let r = rampR0; r <= rampR1; r++)
      for (let c = rampC0; c < rampC0 + blockW * 10; c++) {
        const b = Math.floor((c - rampC0) / blockW),
          x01 = (c - rampC0) / (blockW * 10),
          sortAt = 612 + Math.floor(x01 * 16 + hash(c, r, 51) * 7);
        if (F < sortAt) {
          if (F >= T.end + Math.floor(hash(c, r, 41) * 12)) noise(c, r, F, 2, 3);
          continue;
        }
        const up = glint(x01, r, F) && b > 0 ? 2 : 0;
        lv(c, r, Math.min(9, b + up));
      }
    for (const p of titlePix) {
      if (F < p.at) continue;
      if (glint(p.x01, p.r, F)) put(p.c, p.r, 64, ACC);
      else put(p.c, p.r, 35, F < p.at + 2 ? ACC : INK);
    }
    for (const L of labels) typeLine(L, F);
    typeLine(lastLine, F);
    cursorAfter(lastLine, F, N);
  };

  // ---- captions for the doughnut and the portrait
  const torusCaption: Typed = {
    s: "ten characters, one light",
    c: 0,
    r: tall ? 52 : capTop,
    t0: 144,
    rate: 2,
    accent: "light",
    K: CK,
  };
  torusCaption.c = centreCol(torusCaption.s, CK);

  // ================================================================ PAINT
  const STATIC = [T.rain, 390];
  const paintGrid = (F: number) => {
    chr.fill(32);
    col.fill(0);
    cursors = [];
    bigs = [];
    if (F < T.torus) hello(F);
    if (F >= T.torus && F < T.rain + 50) torusScene(F);
    if (F >= R0 && F < T.face + 42) rain(F);
    // static cuts: the doughnut shatters into the rain, and the rain surges as the line lets go
    if (STATIC.some((f) => F >= f && F < f + 2))
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) noise(c, r, F, 1, 8);
    if (F >= T.rain && F < T.face + 20) lockedLine(F);
    if (F >= T.torus && F < T.rain + 6) {
      typeLine(torusCaption, F);
      cursorAfter(torusCaption, F, T.rain - 30);
    }
    if (F >= T.face - 4) portrait(F);
    if (F >= faceCaption.t0 && F < T.end + 6) {
      typeLine(faceCaption, F);
      cursorAfter(faceCaption, F, T.end);
    }
    if (F >= T.end) end(F);
    // big characters own their K × K block: the fine cells beneath them are cleared
    for (const b of bigs) for (let j = 0; j < b.K; j++) for (let i = 0; i < b.K; i++) put(b.c + i, b.r + j, 32, 0);
  };

  // the glyph atlas: printable ASCII in three colours, rendered once per size and device scale
  const atlas = (env: Env, K = 1) => {
    const key = `asciiCinema:atlas:${size}:${env.scale}:${K}`;
    let A = env.cache.get(key) as { L: Layer; sw: number; sh: number; pad: number } | undefined;
    if (!A) {
      const s = env.scale,
        pad = Math.ceil(4 * s),
        sw = Math.ceil(cw * K * s) + pad * 2,
        sh = Math.ceil(ch * K * s) + pad * 2;
      const L = env.canvas(sw * 95, sh * COLORS.length);
      const g = L.ctx;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, sw * 95, sh * COLORS.length);
      g.font = `500 ${24 * K * u * s}px "${MONO}"`;
      g.textBaseline = "alphabetic";
      g.textAlign = "left";
      COLORS.forEach((k, ki) => {
        g.fillStyle = k;
        for (let i = 0; i < 95; i++)
          g.fillText(String.fromCharCode(32 + i), i * sw + pad, ki * sh + pad + 0.77 * ch * K * s);
      });
      A = { L, sw, sh, pad };
      env.cache.set(key, A);
    }
    return A;
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(Math.floor(F), 0, N - 1);
    paintGrid(F);
    const s = env.scale,
      A = atlas(env);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, Math.round(W * s), Math.round(H * s));
    for (let r = 0; r < ROWS; r++) {
      const y = Math.round((oy + r * ch) * s) - A.pad;
      for (let c = 0; c < COLS; c++) {
        const k = r * COLS + c,
          code = chr[k]!;
        if (code <= 32 || code > 126) continue;
        ctx.drawImage(
          A.L.canvas,
          (code - 32) * A.sw,
          col[k]! * A.sh,
          A.sw,
          A.sh,
          Math.round((ox + c * cw) * s) - A.pad,
          y,
          A.sw,
          A.sh,
        );
      }
    }
    // the big characters, from their own atlas
    if (bigs.length) {
      const B = atlas(env, CK);
      for (const b of bigs) {
        const code = b.code;
        if (code <= 32 || code > 126 || b.c < 0 || b.r < 0 || b.c + b.K > COLS || b.r + b.K > ROWS) continue;
        ctx.drawImage(
          B.L.canvas,
          (code - 32) * B.sw,
          b.k * B.sh,
          B.sw,
          B.sh,
          Math.round((ox + b.c * cw) * s) - B.pad,
          Math.round((oy + b.r * ch) * s) - B.pad,
          B.sw,
          B.sh,
        );
      }
    }
    // the cursor is a rect: the pack's mono has no block glyphs
    ctx.fillStyle = C.ink;
    for (const [c, r, K] of cursors)
      ctx.fillRect(
        Math.round((ox + c * cw) * s),
        Math.round((oy + r * ch + K * u) * s),
        Math.round(cw * K * s),
        Math.round((ch * K - 2 * K * u) * s),
      );
    // the ramp's band gets a hairline frame (a rect), so the blank first block reads as a block
    if (F >= 618) {
      ctx.globalAlpha = prog(F, 618, 630);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = Math.max(1, Math.round(2 * u * s));
      const pd = 6 * u;
      ctx.strokeRect(
        Math.round((ox + rampC0 * cw - pd) * s),
        Math.round((oy + rampR0 * ch - pd) * s),
        Math.round((blockW * 10 * cw + 2 * pd) * s),
        Math.round((rampRows * ch + 2 * pd) * s),
      );
      ctx.globalAlpha = 1;
    }
  };

  // ================================================================ FILM
  const cuts = [0, T.torus, T.rain, T.face, T.end, N],
    names = ["hello", "doughnut", "rain", "portrait", "end"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  // sound cues from the same schedules that paint
  const every2 = (L: Typed) => [...L.s].map((_, i) => letterAt(L, i)).filter((_, i) => i % 2 === 1);
  const ticks = [
    ...helloLines.flatMap(every2),
    ...every2(torusCaption),
    ...locks
      .filter((q) => q.at < N)
      .sort((a, b) => a.at - b.at)
      .filter((_, i) => i % 3 === 0)
      .map((q) => q.at),
    ...every2(faceCaption),
    ...titleLetterAt,
    ...every2(lastLine),
  ].filter((f) => f < T.sign || f > T.sign + 2);
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      drop: T.torus,
      hits: [HELLO_IN, ...LIGHTS.slice(1).map(([f]) => f), ...STATIC, 540],
      whooshes: [T.torus, T.rain],
      ticks: [...new Set(ticks)].sort((a, b) => a - b),
      sign: T.sign,
    }),
  };
}

export const asciiCinema = make("landscape", "asciiCinema");
export const asciiCinemaVertical = make("vertical", "asciiCinemaVertical");
