// EXTRACT RUNS: copy the agent work that made the pieces out of a Claude Code session transcript and into
// the studio, so every prompt, follow-up and report lives next to what it built (not in ~/.claude).
//
//   node tools/extract-runs.mjs <session.jsonl> [more.jsonl …]
//
// Writes workflows/runs/<pieceId>.md (prompt → follow-ups → report, with model, tokens, minutes),
// workflows/runs/reviews.md (the frame-review prompts sent to other models), workflows/runs/requests.md
// (the owner's requests, in order) and workflows/runs/runs.json (the index the studio site reads).
// Re-running is safe: it rewrites these files from the transcripts and touches nothing else. Pass every
// transcript that built the current runs (runs.json lists them as sources); leaving one out is refused.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOM = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  OUT = join(ROOM, "workflows/runs");
const files = process.argv.slice(2).filter((a) => a !== "--replace");
if (!files.length) {
  console.error("usage: node tools/extract-runs.mjs <session.jsonl> [...] [--replace]");
  process.exit(1);
}
// the outputs are rebuilt from exactly the transcripts given, so leaving one out would silently drop its runs
const before = existsSync(join(OUT, "runs.json"))
  ? (JSON.parse(readFileSync(join(OUT, "runs.json"), "utf8")).sources ?? [])
  : [];
const dropped = before.filter((s) => !files.some((f) => basename(f) === s));
if (dropped.length && !process.argv.includes("--replace")) {
  console.error(
    `refused: runs.json was built from ${dropped.join(", ")} too; pass every transcript again (or --replace to drop them knowingly)`,
  );
  process.exit(2);
}
const ids = JSON.parse(readFileSync(join(ROOM, "pieces.json"), "utf8")).pieces.map((p) => p.id);

// "Build episode 02 Folder" -> ep02Folder · "Build S01E03 The Workshop" -> s01e03Workshop
// studies: "Build study: <title>" maps to that study's primary piece (series/studies/briefs/*.json)
const STUDY_BRIEFS = join(ROOM, "series/studies/briefs");
const studies = existsSync(STUDY_BRIEFS)
  ? readdirSync(STUDY_BRIEFS)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(STUDY_BRIEFS, f), "utf8")))
  : [];
const pieceFor = (desc) => {
  const study = desc
    .match(/^Build study: (.+)$/i)?.[1]
    ?.trim()
    .toLowerCase();
  if (study) {
    const b = studies.find((x) => x.title.toLowerCase() === study);
    return b ? b.pieces[b.primary] : null;
  }
  const ep = desc.match(/episode (\d\d)/i),
    s = desc.match(/S(\d\d)E(\d\d)/i);
  const pre = ep ? `ep${ep[1]}` : s ? `s${s[1]}e${s[2]}` : null;
  return pre ? (ids.find((id) => id.startsWith(pre) && !/(Vertical|Carousel|Single)$/.test(id)) ?? null) : null;
};
const textOf = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => x.text ?? "").join("\n") : "");
// public repo rules: no home path, no user name, no machine-specific temp paths in anything written
const HOME = homedir(),
  USER = basename(HOME);
const redact = (s) =>
  String(s)
    .replaceAll(HOME, "~")
    .replace(/\/private\/tmp\/claude-\d+\/[^\s)`'"]*/g, "<session-tmp>")
    .replaceAll(`-Users-${USER}-`, "-Users-example-")
    // screenshots attached to a request stay on the Mac; the record only says one was attached
    .replace(/\[Attached image "[^"]*" is saved at: [^\]]*\]/g, "[a screenshot was attached]")
    // local folders other than the studio and the product are the owner's business, not the public record's
    .replace(/~\/(?!rotli-studio\b|rotli\b)[^\s)`'"\]]+/g, "<a local folder>")
    .replace(new RegExp(`\\b${USER}\\b`, "g"), "example");
const clean = (s) =>
  textOf(s)
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .trim();

const agents = new Map(); // tool_use id -> run
const byAgentId = new Map();
const reviews = [],
  requests = [];
for (const file of files) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const m = o.message ?? {},
      when = (o.timestamp ?? "").slice(0, 16).replace("T", " ");
    if (m.role === "assistant" && Array.isArray(m.content))
      for (const c of m.content) {
        if (c.type !== "tool_use") continue;
        if (c.name === "Agent")
          agents.set(c.id, {
            description: c.input.description,
            piece: pieceFor(c.input.description ?? ""),
            launched: when,
            prompt: c.input.prompt ?? "",
            followUps: [],
            transcript: basename(file),
          });
        if (c.name === "SendMessage") {
          const run = byAgentId.get(c.input.to);
          if (run) run.followUps.push({ when, summary: c.input.summary ?? "", message: c.input.message ?? "" });
        }
        if (c.name === "Bash" && /\bagy\b[^|]*-p\b/.test(c.input.command ?? ""))
          reviews.push({ when, description: c.input.description ?? "", command: c.input.command });
      }
    if (m.role === "user") {
      const tur = o.toolUseResult;
      if (Array.isArray(m.content))
        for (const c of m.content)
          if (c.type === "tool_result" && agents.has(c.tool_use_id) && tur?.agentId) {
            const run = agents.get(c.tool_use_id);
            run.agentId = tur.agentId;
            run.model = tur.resolvedModel ?? null;
            byAgentId.set(tur.agentId, run);
          }
    }
    {
      // notifications arrive as queue operations, queued-command attachments or user turns
      const raw = [
        typeof m.content === "string" ? m.content : textOf(m.content),
        typeof o.content === "string" ? o.content : "",
        textOf(o.attachment?.prompt),
      ].join("\n");
      for (const blk of raw.matchAll(/<task-notification>([\s\S]*?)<\/task-notification>/g)) {
        const b = blk[1],
          id = b.match(/<task-id>(.*?)<\/task-id>/)?.[1],
          run = id && byAgentId.get(id);
        const result = b.match(/<result>([\s\S]*?)<\/result>/)?.[1];
        if (!run || !result) continue;
        const u = b.match(/<usage>([\s\S]*?)<\/usage>/)?.[1] ?? "";
        if ((run.reports ??= []).some((x) => x.result === result.trim())) continue;
        run.reports.push({
          when,
          result: result.trim(),
          tokens: Number(u.match(/subagent_tokens>(\d+)/)?.[1] ?? 0),
          tools: Number(u.match(/tool_uses>(\d+)/)?.[1] ?? 0),
          minutes: Math.round(Number(u.match(/duration_ms>(\d+)/)?.[1] ?? 0) / 6000) / 10,
        });
      }
    }
    // the owner's own words: typed turns (text only, no tool results) and messages queued while a turn ran
    const typed =
      o.type === "user" && !o.isMeta && Array.isArray(m.content) && m.content.every((c) => c.type === "text")
        ? textOf(m.content)
        : typeof m.content === "string" && o.type === "user" && !o.isMeta
          ? m.content
          : "";
    const queued =
      o.type === "attachment" && o.attachment?.type === "queued_command" ? textOf(o.attachment.prompt) : "";
    // a prompt the harness queued (promptSource "system") is kept but labelled: it was not typed by the owner
    const harness = o.type === "user" && o.isMeta && o.promptSource === "system" ? textOf(m.content) : "";
    for (const [t, kind] of [
      [typed, ""],
      [queued, "sent mid-turn"],
      [harness, "queued by the harness, not typed"],
    ]) {
      const text = clean(t);
      if (!text || /^<|^This session is being continued|^\[Request interrupted|^Caveat:/.test(text)) continue;
      if (!requests.some((r) => r.text === text)) requests.push({ when, text, kind });
    }
  }
}

mkdirSync(OUT, { recursive: true });
const runs = [...agents.values()].filter((r) => r.piece);
for (const r of runs) {
  const rep = r.reports ?? [];
  const md = [
    `# ${r.description}`,
    "",
    `- **Piece:** \`${r.piece}\``,
    `- **Launched:** ${r.launched} UTC · **model:** ${r.model ?? "inherited"}`,
    ...(rep.length
      ? [
          `- **Cost:** ${rep.map((x) => `${x.tokens.toLocaleString()} tokens · ${x.tools} tool calls · ${x.minutes} min`).join(" + ")}`,
        ]
      : []),
    `- **Source:** \`${r.transcript}\` (extracted by \`tools/extract-runs.mjs\`)`,
    "",
    "## Prompt",
    "",
    "````markdown",
    r.prompt,
    "````",
    "",
    ...(r.followUps.length
      ? [
          "## Follow-ups (sent while or after it ran)",
          "",
          ...r.followUps.flatMap((f) => [`### ${f.when} · ${f.summary}`, "", "````text", f.message, "````", ""]),
        ]
      : []),
    ...(rep.length
      ? [
          "## Report (the agent's own summary, unedited)",
          "",
          ...rep.flatMap((x, i) => [...(rep.length > 1 ? [`### Report ${i + 1} · ${x.when}`, ""] : []), x.result, ""]),
        ]
      : ["## Report", "", "_No completion report in the transcript._", ""]),
  ].join("\n");
  writeFileSync(join(OUT, `${r.piece}.md`), redact(md));
}
writeFileSync(
  join(OUT, "reviews.md"),
  redact(
    [
      "# Frame reviews by other models",
      "",
      "Commands that sent rendered frames to another model for a second opinion (Antigravity `agy`: frames only, it cannot hear audio).",
      "",
      ...reviews.flatMap((r) => [`## ${r.when} · ${r.description}`, "", "```sh", r.command, "```", ""]),
    ].join("\n"),
  ),
);
writeFileSync(
  join(OUT, "requests.md"),
  redact(
    [
      "# The owner's requests, in order",
      "",
      "What was asked, in the owner's words. Everything in the motion room traces back to one of these.",
      "",
      ...requests.flatMap((r, i) => [
        `## ${i + 1}. ${r.when} UTC${r.kind ? ` · ${r.kind}` : ""}`,
        "",
        r.text
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n"),
        "",
      ]),
    ].join("\n"),
  ),
);
const index = {
  note: "Agent runs recovered from Claude Code transcripts. Regenerate with tools/extract-runs.mjs.",
  sources: files.map((f) => basename(f)),
  runs: runs.map((r) => ({
    piece: r.piece,
    description: r.description,
    launched: r.launched,
    model: r.model ?? null,
    followUps: r.followUps.length,
    tokens: (r.reports ?? []).reduce((a, x) => a + x.tokens, 0),
    minutes: (r.reports ?? []).reduce((a, x) => a + x.minutes, 0),
    file: `workflows/runs/${r.piece}.md`,
  })),
  reviews: reviews.length,
  requests: requests.length,
};
writeFileSync(join(OUT, "runs.json"), redact(JSON.stringify(index, null, 1)) + "\n");
console.log(`runs ${runs.length} · reviews ${reviews.length} · requests ${requests.length} -> ${OUT}`);
for (const r of index.runs)
  console.log(
    `  ${r.piece.padEnd(24)} ${String(r.tokens).padStart(7)} tok  ${r.minutes} min  follow-ups ${r.followUps}`,
  );
