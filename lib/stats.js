// Exact numbers computed from the full chat. These are shown on the report
// as-is and also handed to the AI so it never has to guess at counts.

const EMOJI = /\p{Extended_Pictographic}/gu;
const NEW_CONVO_GAP = 6 * 60 * 60 * 1000; // 6h of silence = a new conversation
const REPLY_WINDOW = 12 * 60 * 60 * 1000; // replies slower than 12h aren't "replies"
const DOUBLE_TEXT_GAP = 60 * 60 * 1000; // texting again after 1h with no answer

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(ts) {
  const d = new Date(ts);
  return `${monthKey(ts)}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeStats(messages) {
  const people = new Map();
  const person = (name) => {
    if (!people.has(name)) {
      people.set(name, {
        name,
        messages: 0,
        words: 0,
        media: 0,
        deleted: 0,
        questions: 0,
        lateNight: 0,
        starts: 0,
        doubleTexts: 0,
        replyTimes: [],
        emojis: new Map(),
      });
    }
    return people.get(name);
  };

  const months = new Map();
  const days = new Map();
  const hours = new Array(24).fill(0);

  let prev = null;
  for (const m of messages) {
    const p = person(m.author);
    p.messages++;
    if (m.media) p.media++;
    else if (m.deleted) p.deleted++;
    else {
      p.words += m.text.split(/\s+/).filter(Boolean).length;
      if (m.text.includes("?")) p.questions++;
      for (const e of m.text.match(EMOJI) || []) p.emojis.set(e, (p.emojis.get(e) || 0) + 1);
    }
    const hour = new Date(m.ts).getHours();
    hours[hour]++;
    if (hour < 5) p.lateNight++;

    const mk = monthKey(m.ts);
    if (!months.has(mk)) months.set(mk, {});
    const month = months.get(mk);
    month[m.author] = (month[m.author] || 0) + 1;
    const dk = dayKey(m.ts);
    days.set(dk, (days.get(dk) || 0) + 1);

    if (!prev || m.ts - prev.ts >= NEW_CONVO_GAP) p.starts++;
    if (prev && prev.author !== m.author && m.ts - prev.ts < REPLY_WINDOW) {
      p.replyTimes.push(m.ts - prev.ts);
    }
    if (prev && prev.author === m.author && m.ts - prev.ts >= DOUBLE_TEXT_GAP) p.doubleTexts++;
    prev = m;
  }

  const total = messages.length;
  const list = [...people.values()]
    .sort((a, b) => b.messages - a.messages)
    .map((p) => ({
      name: p.name,
      messages: p.messages,
      share: total ? p.messages / total : 0,
      words: p.words,
      avgWords: +(p.words / Math.max(1, p.messages - p.media - p.deleted)).toFixed(1),
      media: p.media,
      deleted: p.deleted,
      questions: p.questions,
      lateNight: p.lateNight,
      starts: p.starts,
      doubleTexts: p.doubleTexts,
      medianReplyMinutes: p.replyTimes.length ? Math.round(median(p.replyTimes) / 60000) : null,
      topEmojis: [...p.emojis.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([e, n]) => ({ emoji: e, count: n })),
    }));

  let busiestDay = null;
  for (const [day, count] of days) if (!busiestDay || count > busiestDay.count) busiestDay = { day, count };

  return {
    totalMessages: total,
    firstDate: total ? new Date(messages[0].ts).toISOString() : null,
    lastDate: total ? new Date(messages[total - 1].ts).toISOString() : null,
    activeDays: days.size,
    busiestDay,
    hours,
    months: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, counts]) => ({
      month,
      counts,
      total: Object.values(counts).reduce((s, n) => s + n, 0),
    })),
    people: list,
  };
}

// The compact version sent to the AI (drops per-month detail per person).
export function statsForPrompt(stats) {
  return {
    totalMessages: stats.totalMessages,
    firstDate: stats.firstDate?.slice(0, 10),
    lastDate: stats.lastDate?.slice(0, 10),
    activeDays: stats.activeDays,
    busiestDay: stats.busiestDay,
    messagesPerMonth: stats.months.map((m) => ({ month: m.month, ...m.counts })),
    people: stats.people.slice(0, 12).map(({ topEmojis, ...p }) => ({
      ...p,
      share: Math.round(p.share * 100) + "%",
      topEmojis: topEmojis.map((e) => e.emoji).join(""),
    })),
  };
}
