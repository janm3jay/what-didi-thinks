// Free mode: writes Didi's report from the stats with rules and templates, no
// AI needed. Same shape as the AI report, so the page renders it the same way.

const EMOJI = /\p{Extended_Pictographic}/gu;

const VIBE_EMOJI = {
  partner: "💍", crush: "👀", situationship: "🙃", ex: "💔", long_distance: "✈️",
  friend: "🫶", group: "🍻", family: "🏡", work: "💼", other: "🫖",
};

const pct = (x) => Math.round(x * 100);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function fmtMinutes(min) {
  if (min === null || min === undefined) return null;
  if (min < 1) return "under a minute";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"}`;
  const h = Math.round(min / 6) / 10;
  return `${h} hour${h === 1 ? "" : "s"}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function range(months) {
  const a = monthLabel(months[0].month);
  const b = monthLabel(months.at(-1).month);
  return a === b ? a : `${a} – ${b}`;
}

// Picks a line deterministically, so the same chat always gets the same report.
function pick(options, seed) {
  return options[Math.abs(seed) % options.length];
}

function seedOf(stats) {
  return stats.totalMessages + stats.people.reduce((s, p) => s + p.name.length * p.messages, 0);
}

// ---------- effort ----------

function effortScores(people) {
  const sum = (key) => people.reduce((s, p) => s + (p[key] || 0), 0) || 1;
  const speed = people.map((p) => (p.medianReplyMinutes === null ? 0 : 1 / (p.medianReplyMinutes + 2)));
  const speedSum = speed.reduce((s, x) => s + x, 0) || 1;
  const totals = { messages: sum("messages"), starts: sum("starts"), questions: sum("questions") };
  const raw = people.map(
    (p, i) =>
      0.35 * (p.messages / totals.messages) +
      0.35 * ((p.starts || 0) / totals.starts) +
      0.15 * ((p.questions || 0) / totals.questions) +
      0.15 * (speed[i] / speedSum)
  );
  const max = Math.max(...raw, 1e-9);
  return people.map((p, i) => ({ name: p.name, raw: raw[i], score: Math.round((raw[i] / max) * 90) }));
}

// ---------- roles ----------

// Each line takes `you`: true when the person is the user.
const TRAITS = [
  { key: "planner", role: "The Planner", emoji: "📋", value: (p, t) => (p.starts || 0) / t.starts,
    line: (you) => (you ? "You get things going. If this chat goes quiet, it's usually because you stopped." : "Gets things going. If this chat goes quiet, it's usually because they stopped.") },
  { key: "speedy", role: "The Speedy Replier", emoji: "⚡", value: (p) => (p.medianReplyMinutes === null ? -1e9 : -p.medianReplyMinutes), min: -10,
    line: (you) => (you ? "You reply so fast it's like your phone never leaves your hand." : "Replies so fast it's like their phone never leaves their hand.") },
  { key: "owl", role: "The Night Owl", emoji: "🦉", value: (p) => p.lateNight / Math.max(1, p.messages), min: 0.08,
    line: (you) => (you ? "You come alive after midnight. The deep talks happen on your schedule." : "Comes alive after midnight. The deep talks happen on their schedule.") },
  { key: "essay", role: "The Essay Writer", emoji: "✍️", value: (p) => p.avgWords, min: 7,
    line: (you) => (you ? "You write actual paragraphs, with a beginning, a middle and an end." : "Writes actual paragraphs, with a beginning, a middle and an end.") },
  { key: "emoji", role: "The Emoji Machine", emoji: "😂", value: (p) => p.emojiRate, min: 0.25,
    line: (you) => (you ? "You can't send a sentence without an emoji. Or three." : "Can't send a sentence without an emoji. Or three.") },
  { key: "curious", role: "The Curious One", emoji: "🧐", value: (p) => (p.questions || 0) / Math.max(1, p.messages), min: 0.12,
    line: (you) => (you ? "You ask the questions. You genuinely want to know what's going on." : "Asks the questions. Genuinely wants to know what's going on.") },
  { key: "double", role: "The Double Texter", emoji: "📲", value: (p) => p.doubleTexts / Math.max(1, p.messages), min: 0.03,
    line: (you) => (you ? "You're not afraid to text again when nobody answers. Persistence, we call it." : "Not afraid to text again when nobody answers. Persistence, we call it.") },
  { key: "photo", role: "The Photographer", emoji: "📸", value: (p) => p.media / Math.max(1, p.messages), min: 0.08,
    line: (you) => (you ? "You send photos instead of words. A picture is worth 1,000 texts." : "Sends photos instead of words. A picture is worth 1,000 texts.") },
  { key: "slow", role: "The Slow Burner", emoji: "🐢", value: (p) => p.medianReplyMinutes ?? -1, min: 30,
    line: (you) => (you ? "You take your time to reply. The suspense is part of the experience." : "Takes their time to reply. The suspense is part of the experience.") },
];

function assignRoles(people, totals) {
  const roles = new Map();
  if (people.length > 2) {
    const lurker = people.at(-1);
    if (lurker.share < 0.08) roles.set(lurker.name, { role: "The Lurker", emoji: "👀", line: (you) => (you ? "You read everything and say almost nothing. They've noticed." : "Reads everything, says almost nothing. They're watching, though.") });
  }
  for (const trait of TRAITS) {
    const ranked = people
      .filter((p) => !roles.has(p.name))
      .map((p) => ({ p, v: trait.value(p, totals) }))
      .filter(({ v }) => v >= (trait.min ?? -Infinity) && v !== -1 && v !== -1e9)
      .sort((a, b) => b.v - a.v);
    if (ranked.length) roles.set(ranked[0].p.name, trait);
  }
  return (name) => roles.get(name) || { role: "The Steady One", emoji: "🙂", line: (you) => (you ? "You show up and keep things ticking along, with no drama." : "Shows up and keeps things ticking along, with no drama.") };
}

// ---------- flags ----------

function flagsFor(p, people, totals) {
  const green = [];
  const red = [];
  const startShare = (p.starts || 0) / totals.starts;
  const qRate = (p.questions || 0) / Math.max(1, p.messages);
  const reply = fmtMinutes(p.medianReplyMinutes);

  if (p.medianReplyMinutes !== null && p.medianReplyMinutes <= 10) green.push(`Replies fast (usually within ${reply})`);
  if (startShare >= 0.4 && people.length <= 3) green.push("Starts plenty of conversations");
  if (qRate >= 0.12) green.push("Asks questions and shows interest");
  if (p.avgWords >= 7) green.push("Writes proper messages, not just 'ok'");
  if (!green.length) green.push("Keeps showing up in the chat");

  if (p.medianReplyMinutes !== null && p.medianReplyMinutes >= 60) red.push(`Slow replies (usually ${reply})`);
  if (people.length === 2 && startShare <= 0.3) red.push("Rarely starts the conversation");
  if (p.doubleTexts / Math.max(1, p.messages) >= 0.05) red.push("Double-texts a lot after silence");
  if (p.lateNight / Math.max(1, p.messages) >= 0.25) red.push("Most active after midnight");
  if (p.avgWords < 3 && p.messages > 20) red.push("Lots of one-word replies");
  return { green: green.slice(0, 3), red: red.slice(0, 3) };
}

function didiThinks(p, trait, totals, isMe) {
  const you = isMe ? "You" : p.name;
  const startShare = pct((p.starts || 0) / totals.starts);
  const parts = [
    `${you} ${isMe ? "send" : "sends"} ${pct(p.share)}% of the messages and ${isMe ? "start" : "starts"} ${startShare}% of the conversations.`,
    trait.line(isMe),
  ];
  const reply = fmtMinutes(p.medianReplyMinutes);
  if (reply) parts.push(`Typical reply time: ${reply}.`);
  return parts.join(" ");
}

// ---------- chapters ----------

function chapters(months, people, name) {
  if (!months.length) return [];
  const leader = (slice) => {
    const totals = {};
    for (const m of slice) for (const [n, c] of Object.entries(m.counts || {})) totals[n] = (totals[n] || 0) + c;
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const avg = (slice) => Math.round(slice.reduce((s, m) => s + m.total, 0) / slice.length);
  if (months.length <= 2) {
    return [{ period: range(months), title: "The whole story", detail: `About ${avg(months)} messages a month so far, with ${name(leader(months) || people[0]?.name)} doing most of the talking.` }];
  }

  const peakIndex = months.reduce((best, m, i) => (m.total > months[best].total ? i : best), 0);
  const out = [];
  if (peakIndex > 0) {
    const before = months.slice(0, peakIndex);
    out.push({ period: range(before), title: "Getting going", detail: `Around ${avg(before)} messages a month. ${cap(name(leader(before)))} ${leader(before) === name.me ? "were" : "was"} doing most of the talking.` });
  }
  const peak = months[peakIndex];
  out.push({ period: monthLabel(peak.month), title: "Peak season", detail: `The busiest month: ${peak.total.toLocaleString("en-IN")} messages, led by ${name(leader([peak]))}.` });
  if (peakIndex < months.length - 1) {
    const after = months.slice(peakIndex + 1);
    const recent = after.slice(-3);
    const ratio = avg(recent) / Math.max(1, peak.total);
    const title = ratio < 0.4 ? "Cooling off" : ratio < 0.75 ? "Settling down" : "Still going strong";
    out.push({ period: range(after), title, detail: `Lately about ${avg(recent)} messages a month, ${pct(ratio)}% of the peak. ${cap(name(leader(after)))} ${leader(after) === name.me ? "are" : "is"} doing most of the talking now.` });
  }
  return out;
}

// ---------- moments ----------

function quoteOf(text, maxWords = 25) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  return words.length > maxWords ? words.slice(0, maxWords).join(" ") + "…" : words.join(" ");
}

function moments(messages) {
  const real = messages.filter((m) => !m.media && !m.deleted && m.text.trim().length > 1);
  if (!real.length) return [];
  const date = (m) => {
    const d = new Date(m.ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const longest = real.reduce((a, b) => (b.text.length > a.text.length ? b : a));
  const out = [{ date: date(real[0]), author: real[0].author, quote: quoteOf(real[0].text), why: "Where it all began. The very first message." }];
  if (longest !== real[0] && longest.text.length > 60) {
    out.push({ date: date(longest), author: longest.author, quote: quoteOf(longest.text), why: "The longest message in the whole chat. Someone had a lot to say." });
  }
  const last = real.at(-1);
  if (last !== real[0] && last !== longest) out.push({ date: date(last), author: last.author, quote: quoteOf(last.text), why: "The latest message, and where things stand right now." });
  return out;
}

// ---------- main ----------

export function templateReport({ stats, messages = [], me = "", relationship = "other" }) {
  const seed = seedOf(stats);
  const emojiCounts = new Map();
  for (const m of messages) {
    if (m.media || m.deleted) continue;
    emojiCounts.set(m.author, (emojiCounts.get(m.author) || 0) + (m.text.match(EMOJI) || []).length);
  }
  const people = stats.people.slice(0, 8).map((p) => ({ ...p, emojiRate: (emojiCounts.get(p.name) || 0) / Math.max(1, p.messages) }));
  const totals = {
    starts: people.reduce((s, p) => s + (p.starts || 0), 0) || 1,
  };
  const scores = effortScores(people);
  const sorted = [...scores].sort((a, b) => b.raw - a.raw);
  const group = people.length > 2;
  const gap = sorted.length > 1 ? sorted[0].raw - sorted[1].raw : 1;
  const even = !group && gap < 0.05;
  const close = !group && !even && gap < 0.15;
  const top = sorted[0]?.name || "Someone";
  const other = sorted[1]?.name || "everyone else";
  const meIn = people.some((p) => p.name === me) ? me : "";
  const name = (n) => (n === meIn ? "you" : n);
  name.me = meIn;
  const Name = (n) => (n === meIn ? "You" : n);
  const traitOf = assignRoles(people, totals);

  // headline
  let headline;
  if (group) headline = `${Name(top)} ${top === meIn ? "keep" : "keeps"} this group alive, and everyone knows it.`;
  else if (even) headline = pick(["Honestly? You two are pretty even. Rare, and nice.", "Equal effort on both sides. Didi approves."], seed);
  else if (close && meIn) headline = top === meIn
    ? `You're putting in a bit more than ${other}. Close, but not quite even.`
    : `${top} is putting in a bit more than you. Close, but not quite even.`;
  else if (close) headline = `${top} is putting in a bit more. Close, but not quite even.`;
  else if (top === meIn) headline = pick([`You're carrying this chat, beta. ${other} is along for the ride.`, `You're doing most of the work here. ${other}, take note.`], seed);
  else if (other === meIn) headline = pick([`${top} is putting in more effort than you. Just saying.`, `${top} is trying harder here, and you might want to notice.`], seed);
  else headline = `${top} is carrying this chat.`;

  // vibe words
  const perDay = stats.totalMessages / Math.max(1, stats.activeDays || 1);
  const lateShare = people.reduce((s, p) => s + p.lateNight, 0) / Math.max(1, stats.totalMessages);
  const vibe_words = [
    perDay >= 40 ? "Non-stop" : perDay >= 12 ? "Chatty" : "Easy-going",
    group ? (people[0].share > 0.4 ? "One-person show" : "Lively") : even ? "Balanced" : close ? "Nearly even" : "Lopsided",
    lateShare >= 0.15 ? "Late-night" : "Daytime",
  ];

  // summary
  const first = people[0];
  const starter = [...people].sort((a, b) => (b.starts || 0) - (a.starts || 0))[0];
  const fastest = [...people].filter((p) => p.medianReplyMinutes !== null).sort((a, b) => a.medianReplyMinutes - b.medianReplyMinutes)[0];
  const span = stats.months.length;
  const p1 = group
    ? `${people.length} people, ${stats.totalMessages.toLocaleString("en-IN")} messages and ${span} month${span === 1 ? "" : "s"} of chat. ${Name(first.name)} ${first.name === meIn ? "send" : "sends"} ${pct(first.share)}% of everything, and ${name(starter.name)} ${starter.name === meIn ? "start" : "starts"} the most conversations.`
    : `${stats.totalMessages.toLocaleString("en-IN")} messages over ${span} month${span === 1 ? "" : "s"}. ${Name(first.name)} ${first.name === meIn ? "send" : "sends"} ${pct(first.share)}% of them, and ${name(starter.name)} ${starter.name === meIn ? "start" : "starts"} ${pct((starter.starts || 0) / totals.starts)}% of the conversations.`;
  const p2 = fastest
    ? `${Name(fastest.name)} ${fastest.name === meIn ? "reply" : "replies"} fastest, usually within ${fmtMinutes(fastest.medianReplyMinutes)}. ${
        even ? "The effort looks balanced, which is honestly rare." : close ? `On effort, ${name(top)} ${top === meIn ? "are" : "is"} slightly ahead. Nothing to worry about, just worth knowing.` : `On effort, ${name(top)} ${top === meIn ? "are" : "is"} clearly ahead. That isn't good or bad by itself, but it's worth noticing.`
      }`
    : "";
  const p3 = "This quick report is worked out from the numbers only. For Didi's full read of what was actually said, use the button below.";

  // advice
  const advice = [];
  if (!group && !even && !close && meIn) {
    if (top === meIn) advice.push(`Let ${other} start the next few conversations and see what happens. The answer will tell you a lot.`);
    else advice.push(`${top} is putting in more. Start a conversation tomorrow, just because.`);
  }
  const mine = people.find((p) => p.name === meIn);
  if (mine?.medianReplyMinutes >= 60) advice.push("Your replies are on the slow side. Nobody needs instant replies, but a quick 'busy, will reply later' goes a long way.");
  if (lateShare >= 0.2) advice.push("Save the serious talks for the daytime. Late-night chats feel deep, but tired brains argue more.");
  const byRelationship = {
    partner: "Ask about their day, properly, at least once a day. It's the small stuff that keeps a chat warm.",
    crush: "Ask a real question about their life, not just 'wyd'. Curiosity is attractive.",
    situationship: "If you want clarity, ask for it once, kindly and directly. A dodge is also an answer.",
    ex: "Ask yourself what you want from this chat. If the answer is 'them back', talk to a friend first.",
    long_distance: "Plan the next call or visit in the chat. Having something to look forward to helps a lot.",
    friend: "Send them a meme today. Friendships run on small check-ins.",
    group: "Tag the quiet ones now and then. Lurkers like being included too.",
    family: "Reply to the good-morning messages sometimes. It matters to them more than you think.",
    work: "Keep the work chat for work. The jokes are fine, but save the 10pm questions for tomorrow.",
    other: "Notice who reaches out first, and make sure it isn't always the same person.",
  };
  advice.push(byRelationship[relationship] || byRelationship.other);

  const share_line = group
    ? pick([`${people.length} people, one group chat, and ${stats.totalMessages.toLocaleString("en-IN")} messages of chaos.`, "Everyone has a role in this group. Even the lurkers."], seed)
    : even || close
      ? pick(["Equal effort, equal chaos. Didi approves.", "Two people, one rhythm. It works."], seed)
      : pick(["One of them is texting. The other is typing… sometimes.", "One person brings the energy, the other brings the replies."], seed);

  return {
    headline,
    vibe_emoji: VIBE_EMOJI[relationship] || VIBE_EMOJI.other,
    vibe_words,
    summary: [p1, p2, p3].filter(Boolean).join("\n\n"),
    effort: {
      who_cares_more: even ? "Even" : top,
      explanation: even
        ? `${Name(sorted[0].name)} and ${name(sorted[1].name)} send, start and reply at about the same rate.`
        : `Based on who sends more messages, starts more conversations, asks more questions and replies faster, ${name(top)} ${top === meIn ? "come" : "comes"} out ahead.`,
      scores: scores.map(({ name, score }) => ({ name, score })),
    },
    people: people.map((p) => {
      const trait = traitOf(p.name);
      const flags = flagsFor(p, people, totals);
      return {
        name: p.name,
        emoji: trait.emoji,
        role: trait.role,
        didi_thinks: didiThinks(p, trait, totals, p.name === meIn),
        green_flags: flags.green,
        red_flags: flags.red,
      };
    }),
    what_changed: chapters(stats.months, people, name),
    moments: moments(messages),
    advice: advice.slice(0, 3),
    share_line,
  };
}
