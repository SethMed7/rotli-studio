// The studio's sound (sound/catalog.json): "Linen" loops quietly and small effects mark pages, pieces
// and toggles, all off until the visitor turns them on in the top bar (remembered on this device). The
// music makes way for the films: whenever a video plays with sound it fades out, and it fades back in when
// the film stops. Nothing plays before a user gesture (browsers require one), and nothing loads until
// sound is first turned on.
type Sound = { id: string; kind: "music" | "effect"; file: string };
const KEY = "rotli-studio-sound", MUSIC_GAIN = 0.35, EFFECT_GAIN = 0.6;

let ctx: AudioContext | null = null, music: GainNode | null = null, effects: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
let on = localStorage.getItem(KEY) === "on", ducked = false, started = false;

const url = (file: string) => `/${file}`; // sound/web/<id>.m4a, served as-is locally and in the snapshot
async function load(): Promise<void> {
  if (ctx) return;
  ctx = new AudioContext(); music = ctx.createGain(); effects = ctx.createGain(); music.gain.value = 0; effects.gain.value = EFFECT_GAIN;
  music.connect(ctx.destination); effects.connect(ctx.destination);
  const catalog = (await (await fetch("/sound/catalog.json")).json()) as { sounds: Sound[] };
  await Promise.all(catalog.sounds.map(async (s) => buffers.set(s.id, await ctx!.decodeAudioData(await (await fetch(url(s.file))).arrayBuffer()))));
}
function fade(to: number, seconds = 0.8) { if (!ctx || !music) return; const t = ctx.currentTime; music.gain.cancelScheduledValues(t); music.gain.setValueAtTime(music.gain.value, t); music.gain.linearRampToValueAtTime(to, t + seconds); }
function startMusic() {
  if (started || !ctx || !music) return; const buf = buffers.get("linen"); if (!buf) return;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(music); src.start(); started = true;
}
/** play one effect by id (quietly; only while sound is on) */
export function cue(id: "page" | "open" | "sound-on" | "sound-off" | "done") {
  if (!(on || id === "sound-off") || !ctx || !effects) return; const buf = buffers.get(id); if (!buf) return;
  const src = ctx.createBufferSource(); src.buffer = buf; src.connect(effects); src.start();
}

// films take the stage: any video playing with sound ducks the music
const filmHasSound = () => [...document.querySelectorAll("video")].some((v) => !v.paused && !v.ended && !v.muted && v.volume > 0);
function syncDuck() { const d = filmHasSound(); if (d === ducked) return; ducked = d; if (on) fade(d ? 0 : MUSIC_GAIN, d ? 0.4 : 1.6); }
for (const ev of ["play", "pause", "ended", "volumechange", "emptied"]) document.addEventListener(ev, syncDuck, true);

function render(button: HTMLButtonElement) {
  button.setAttribute("aria-pressed", String(on)); button.title = on ? "Turn studio sound off" : "Turn studio sound on (calm music and soft effects)";
  button.querySelector(".label")!.textContent = on ? "Sound on" : "Sound";
}
async function turnOn(button: HTMLButtonElement) {
  await load(); if (ctx!.state === "suspended") await ctx!.resume();
  on = true; localStorage.setItem(KEY, "on"); render(button); startMusic(); ducked = filmHasSound(); fade(ducked ? 0 : MUSIC_GAIN, 1.6); cue("sound-on");
}
function turnOff(button: HTMLButtonElement) { cue("sound-off"); on = false; localStorage.setItem(KEY, "off"); render(button); fade(0, 0.6); }

/** wire the top-bar toggle; a remembered "on" resumes at the first click or key press (browsers need one) */
export function mountSound(button: HTMLButtonElement) {
  render(button);
  let pending = on; // remembered "on" that has not started yet
  button.addEventListener("click", () => { if (pending) { pending = false; void turnOn(button); } else void (on ? turnOff(button) : turnOn(button)); });
  if (on) {
    const resume = (e: Event) => { if (!pending || button.contains(e.target as Node)) return; pending = false; void turnOn(button); removeEventListener("pointerdown", resume); removeEventListener("keydown", resume); };
    addEventListener("pointerdown", resume); addEventListener("keydown", resume);
  }
}

// read-only state for tests and curious visitors: window.studioSound()
(window as unknown as { studioSound: () => object }).studioSound = () => ({ on, ducked, started, context: ctx?.state ?? "not loaded", musicGain: music ? +music.gain.value.toFixed(3) : 0 });
