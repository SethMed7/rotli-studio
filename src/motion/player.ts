// The landing film, played the way rotli.co plays it (site/src/components/FilmPlayer.astro): it starts
// muted once it is on screen, plays once and rests on its last frame; "Click for sound" restarts it from
// the top with sound and hands over native controls; a pause chip is there while it plays muted. It
// pauses when scrolled away and resumes when back if it was playing. Under reduced motion or Save-Data it
// is a poster with native controls and nothing plays until asked. The film only downloads on screen.
import { esc } from "./md";

export const filmPlayer = (src: string, poster: string, label: string) => `<figure class="film-player" data-player>
  <video controls muted playsinline preload="none" poster="${esc(poster)}" width="1920" height="1080" aria-label="${esc(label)}"><source src="${esc(src)}" type="video/mp4"></video>
  <div class="player-bar" hidden>
    <button class="player-chip player-sound" type="button"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg><span>Click for sound</span></button>
    <button class="player-chip player-pause" type="button" aria-label="Pause the film"><svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6.5" y="5.5" width="3.8" height="13" rx="1"/><rect x="13.7" y="5.5" width="3.8" height="13" rx="1"/></svg><svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg></button>
    <button class="player-chip player-replay" type="button" hidden><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg><span>Watch again with sound</span></button>
  </div>
</figure>`;

/** Wire every player under `root`; returns a stop function (the router calls it when the page changes). */
export function mountFilmPlayers(root: HTMLElement): () => void {
  const quiet = matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  const observers: IntersectionObserver[] = [];
  for (const player of root.querySelectorAll<HTMLElement>("[data-player]")) {
    const video = player.querySelector("video")!;
    if (quiet) { video.preload = "metadata"; continue; } // a poster with native controls
    const bar = player.querySelector<HTMLElement>(".player-bar")!, sound = bar.querySelector<HTMLButtonElement>(".player-sound")!;
    const pause = bar.querySelector<HTMLButtonElement>(".player-pause")!, replay = bar.querySelector<HTMLButtonElement>(".player-replay")!;
    video.controls = false; video.muted = true; bar.hidden = false;
    let userPaused = false, visible = false, started = false, pausedByScroll = false, beat: ReturnType<typeof setTimeout> | undefined;
    const sync = () => { player.classList.toggle("is-paused", video.paused); pause.setAttribute("aria-label", video.paused ? "Play the film" : "Pause the film"); };
    video.addEventListener("play", sync); video.addEventListener("pause", sync);
    video.addEventListener("ended", () => { sound.hidden = true; pause.hidden = true; replay.hidden = false; }); // rest on the last frame
    const handOver = () => { bar.hidden = true; video.muted = false; video.controls = true; video.currentTime = 0; void video.play(); };
    sound.addEventListener("click", handOver); replay.addEventListener("click", handOver);
    pause.addEventListener("click", () => { userPaused = !video.paused; if (video.paused) void video.play(); else video.pause(); });
    const autoplay = () => {
      if (!visible || userPaused || video.ended || (started && !pausedByScroll)) return;
      started = true; pausedByScroll = false;
      void video.play().catch(() => { bar.hidden = true; video.controls = true; }); // autoplay refused: poster + controls
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting; clearTimeout(beat);
      if (visible) { if (video.preload !== "auto") video.preload = "auto"; beat = setTimeout(autoplay, started ? 0 : 700); }
      else if (!video.paused) { pausedByScroll = true; video.pause(); }
    }, { threshold: 0.35 });
    io.observe(video); observers.push(io);
  }
  return () => { for (const io of observers) io.disconnect(); for (const v of root.querySelectorAll("video")) v.pause(); };
}
