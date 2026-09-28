// A tiny deterministic synth for the studio's sound: no samples, no randomness except a seeded rng, the
// same numbers every render. Voices write into a stereo buffer; a small Schroeder reverb gives the room.
export const SR = 48000;
export type Buf = { L: Float32Array; R: Float32Array };
export const buffer = (seconds: number): Buf => ({
  L: new Float32Array(Math.ceil(seconds * SR)),
  R: new Float32Array(Math.ceil(seconds * SR)),
});
export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const add = (b: Buf, i: number, v: number, pan: number) => {
  if (i >= 0 && i < b.L.length) {
    b.L[i] += v * Math.cos((pan * Math.PI) / 2);
    b.R[i] += v * Math.sin((pan * Math.PI) / 2);
  }
};

/** music-box / soft pluck: a sine with two quiet partials and an exponential decay */
export function pluck(
  b: Buf,
  at: number,
  midi: number,
  vel: number,
  o: { pan?: number; decay?: number; bright?: number } = {},
) {
  const f = hz(midi),
    decay = o.decay ?? 1.4,
    bright = o.bright ?? 0.35,
    i0 = Math.round(at * SR),
    len = Math.floor(decay * 5 * SR);
  for (let k = 0; k < len; k++) {
    const t = k / SR,
      env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    const v =
      Math.sin(2 * Math.PI * f * t) +
      bright * 0.5 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t / (decay * 0.3)) +
      bright * 0.2 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t / (decay * 0.15));
    add(b, i0 + k, v * env * vel, o.pan ?? 0.5);
  }
}

/** a pad chord: detuned sine + triangle per note, slow attack and release, gently low-passed */
export function pad(
  b: Buf,
  at: number,
  dur: number,
  notes: number[],
  vel: number,
  o: { attack?: number; release?: number; pan?: number; swell?: { period: number; depth: number } } = {},
) {
  const attack = o.attack ?? 1.2,
    release = o.release ?? 1.6,
    i0 = Math.round(at * SR),
    len = Math.floor((dur + release) * SR);
  notes.forEach((midi, n) => {
    const f = hz(midi);
    let lp = 0;
    const pan = (o.pan ?? 0.5) + (n - (notes.length - 1) / 2) * 0.12;
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      let env = Math.min(1, t / attack) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / release));
      // a slow breath in the level, locked to absolute time so neighbouring chords swell together
      if (o.swell) env *= 1 - o.swell.depth * (0.5 + 0.5 * Math.cos((2 * Math.PI * (at + t)) / o.swell.period));
      const tri = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * 1.003 * t)),
        x = 0.7 * Math.sin(2 * Math.PI * f * 0.997 * t) + 0.3 * tri;
      lp += (x - lp) * 0.08;
      add(b, i0 + k, (lp * env * vel) / notes.length, pan);
    }
  });
}

/** a soft bell for moments: inharmonic partials, long ring */
export function bell(b: Buf, at: number, midi: number, vel: number, pan = 0.5) {
  const f = hz(midi),
    i0 = Math.round(at * SR),
    len = Math.floor(3.5 * SR);
  for (let k = 0; k < len; k++) {
    const t = k / SR,
      env = Math.min(1, t / 0.003) * Math.exp(-t / 0.9);
    add(
      b,
      i0 + k,
      (Math.sin(2 * Math.PI * f * t) +
        0.35 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t / 0.4) +
        0.2 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t / 0.2)) *
        env *
        vel,
      pan,
    );
  }
}

/** a seeded random source (mulberry32): the only randomness the synth allows */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** felt piano: slightly stretched partials, the high ones dying first, a soft hammer, darker when played softly */
export function piano(b: Buf, at: number, midi: number, vel: number, o: { pan?: number; decay?: number } = {}) {
  const f = hz(midi),
    decay = (o.decay ?? 2.6) * (midi < 60 ? 1.4 : 1),
    i0 = Math.round(at * SR),
    len = Math.floor(decay * 4 * SR),
    parts = [1, 0.42, 0.2, 0.1, 0.05, 0.025].map((a, p) => ({
      a: a * (p ? 0.5 + vel : 1),
      f: f * (p + 1) * Math.sqrt(1 + 0.0004 * (p + 1) ** 2),
      d: decay / (1 + p * 0.9),
    }));
  // each partial is a rotating phasor with a multiplying decay: no sin or exp per sample, so long notes stay cheap
  const sum = new Float64Array(len);
  for (const p of parts) {
    const w = (2 * Math.PI * p.f) / SR,
      c = Math.cos(w),
      s = Math.sin(w),
      fall = Math.exp(-1 / (p.d * SR));
    let re = 1,
      im = 0,
      e = p.a;
    for (let k = 0; k < len; k++) {
      sum[k] += im * e;
      const r = re * c - im * s;
      im = re * s + im * c;
      re = r;
      e *= fall;
    }
  }
  for (let k = 0; k < len; k++) add(b, i0 + k, sum[k]! * Math.min(1, k / SR / 0.006) * vel * 0.55, o.pan ?? 0.5);
}

/** marimba / kalimba: a round fundamental, a bright fourth partial that is gone in a blink, a short ring */
export function mallet(b: Buf, at: number, midi: number, vel: number, o: { pan?: number; decay?: number } = {}) {
  const f = hz(midi),
    decay = o.decay ?? 0.55,
    i0 = Math.round(at * SR),
    len = Math.floor(decay * 5 * SR);
  for (let k = 0; k < len; k++) {
    const t = k / SR,
      env = Math.min(1, t / 0.002);
    const v =
      Math.sin(2 * Math.PI * f * t) * Math.exp(-t / decay) +
      0.5 * Math.sin(2 * Math.PI * f * 3.93 * t) * Math.exp(-t / 0.04) +
      0.12 * Math.sin(2 * Math.PI * f * 9.2 * t) * Math.exp(-t / 0.012);
    add(b, i0 + k, v * env * vel, o.pan ?? 0.5);
  }
}

/** electric piano: two-operator FM (1:1) whose brightness falls as the note rings, plus a faint tine, with tremolo */
export function epiano(
  b: Buf,
  at: number,
  midi: number,
  vel: number,
  o: { pan?: number; decay?: number; trem?: number } = {},
) {
  const f = hz(midi),
    decay = o.decay ?? 1.8,
    i0 = Math.round(at * SR),
    len = Math.floor(decay * 4 * SR),
    trem = o.trem ?? 0.15;
  for (let k = 0; k < len; k++) {
    const t = k / SR,
      env = Math.min(1, t / 0.004) * Math.exp(-t / decay),
      index = (0.4 + 1.6 * vel) * Math.exp(-t / 0.35),
      m = Math.sin(2 * Math.PI * f * t),
      v = Math.sin(2 * Math.PI * f * t + index * m) + 0.08 * Math.sin(2 * Math.PI * f * 14 * t) * Math.exp(-t / 0.03);
    // the tremolo pans a little too, the way a suitcase piano's does
    const w = 1 - trem * (0.5 + 0.5 * Math.sin(2 * Math.PI * 4.2 * (at + t)));
    add(b, i0 + k, v * env * vel * w, (o.pan ?? 0.5) + trem * 0.4 * Math.sin(2 * Math.PI * 4.2 * (at + t)));
  }
}

/** a round bass note: sine with a little second harmonic, soft edges */
export function bass(b: Buf, at: number, midi: number, dur: number, vel: number) {
  const f = hz(midi),
    i0 = Math.round(at * SR),
    len = Math.floor(dur * SR);
  for (let k = 0; k < len; k++) {
    const t = k / SR,
      env = Math.min(1, t / 0.012, (len - k) / (0.08 * SR)) * Math.exp(-t / (dur * 1.6));
    add(b, i0 + k, (Math.sin(2 * Math.PI * f * t) + 0.18 * Math.sin(4 * Math.PI * f * t)) * env * vel, 0.5);
  }
}

/** filtered seeded noise under any envelope: shakers, brushes, surf, wind. `tone` 0..1 moves it from dark to bright */
export function noise(
  b: Buf,
  at: number,
  dur: number,
  vel: number,
  o: { seed: number; tone?: number; env?: (t: number) => number; pan?: number | ((t: number) => number) },
) {
  const r = rng(o.seed),
    i0 = Math.round(at * SR),
    len = Math.floor(dur * SR),
    tone = o.tone ?? 0.5,
    lpk = 0.02 + 0.9 * tone * tone, // one-pole low-pass: dark to bright
    hpk = 0.002 + 0.2 * tone; // and a high-pass that thins it as it brightens
  let lp = 0,
    hp = 0;
  for (let k = 0; k < len; k++) {
    const u = k / len;
    lp += (r() * 2 - 1 - lp) * lpk;
    hp += (lp - hp) * hpk;
    const pan = typeof o.pan === "function" ? o.pan(u) : (o.pan ?? 0.5);
    add(b, i0 + k, (lp - hp) * (o.env ? o.env(u) : 1) * vel, pan);
  }
}

/** a soft kick: a sine that falls from a thump to a hum */
export function kick(b: Buf, at: number, vel: number) {
  const i0 = Math.round(at * SR),
    len = Math.floor(0.35 * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    ph += (48 + 70 * Math.exp(-t / 0.025)) / SR;
    add(b, i0 + k, Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.12) * Math.min(1, t / 0.002) * vel, 0.5);
  }
}

/** a bird: one quick sine glide with a little warble */
export function chirp(b: Buf, at: number, f0: number, f1: number, dur: number, vel: number, pan = 0.5) {
  const i0 = Math.round(at * SR),
    len = Math.floor(dur * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const u = k / len;
    ph += (f0 + (f1 - f0) * u * u + 90 * Math.sin(2 * Math.PI * 38 * u)) / SR;
    add(b, i0 + k, Math.sin(2 * Math.PI * ph) * Math.sin(Math.PI * u) ** 2 * vel, pan);
  }
}

/** vinyl dust: sparse seeded clicks, each a tiny decaying burst, across the whole buffer */
export function crackle(b: Buf, perSecond: number, vel: number, seed: number) {
  const r = rng(seed),
    n = Math.floor((b.L.length / SR) * perSecond);
  for (let c = 0; c < n; c++) {
    const i0 = Math.floor(r() * b.L.length),
      v = vel * (0.3 + 0.7 * r() ** 3) * (r() < 0.5 ? -1 : 1),
      pan = 0.2 + 0.6 * r();
    for (let k = 0; k < 24; k++) add(b, i0 + k, v * Math.exp(-k / 4) * (k % 2 ? -0.6 : 1), pan);
  }
}

/** integrated loudness in LUFS (ITU-R BS.1770: K-weighting, 400 ms blocks, absolute and relative gates) */
export function lufs(b: Buf): number {
  const kw = (x: Float32Array) => {
    const out = new Float64Array(x.length);
    const stages = [
      [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
      [1, -2, 1, -1.99004745483398, 0.99007225036621],
    ];
    let src: ArrayLike<number> = x;
    for (const [b0, b1, b2, a1, a2] of stages) {
      let x1 = 0,
        x2 = 0,
        y1 = 0,
        y2 = 0;
      for (let k = 0; k < x.length; k++) {
        const x0 = src[k]!,
          y = b0! * x0 + b1! * x1 + b2! * x2 - a1! * y1 - a2! * y2;
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y;
        out[k] = y;
      }
      src = out.slice();
    }
    return src as Float64Array;
  };
  const L = kw(b.L),
    R = kw(b.R),
    block = Math.round(0.4 * SR),
    step = Math.round(0.1 * SR),
    powers: number[] = [];
  for (let s = 0; s + block <= L.length; s += step) {
    let sum = 0;
    for (let k = s; k < s + block; k++) sum += L[k]! * L[k]! + R[k]! * R[k]!;
    powers.push(sum / block);
  }
  const loud = (p: number) => -0.691 + 10 * Math.log10(p),
    mean = (ps: number[]) => ps.reduce((a, p) => a + p, 0) / ps.length,
    abs = powers.filter((p) => loud(p) > -70),
    rel = loud(mean(abs)) - 10;
  return loud(mean(abs.filter((p) => loud(p) > rel)));
}

/** set integrated loudness to `target` LUFS; anything that would pass `ceilingDb` is rounded off by a soft clip */
export function master(b: Buf, target: number, ceilingDb = -3) {
  const g = 10 ** ((target - lufs(b)) / 20),
    c = 10 ** (ceilingDb / 20);
  for (const x of [b.L, b.R])
    for (let k = 0; k < x.length; k++) {
      const v = x[k]! * g;
      x[k] =
        Math.abs(v) < c * 0.7 ? v : Math.sign(v) * (c * 0.7 + c * 0.3 * Math.tanh((Math.abs(v) - c * 0.7) / (c * 0.3)));
    }
}

/** Schroeder reverb (4 combs + 2 allpasses per side), mixed in place */
export function reverb(b: Buf, mix = 0.28, size = 1) {
  const run = (x: Float32Array, offset: number) => {
    const out = new Float32Array(x.length),
      combs = [1557, 1617, 1491, 1422].map((d) => Math.floor(((d + offset) * size * SR) / 44100));
    for (const d of combs) {
      const buf = new Float32Array(d);
      let i = 0,
        lp = 0;
      for (let k = 0; k < x.length; k++) {
        const y = buf[i]!;
        lp = y * 0.8 + lp * 0.2;
        buf[i] = x[k]! + lp * 0.84;
        out[k] += y / combs.length;
        i = (i + 1) % d;
      }
    }
    for (const d0 of [556, 441]) {
      const d = Math.floor(((d0 + offset) * SR) / 44100),
        buf = new Float32Array(d);
      let i = 0;
      for (let k = 0; k < out.length; k++) {
        const y = buf[i]!,
          v = out[k]! + y * 0.5;
        buf[i] = v;
        out[k] = y - v * 0.5;
        i = (i + 1) % d;
      }
    }
    for (let k = 0; k < x.length; k++) x[k] = x[k]! * (1 - mix) + out[k]! * mix;
  };
  run(b.L, 0);
  run(b.R, 23);
}

/** fold everything past `loopEnd` seconds back onto the start, so the file loops without a seam */
export function foldLoop(b: Buf, loopEnd: number): Buf {
  const n = Math.round(loopEnd * SR),
    out = { L: b.L.slice(0, n), R: b.R.slice(0, n) };
  for (let k = n; k < b.L.length; k++) {
    out.L[(k - n) % n] += b.L[k]!;
    out.R[(k - n) % n] += b.R[k]!;
  }
  return out;
}

/** scale so the loudest sample sits at `peakDb` dBFS */
export function normalize(b: Buf, peakDb: number) {
  let peak = 0;
  for (let k = 0; k < b.L.length; k++) peak = Math.max(peak, Math.abs(b.L[k]!), Math.abs(b.R[k]!));
  const g = peak ? 10 ** (peakDb / 20) / peak : 1;
  for (let k = 0; k < b.L.length; k++) {
    b.L[k] *= g;
    b.R[k] *= g;
  }
}

/** 16-bit PCM WAV */
export function wav(b: Buf): Buffer {
  const n = b.L.length,
    out = Buffer.alloc(44 + n * 4);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + n * 4, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 4, 28);
  out.writeUInt16LE(4, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(n * 4, 40);
  for (let k = 0; k < n; k++) {
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b.L[k]! * 32767))), 44 + k * 4);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b.R[k]! * 32767))), 46 + k * 4);
  }
  return out;
}
