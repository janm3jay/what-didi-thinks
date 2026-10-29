// Turns messages into a transcript that fits a character budget. Long chats
// keep the start, the most recent stretch and evenly spaced windows from the
// middle, with markers where messages were skipped, so the AI sees how the
// chat changed over time without reading years of "ok" and "haha".

export const DEFAULT_BUDGET = 150_000; // ~40k tokens
const MAX_MESSAGE_CHARS = 800;
const MIDDLE_WINDOWS = 10;

function pad(n) {
  return String(n).padStart(2, "0");
}

function stamp(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatLine(m) {
  let text = m.media ? "<media>" : m.deleted ? "<deleted message>" : m.text;
  if (text.length > MAX_MESSAGE_CHARS) text = text.slice(0, MAX_MESSAGE_CHARS) + "…";
  return `[${stamp(m.ts)}] ${m.author}: ${text.replace(/\n/g, " / ")}`;
}

function gapMarker(messages, from, to) {
  const n = to - from;
  return `… [${n} messages skipped, ${stamp(messages[from].ts).slice(0, 10)} to ${stamp(messages[to - 1].ts).slice(0, 10)}] …`;
}

// Takes lines from `start` moving in `dir` until `budget` chars are used.
function take(lines, start, end, budget, dir = 1) {
  const picked = [];
  let used = 0;
  for (let i = start; dir > 0 ? i < end : i >= end; i += dir) {
    if (used + lines[i].length + 1 > budget) break;
    picked.push(i);
    used += lines[i].length + 1;
  }
  return dir > 0 ? picked : picked.reverse();
}

export function sampleTranscript(messages, budget = DEFAULT_BUDGET) {
  const lines = messages.map(formatLine);
  const totalChars = lines.reduce((s, l) => s + l.length + 1, 0);
  if (totalChars <= budget) {
    return { transcript: lines.join("\n"), included: lines.length, total: lines.length, sampled: false };
  }

  const head = take(lines, 0, lines.length, budget * 0.15);
  const headEnd = head.length ? head[head.length - 1] + 1 : 0;
  const tail = take(lines, lines.length - 1, headEnd, budget * 0.35, -1);
  const tailStart = tail.length ? tail[0] : lines.length;

  const middle = [];
  const span = tailStart - headEnd;
  if (span > 0) {
    const perWindow = (budget * 0.5) / MIDDLE_WINDOWS;
    for (let w = 0; w < MIDDLE_WINDOWS; w++) {
      const start = headEnd + Math.floor((span * w) / MIDDLE_WINDOWS);
      const end = headEnd + Math.floor((span * (w + 1)) / MIDDLE_WINDOWS);
      middle.push(...take(lines, start, end, perWindow));
    }
  }

  const keep = [...head, ...middle, ...tail];
  const out = [];
  let last = -1;
  for (const i of keep) {
    if (i <= last) continue;
    if (i > last + 1) out.push(gapMarker(messages, last + 1, i));
    out.push(lines[i]);
    last = i;
  }
  if (last < lines.length - 1) out.push(gapMarker(messages, last + 1, lines.length));
  return { transcript: out.join("\n"), included: keep.length, total: lines.length, sampled: true };
}
