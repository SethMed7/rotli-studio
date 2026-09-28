# The scored critique

Looking at contact sheets was always part of making a piece here; this makes the looking leave a record. Score a
rendered piece on seven criteria, name its three worst problems with timestamps, fix them, re-render, and repeat until
every score is 8 or more. The rubric is adapted from Raphael Aubry's pipeline
([article](https://x.com/RaphaelAubryy/status/2104502744010629269), its skill at
[howseen-ai/claude-motion-design](https://github.com/howseen-ai/claude-motion-design)); the pacing numbers are this
studio's own (`tools/critique.mjs`).

## 1 · Make the sheets

```sh
node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4
node tools/critique.mjs /tmp/<pieceId>.mp4        # -> /tmp/critique-<pieceId>/
```

Read all four images, not only the first: `sheet.png` (every half second), `phone.png` (twelve frames at 360 px, the
width of a phone feed), `fast-1.png` and `fast-2.png` (twelve consecutive frames around the two fastest moves). Read
`pace.json` for the numbers. Be a harsh motion director, not a proud author.

## 2 · Score each criterion from 1 to 10

| Criterion | 8 or more means | Look at |
|---|---|---|
| **hook** | The first two seconds show what the piece is and make you want the third. | the first row of `sheet.png` |
| **readability** | Every line can be read at phone size in the time it is on screen; nothing important is under about 22 px at 1080. | `phone.png` |
| **motion** | Arrivals have weight (springs, not linear slides); no ghosting, tearing or popping in the fast moves. | `fast-*.png` |
| **variety** | Something new every two to four seconds, and some of it lands with a punch; no calm longer than about five seconds unless it is a deliberate hold. | `sheet.png`, then `pace.json`: `changesPer10s` counts abrupt changes (cuts, flips, slams), so a piece that only glides reads low |
| **composition** | Nothing overlaps by accident, nothing leaves the safe area, one clear focus per frame, the size is designed (not cropped). | `sheet.png` |
| **accuracy** | Every claim is true for what it describes: real facts hedged, invented products invented, example data labelled. | the copy, against the brief |
| **sync** | Cuts and hits land on the beat grid; the sound cues match what they mark; loudness about −16 LUFS. | the brief's cue table, the render's loudness |

## 3 · Write the record

One file per piece and round, `series/studies/critiques/<pieceId>.json`, appended to:

```json
{
  "piece": "<pieceId>",
  "rounds": [
    {
      "round": 1,
      "date": "yyyy-mm-dd",
      "reviewer": "who scored it",
      "pace": { "changesPer10s": 0, "longestCalm": 0, "nearStill": 0 },
      "scores": { "hook": 0, "readability": 0, "motion": 0, "variety": 0, "composition": 0, "accuracy": 0, "sync": 0 },
      "problems": [{ "at": "mm:ss.s", "what": "what is wrong", "fix": "what to do" }],
      "agentSaw": ["problems the building agent had already reported"],
      "agentMissed": ["problems only the critique found"],
      "verdict": "fix"
    }
  ]
}
```

`verdict` is `ship` when every score is 8 or more, otherwise `fix`. Fix the three problems, re-render only what
changed, and add a round. The record is the evidence for a field note: which problems agents leave behind (`agentMissed`), and how
many rounds it takes to clear them. `series/studies/critiques/halftoneHost.json` is the first real one.
