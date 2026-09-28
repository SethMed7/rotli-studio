// The studio's sound (sound/catalog.json): a playlist of music (one track per Rotli theme family, Linen first)
// plays quietly and small effects mark pages, pieces and toggles, all off until the visitor turns them on in the
// top bar (remembered on this device, like the chosen track). Each track loops twice, then the next one fades in.
// The music makes way for any other media: whenever a video or an audio preview plays with sound it fades out,
// and it fades back in when that stops; previews pause each other. Nothing plays before a user gesture (browsers
// require one), and nothing loads until sound is first wanted; then only the playing track and the next one load.
type Sound = { id: string; kind: "music" | "effect"; file: string; title: string };
const KEY = "rotli-studio-sound",
  TRACK_KEY = "rotli-studio-track",
  MUSIC_GAIN = 0.35,
  EFFECT_GAIN = 0.6,
  PLAYS_PER_TRACK = 2,
  CROSSFADE = 3;

// storage can be unavailable (privacy modes, blocked cookies): sound is optional, so it must never throw
const remembered = (): boolean => {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
};
const store = (key: string, v: string) => {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* fine: not remembered */
  }
};
const remember = (v: boolean) => store(KEY, v ? "on" : "off");
const rememberedTrack = (): string | null => {
  try {
    return localStorage.getItem(TRACK_KEY);
  } catch {
    return null;
  }
};

/** `wanted` is the visitor's choice; `playing` is whether the music is actually running (it needs a gesture) */
let wanted = remembered(),
  playing = false,
  ducked = false,
  track = rememberedTrack() ?? "linen";
let ctx: AudioContext | null = null,
  music: GainNode | null = null,
  effects: GainNode | null = null,
  loading: Promise<void> | null = null,
  toggle: HTMLButtonElement | null = null,
  tracks: Sound[] = [];
const buffers = new Map<string, AudioBuffer>(),
  decoding = new Map<string, Promise<AudioBuffer>>();
const fetchSound = (s: Sound) => {
  let p = decoding.get(s.id);
  if (!p) {
    p = fetch(`/${s.file}`)
      .then((r) => r.arrayBuffer())
      .then((a) => ctx!.decodeAudioData(a))
      .then((buf) => (buffers.set(s.id, buf), buf));
    decoding.set(s.id, p);
  }
  return p;
};

/** one load, shared by every caller: the catalog, every effect (they are small) and the track that will play */
function load(): Promise<void> {
  loading ??= (async () => {
    ctx = new AudioContext();
    music = ctx.createGain();
    effects = ctx.createGain();
    music.gain.value = 0;
    effects.gain.value = EFFECT_GAIN;
    music.connect(ctx.destination);
    effects.connect(ctx.destination);
    const catalog = (await (await fetch("/sound/catalog.json")).json()) as { sounds: Sound[] };
    tracks = catalog.sounds.filter((s) => s.kind === "music");
    if (!tracks.some((s) => s.id === track)) track = tracks[0]?.id ?? "linen";
    await Promise.all([
      ...catalog.sounds.filter((s) => s.kind === "effect").map(fetchSound),
      ...tracks.filter((s) => s.id === track).map(fetchSound),
    ]);
  })();
  return loading;
}
function fade(to: number, seconds = 0.8) {
  if (!ctx || !music) return;
  const t = ctx.currentTime;
  music.gain.cancelScheduledValues(t);
  music.gain.setValueAtTime(music.gain.value, t);
  music.gain.linearRampToValueAtTime(to, t + seconds);
}

// ---- the playlist: one looping voice at a time, crossfaded into the next
let voice: { src: AudioBufferSourceNode; gain: GainNode } | null = null,
  advance: ReturnType<typeof setTimeout> | undefined;
const after = (id: string) => tracks[(tracks.findIndex((s) => s.id === id) + 1) % tracks.length]!;
const announce = () => {
  const t = tracks.find((s) => s.id === track);
  if (toggle)
    toggle.title = wanted
      ? `Turn studio sound off (playing ${t?.title ?? track})`
      : "Turn studio sound on (calm music and soft effects)";
  dispatchEvent(new CustomEvent("studio-track", { detail: nowPlaying() }));
};
async function playTrack(id: string, fadeIn = 1.2) {
  const s = tracks.find((x) => x.id === id);
  if (!s || !ctx || !music) return;
  track = id;
  store(TRACK_KEY, id);
  const buf = await fetchSound(s);
  if (track !== id || !playing) return; // another choice, or sound off, while it loaded
  const t = ctx.currentTime,
    gain = ctx.createGain(),
    src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(gain);
  gain.connect(music);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(1, t + fadeIn);
  src.start();
  if (voice) {
    const old = voice;
    old.gain.gain.cancelScheduledValues(t);
    old.gain.gain.setValueAtTime(old.gain.gain.value, t);
    old.gain.gain.linearRampToValueAtTime(0, t + fadeIn);
    old.src.stop(t + fadeIn + 0.05);
  }
  voice = { src, gain };
  clearTimeout(advance);
  // a throttled background tab may fire this late; the track just loops longer, never with a gap
  advance = setTimeout(
    () => playing && void playTrack(after(id).id, CROSSFADE),
    (buf.duration * PLAYS_PER_TRACK - CROSSFADE) * 1000,
  );
  void fetchSound(after(id)); // the next track is ready before it is needed
  announce();
}

/** the track that plays (or would play) and whether it is audible */
export const nowPlaying = () => ({ track, playing });

/** play a track now (from the Sound page): turns sound on if it was off, since the click is the visitor's choice */
export function chooseTrack(id: string) {
  track = id;
  store(TRACK_KEY, id);
  if (!wanted) {
    wanted = true;
    remember(true);
    if (toggle) void apply(toggle);
    return;
  }
  if (playing) void playTrack(id);
  else announce();
}
/** play one effect by id (quietly; only while sound is wanted and running) */
export function cue(id: "page" | "open" | "sound-on" | "sound-off" | "done") {
  if (!(playing || id === "sound-off") || !ctx || !effects) return;
  const buf = buffers.get(id);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(effects);
  src.start();
}

// other media take the stage: any <video> or <audio> element playing with sound ducks the music
const mediaHasSound = () =>
  [...document.querySelectorAll<HTMLMediaElement>("video, audio")].some(
    (v) => !v.paused && !v.ended && !v.muted && v.volume > 0,
  );
function syncDuck() {
  const d = mediaHasSound();
  if (d === ducked) return;
  ducked = d;
  if (playing) fade(d ? 0 : MUSIC_GAIN, d ? 0.4 : 1.6);
}
for (const ev of ["play", "pause", "ended", "volumechange", "emptied"]) document.addEventListener(ev, syncDuck, true);
// previews on the Sound page pause each other
document.addEventListener(
  "play",
  (e) => {
    const el = e.target;
    if (el instanceof HTMLAudioElement) document.querySelectorAll("audio").forEach((a) => a !== el && a.pause());
  },
  true,
);

function render(button: HTMLButtonElement) {
  button.setAttribute("aria-pressed", String(wanted));
  button.querySelector(".label")!.textContent = wanted ? "Sound on" : "Sound";
  announce();
}
/** make reality match `wanted` (called after every choice and at the first gesture) */
async function apply(button: HTMLButtonElement) {
  render(button);
  if (!wanted) {
    if (playing) {
      cue("sound-off");
      playing = false;
      fade(0, 0.6);
      // stop the voice once it is silent, so turning sound back on starts the chosen track afresh
      voice?.src.stop(ctx!.currentTime + 0.7);
      voice = null;
      clearTimeout(advance);
      announce();
    }
    return;
  }
  await load();
  if (!wanted) return; // the visitor changed their mind while it loaded
  if (ctx!.state === "suspended") await ctx!.resume();
  if (ctx!.state !== "running" || playing) return; // no gesture yet: the next one will start it
  playing = true;
  if (!voice) void playTrack(track);
  ducked = mediaHasSound();
  fade(ducked ? 0 : MUSIC_GAIN, 1.6);
  cue("sound-on");
  announce();
}

/** wire the top-bar toggle. Clicking it always flips the choice; a remembered "on" starts at the first gesture. */
export function mountSound(button: HTMLButtonElement) {
  toggle = button;
  render(button);
  button.addEventListener("click", () => {
    wanted = !wanted;
    remember(wanted);
    void apply(button);
  });
  if (wanted) {
    const first = (e: Event) => {
      if (button.contains(e.target as Node)) return;
      removeEventListener("pointerdown", first);
      removeEventListener("keydown", first);
      void apply(button);
    };
    addEventListener("pointerdown", first);
    addEventListener("keydown", first);
  }
}

// read-only state for tests and curious visitors: window.studioSound()
(window as unknown as { studioSound: () => object }).studioSound = () => ({
  wanted,
  playing,
  ducked,
  track,
  context: ctx?.state ?? "not loaded",
  musicGain: music ? +music.gain.value.toFixed(3) : 0,
});
