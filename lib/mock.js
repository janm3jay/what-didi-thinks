// DIDI_MOCK=1: a canned report built from the real stats, for trying the site
// without an API key. The UI labels it as a mock.

export function mockReport({ stats }) {
  const people = (stats.people || []).slice(0, 8);
  const top = people[0]?.name || "Someone";
  const second = people[1]?.name || "everyone else";
  return {
    headline: `Mock report: ${top} is carrying this chat, and ${second} knows it.`,
    vibe_emoji: "🧪",
    vibe_words: ["Mock", "Preview", "Report"],
    summary: `This is a sample report so you can see the layout without an API key. The numbers on this page are real and were worked out from your chat in your browser.\n\nSet ANTHROPIC_API_KEY on the server and remove DIDI_MOCK to get Didi's real read on it.`,
    effort: {
      who_cares_more: top,
      explanation: `${top} sent ${people[0]?.messages ?? 0} messages (${people[0]?.share ?? "?"} of the chat). In a real report Didi explains what that means.`,
      scores: people.map((p, i) => ({ name: p.name, score: Math.max(20, 80 - i * 15) })),
    },
    people: people.map((p, i) => ({
      name: p.name,
      emoji: ["🌟", "🙃", "🫶", "😂", "🧐", "🐢", "🔥", "🌸"][i],
      role: i === 0 ? "The Main Character" : "The Supporting Cast",
      didi_thinks: `${p.name} sent ${p.messages} messages and started ${p.starts} conversations. The real report has Didi's honest take here.`,
      green_flags: ["Shows up in the chat"],
      red_flags: [],
    })),
    what_changed: [
      { period: `${stats.firstDate ?? "Start"} – ${stats.lastDate ?? "now"}`, title: "The whole chat", detail: "Real reports split the chat into chapters." },
    ],
    moments: [],
    advice: ["Add an API key to get real advice from Didi."],
    share_line: "Didi read the whole chat and has thoughts.",
  };
}
