// Parses WhatsApp chat exports (Android and iPhone, any locale date order)
// into a flat list of messages. Runs in the browser and in Node.

const INVISIBLE = /[‎‏‪-‮⁦-⁩﻿]/g;
const ODD_SPACES = /[   ]/g;

// "[31/12/23, 9:15:32 PM] Name: hi"  (iPhone)
// "31/12/2023, 21:15 - Name: hi"     (Android)
// "2023-12-31, 21:15 - Name: hi"     (ISO-ish locales)
const LINE_START =
  /^\[?(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\]?\s*(?:[-–~]\s*)?(.*)$/;

const MEDIA = [
  /^<media omitted>$/i,
  /^(image|video|audio|sticker|gif|document|contact card) omitted$/i,
  /^<attached: .*>$/i,
  /\.(jpg|jpeg|png|webp|opus|mp4|pdf|vcf) \(file attached\)$/i,
];
const DELETED = [/^this message was deleted\.?$/i, /^you deleted this message\.?$/i];
const EDITED = /\s*<this message was edited>$/i;

function clean(line) {
  return line.replace(INVISIBLE, "").replace(ODD_SPACES, " ").replace(/\r$/, "");
}

// Work out whether dates are day-first or month-first by looking for a part > 12.
function detectDateOrder(heads) {
  let dayFirst = 0;
  let monthFirst = 0;
  for (const [a, b] of heads) {
    if (a > 12 && b <= 12) dayFirst++;
    else if (b > 12 && a <= 12) monthFirst++;
  }
  return monthFirst > dayFirst ? "MDY" : "DMY";
}

function toTimestamp(m, order) {
  let [, p1, p2, p3, hh, mm, ss, ampm] = m;
  let year, month, day;
  if (p1.length === 4) {
    year = +p1;
    month = +p2;
    day = +p3;
  } else {
    year = +p3;
    if (p3.length <= 2) year += 2000;
    if (order === "MDY") {
      month = +p1;
      day = +p2;
    } else {
      day = +p1;
      month = +p2;
    }
  }
  let hour = +hh;
  if (ampm) {
    const pm = /p/i.test(ampm);
    if (pm && hour < 12) hour += 12;
    if (!pm && hour === 12) hour = 0;
  }
  const d = new Date(year, month - 1, day, hour, +mm, ss ? +ss : 0);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export function parseWhatsApp(raw) {
  const lines = raw.split("\n").map(clean);
  const matches = lines.map((l) => l.match(LINE_START));
  const heads = [];
  for (const m of matches) {
    if (m && m[1].length !== 4) heads.push([+m[1], +m[2]]);
  }
  const order = detectDateOrder(heads);

  const messages = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const m = matches[i];
    const ts = m ? toTimestamp(m, order) : null;
    if (m && ts !== null) {
      const rest = m[8];
      const sep = rest.indexOf(": ");
      if (sep === -1) {
        // "Messages are end-to-end encrypted", "X added Y", etc.
        current = null;
        continue;
      }
      const author = rest.slice(0, sep).trim();
      let text = rest.slice(sep + 2);
      current = { ts, author, text, media: false, deleted: false };
      messages.push(current);
    } else if (current && lines[i] !== "") {
      current.text += "\n" + lines[i];
    }
  }

  for (const msg of messages) {
    msg.text = msg.text.replace(EDITED, "").trim();
    msg.media = MEDIA.some((re) => re.test(msg.text));
    msg.deleted = DELETED.some((re) => re.test(msg.text));
  }
  return { messages, dateOrder: order };
}

export function participantsOf(messages) {
  const counts = new Map();
  for (const m of messages) counts.set(m.author, (counts.get(m.author) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}
