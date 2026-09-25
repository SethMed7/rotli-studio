// The slide page. Two ways in: the editor's preview iframes post it a slide
// (live, unsaved), and the exporter opens /render?post=<slug>&slide=<n>
// [&format=<id>] and screenshots #slide once it reports ready.
import type { FormatId, Post, Slide } from "./model";
import { renderSlide } from "./templates";

declare global {
  interface Window {
    __slideReady?: boolean;
  }
}

const root = document.querySelector<HTMLElement>("#slide")!;
const markPromise = fetch("/library/logo/_logo.svg").then((r) => (r.ok ? r.text() : ""));

export interface SlideMessage {
  type: "slide";
  slide: Slide;
  format: FormatId;
  index: number;
  total: number;
  counter: boolean;
}

async function draw(message: Omit<SlideMessage, "type">): Promise<void> {
  window.__slideReady = false;
  const mark = await markPromise;
  root.innerHTML = renderSlide(message.slide, message.format, {
    index: message.index,
    total: message.total,
    counter: message.counter,
    mark,
  });
  // Ready once fonts are in and every image has decoded.
  await document.fonts.ready;
  await Promise.all(
    [...root.querySelectorAll("img")].map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => {}))),
  );
  window.__slideReady = true;
}

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin) return;
  const data = event.data as SlideMessage;
  if (data?.type === "slide") void draw(data);
});

const params = new URLSearchParams(location.search);
const slug = params.get("post");
if (slug) {
  const post = (await (await fetch(`/api/posts/${encodeURIComponent(slug)}`)).json()) as Post;
  const index = Number(params.get("slide") ?? 0);
  const slide = post.slides[index];
  if (slide) {
    await draw({
      slide,
      format: (params.get("format") as FormatId | null) ?? post.format,
      index,
      total: post.slides.length,
      counter: post.counter,
    });
  }
} else {
  window.parent.postMessage({ type: "render-ready" }, location.origin);
}
