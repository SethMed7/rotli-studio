// The studio's sound (sound/catalog.json): "Linen" loops quietly and small effects mark pages, pieces
// and toggles, all off until the visitor turns them on in the top bar (remembered on this device). The
// music makes way for any other media: whenever a video or an audio preview plays with sound it fades out,
// and it fades back in when that stops; previews pause each other. Nothing plays before a user gesture
// (browsers require one), and nothing loads until sound is first wanted.
type Sound = { id: string; kind: "music" | "effect"; file: string };
const KEY = "rotli-studio-sound", MUSIC_GAIN = 0.35, EFFECT_GAIN = 0.6;

// storage can be unavailable (privacy modes, blocked cookies): sound is optional, so it must never throw
const remembered = (): boolean => { try { return localStorage.getItem(KEY) === "on"; } catch { return false; } };
const remember = (v: boolean) => { try { localStorage.setItem(KEY, v ? "on" : "off"); } catch { /* fine: not remembered */ } };

/** `wanted` is the visitor's choice; `playing` is whether the music is actually running (it needs a gesture) */
let wanted = remembered(), playing = false, ducked = false;
let ctx: AudioContext | null = null, music: GainNode | null = null, effects: GainNode | null = null, loading: Promise<void> | null = null;
const buffers = new Map<string, AudioBuffer>();

/** one load, shared by every caller */
function load(): Promise<void> {
  loading ??= (async () => {
    ctx = new AudioContext(); music = ctx.createGain(); effects = ctx.createGain(); music.gain.value = 0; effects.gain.value = EFFECT_GAIN;
    music.connect(ctx.destination); effects.connect(ctx.destination);
    const catalog = (await (await fetch("/sound/catalog.json")).json()) as { sounds: Sound[] };
    await Promise.all(catalog.sounds.map(async (s) => buffers.set(s.id, await ctx!.decodeAudioData(await (await fetch(`/${s.file}`)).arrayBuffer()))));
  })();
  return loading;
}
function fade(to: number, seconds = 0.8) { if (!ctx || !music) return; const t = ctx.currentTime; music.gain.cancelScheduledValues(t); music.gain.setValueAtTime(music.gain.value, t); music.gain.linearRampToValueAtTime(to, t + seconds); }
let source: AudioBufferSourceNode | null = null;
function startMusic() {
  if (source || !ctx || !music) return; const buf = buffers.get("linen"); if (!buf) return;
  source = ctx.createBufferSource(); source.buffer = buf; source.loop = true; source.connect(music); source.start();
}
/** play one effect by id (quietly; only while sound is wanted and running) */
export function cue(id: "page" | "open" | "sound-on" | "sound-off" | "done") {
  if (!(playing || id === "sound-off") || !ctx || !effects) return; const buf = buffers.get(id); if (!buf) return;
  const src = ctx.createBufferSource(); src.buffer = buf; src.connect(effects); src.start();
}

// other media take the stage: any <video> or <audio> element playing with sound ducks the music
const mediaHasSound = () => [...document.querySelectorAll<HTMLMediaElement>("video, audio")].some((v) => !v.paused && !v.ended && !v.muted && v.volume > 0);
function syncDuck() { const d = mediaHasSound(); if (d === ducked) return; ducked = d; if (playing) fade(d ? 0 : MUSIC_GAIN, d ? 0.4 : 1.6); }
for (const ev of ["play", "pause", "ended", "volumechange", "emptied"]) document.addEventListener(ev, syncDuck, true);
// previews on the Sound page pause each other
document.addEventListener("play", (e) => { const el = e.target; if (el instanceof HTMLAudioElement) document.querySelectorAll("audio").forEach((a) => a !== el && a.pause()); }, true);

function render(button: HTMLButtonElement) {
  button.setAttribute("aria-pressed", String(wanted)); button.title = wanted ? "Turn studio sound off" : "Turn studio sound on (calm music and soft effects)";
  button.querySelector(".label")!.textContent = wanted ? "Sound on" : "Sound";
}
/** make reality match `wanted` (called after every choice and at the first gesture) */
async function apply(button: HTMLButtonElement) {
  render(button);
  if (!wanted) { if (playing) { cue("sound-off"); playing = false; fade(0, 0.6); } return; }
  await load(); if (!wanted) return;                    // the visitor changed their mind while it loaded
  if (ctx!.state === "suspended") await ctx!.resume();
  if (ctx!.state !== "running" || playing) return;       // no gesture yet: the next one will start it
  startMusic(); playing = true; ducked = mediaHasSound(); fade(ducked ? 0 : MUSIC_GAIN, 1.6); cue("sound-on");
}

/** wire the top-bar toggle. Clicking it always flips the choice; a remembered "on" starts at the first gesture. */
export function mountSound(button: HTMLButtonElement) {
  render(button);
  button.addEventListener("click", () => { wanted = !wanted; remember(wanted); void apply(button); });
  if (wanted) {
    const first = (e: Event) => { if (button.contains(e.target as Node)) return; removeEventListener("pointerdown", first); removeEventListener("keydown", first); void apply(button); };
    addEventListener("pointerdown", first); addEventListener("keydown", first);
  }
}

// read-only state for tests and curious visitors: window.studioSound()
(window as unknown as { studioSound: () => object }).studioSound = () => ({ wanted, playing, ducked, context: ctx?.state ?? "not loaded", musicGain: music ? +music.gain.value.toFixed(3) : 0 });
