// A tiny deterministic synth for the studio's sound: no samples, no randomness except a seeded rng, the
// same numbers every render. Voices write into a stereo buffer; a small Schroeder reverb gives the room.
export const SR = 48000;
export type Buf = { L: Float32Array; R: Float32Array };
export const buffer = (seconds: number): Buf => ({ L: new Float32Array(Math.ceil(seconds * SR)), R: new Float32Array(Math.ceil(seconds * SR)) });
export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const add = (b: Buf, i: number, v: number, pan: number) => { if (i >= 0 && i < b.L.length) { b.L[i] += v * Math.cos(pan * Math.PI / 2); b.R[i] += v * Math.sin(pan * Math.PI / 2); } };

/** music-box / soft pluck: a sine with two quiet partials and an exponential decay */
export function pluck(b: Buf, at: number, midi: number, vel: number, o: { pan?: number; decay?: number; bright?: number } = {}) {
  const f = hz(midi), decay = o.decay ?? 1.4, bright = o.bright ?? 0.35, i0 = Math.round(at * SR), len = Math.floor(decay * 5 * SR);
  for (let k = 0; k < len; k++) { const t = k / SR, env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    const v = Math.sin(2 * Math.PI * f * t) + bright * 0.5 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t / (decay * 0.3)) + bright * 0.2 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t / (decay * 0.15));
    add(b, i0 + k, v * env * vel, o.pan ?? 0.5); }
}

/** a pad chord: detuned sine + triangle per note, slow attack and release, gently low-passed */
export function pad(b: Buf, at: number, dur: number, notes: number[], vel: number, o: { attack?: number; release?: number; pan?: number } = {}) {
  const attack = o.attack ?? 1.2, release = o.release ?? 1.6, i0 = Math.round(at * SR), len = Math.floor((dur + release) * SR);
  notes.forEach((midi, n) => { const f = hz(midi); let lp = 0; const pan = (o.pan ?? 0.5) + (n - (notes.length - 1) / 2) * 0.12;
    for (let k = 0; k < len; k++) { const t = k / SR, env = Math.min(1, t / attack) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / release));
      const tri = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * 1.003 * t)), x = 0.7 * Math.sin(2 * Math.PI * f * 0.997 * t) + 0.3 * tri;
      lp += (x - lp) * 0.08; add(b, i0 + k, lp * env * vel / notes.length, pan); } });
}

/** a soft bell for moments: inharmonic partials, long ring */
export function bell(b: Buf, at: number, midi: number, vel: number, pan = 0.5) {
  const f = hz(midi), i0 = Math.round(at * SR), len = Math.floor(3.5 * SR);
  for (let k = 0; k < len; k++) { const t = k / SR, env = Math.min(1, t / 0.003) * Math.exp(-t / 0.9);
    add(b, i0 + k, (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t / 0.4) + 0.2 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t / 0.2)) * env * vel, pan); }
}

/** Schroeder reverb (4 combs + 2 allpasses per side), mixed in place */
export function reverb(b: Buf, mix = 0.28, size = 1) {
  const run = (x: Float32Array, offset: number) => {
    const out = new Float32Array(x.length), combs = [1557, 1617, 1491, 1422].map((d) => Math.floor((d + offset) * size * SR / 44100));
    for (const d of combs) { const buf = new Float32Array(d); let i = 0, lp = 0; for (let k = 0; k < x.length; k++) { const y = buf[i]!; lp = y * 0.8 + lp * 0.2; buf[i] = x[k]! + lp * 0.84; out[k] += y / combs.length; i = (i + 1) % d; } }
    for (const d0 of [556, 441]) { const d = Math.floor((d0 + offset) * SR / 44100), buf = new Float32Array(d); let i = 0; for (let k = 0; k < out.length; k++) { const y = buf[i]!, v = out[k]! + y * 0.5; buf[i] = v; out[k] = y - v * 0.5; i = (i + 1) % d; } }
    for (let k = 0; k < x.length; k++) x[k] = x[k]! * (1 - mix) + out[k]! * mix;
  };
  run(b.L, 0); run(b.R, 23);
}

/** fold everything past `loopEnd` seconds back onto the start, so the file loops without a seam */
export function foldLoop(b: Buf, loopEnd: number): Buf {
  const n = Math.round(loopEnd * SR), out = { L: b.L.slice(0, n), R: b.R.slice(0, n) };
  for (let k = n; k < b.L.length; k++) { out.L[(k - n) % n] += b.L[k]!; out.R[(k - n) % n] += b.R[k]!; }
  return out;
}

/** scale so the loudest sample sits at `peakDb` dBFS */
export function normalize(b: Buf, peakDb: number) {
  let peak = 0; for (let k = 0; k < b.L.length; k++) peak = Math.max(peak, Math.abs(b.L[k]!), Math.abs(b.R[k]!));
  const g = peak ? 10 ** (peakDb / 20) / peak : 1; for (let k = 0; k < b.L.length; k++) { b.L[k] *= g; b.R[k] *= g; }
}

/** 16-bit PCM WAV */
export function wav(b: Buf): Buffer {
  const n = b.L.length, out = Buffer.alloc(44 + n * 4);
  out.write("RIFF", 0); out.writeUInt32LE(36 + n * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(n * 4, 40);
  for (let k = 0; k < n; k++) { out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b.L[k]! * 32767))), 44 + k * 4); out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b.R[k]! * 32767))), 46 + k * 4); }
  return out;
}
