// Fictional demo chats shown when someone taps an example on the homepage.
// Same shape as a real result: { stats, report }.

function months(start, totals) {
  const [y, m] = start.split("-").map(Number);
  return totals.map((total, i) => {
    const d = new Date(y, m - 1 + i, 1);
    return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, total };
  });
}

function person(name, messages, total, extra) {
  return { name, messages, share: messages / total, topEmojis: [], ...extra };
}

export const DEMOS = [
  {
    id: "rohan",
    label: "Rohan (situationship)",
    emoji: "🙃",
    stats: {
      totalMessages: 4218,
      firstDate: "2025-11-02T00:00:00Z",
      lastDate: "2026-09-28T00:00:00Z",
      months: months("2025-11", [210, 520, 690, 610, 480, 430, 380, 300, 260, 190, 148]),
      people: [
        person("You", 2405, 4218, { starts: 141, medianReplyMinutes: 3, lateNight: 212, doubleTexts: 96, topEmojis: [{ emoji: "😭" }, { emoji: "🥺" }, { emoji: "😂" }] }),
        person("Rohan", 1813, 4218, { starts: 58, medianReplyMinutes: 47, lateNight: 301, doubleTexts: 12, topEmojis: [{ emoji: "😂" }, { emoji: "🔥" }] }),
      ],
    },
    report: {
      headline: "He's having fun. You're having feelings. Both are allowed, but name it.",
      vibe_emoji: "🙃",
      vibe_words: ["Flirty", "Lopsided", "Late-night"],
      summary:
        "Arre, beta. Rohan likes you. That part isn't in doubt: he sends voice notes at 1am and remembers your exam dates. But you start 70% of the conversations, and you're the one who plans. When you suggested meeting his friends in March, he changed the topic within two messages.\n\nThe chat peaked in January and has been cooling ever since. Not dramatically, just slowly. Shorter replies, fewer questions about your day, and more \"haha\" and \"same\". That's usually not someone leaving. It's someone who's comfortable and hasn't decided anything.",
      effort: {
        who_cares_more: "You",
        explanation:
          "You started 141 conversations to Rohan's 58, and you reply in about 3 minutes against his 47. You've also double-texted 96 times after an hour of silence. He's done it 12 times.",
        scores: [
          { name: "You", score: 82 },
          { name: "Rohan", score: 51 },
        ],
      },
      people: [
        {
          name: "You",
          emoji: "🥺",
          role: "The Planner",
          didi_thinks:
            "You're warm, funny and very easy to talk to, and you're doing about two-thirds of the work. You ask the questions, you keep the plans going, and you apologise for things that weren't your fault.",
          green_flags: ["Remembers everything he tells you", "Says what you feel, eventually"],
          red_flags: ["Over-explains after he goes quiet", "Fills every silence"],
        },
        {
          name: "Rohan",
          emoji: "😎",
          role: "The 1am Philosopher",
          didi_thinks:
            "Charming, and properly attentive at night. By day he's vague. He isn't a villain. He enjoys this exactly as it is, and that's information.",
          green_flags: ["Thoughtful voice notes", "Hypes your wins"],
          red_flags: ["Dodges anything about the future", "Most active 12–3am only"],
        },
      ],
      what_changed: [
        { period: "Nov–Dec 2025", title: "The honeymoon", detail: "Long chats every night, equal effort, lots of inside jokes about the chai stall." },
        { period: "Jan–Mar 2026", title: "Peak and the swerve", detail: "Busiest month ever. Then the 'meet my friends' message in March and a two-day reply gap." },
        { period: "Apr–Sep 2026", title: "Slow fade", detail: "Messages down by two-thirds. He replies, but asks you far fewer questions." },
      ],
      moments: [
        { date: "2026-01-14", author: "Rohan", quote: "you're genuinely my favourite person to talk to", why: "His clearest statement of feeling, sent at 2:10am." },
        { date: "2026-03-09", author: "Rohan", quote: "haha let's see, anyway did you watch the match", why: "The moment the chat started cooling." },
      ],
      advice: [
        "Ask him once, plainly and kindly, what this is. His answer, or his dodge, is your answer.",
        "Stop double-texting for two weeks and see who starts the next conversation.",
      ],
      share_line: "He's texting at 2am. You're making plans for 2027.",
    },
  },
  {
    id: "family",
    label: "Family 🏡 (11 people)",
    emoji: "👵",
    stats: {
      totalMessages: 9874,
      firstDate: "2024-06-01T00:00:00Z",
      lastDate: "2026-10-20T00:00:00Z",
      months: months("2025-01", [610, 540, 590, 700, 980, 620, 560, 530, 610, 870, 640, 720, 590, 560, 610, 1030, 590, 620, 570, 680, 760, 650]),
      people: [
        person("Mummy", 3102, 9874, { starts: 512, medianReplyMinutes: 6, lateNight: 4, doubleTexts: 220, topEmojis: [{ emoji: "🙏" }, { emoji: "🌸" }] }),
        person("Anjali", 1780, 9874, { starts: 140, medianReplyMinutes: 9, lateNight: 60, doubleTexts: 25 }),
        person("Papa", 960, 9874, { starts: 220, medianReplyMinutes: 31, lateNight: 1, doubleTexts: 3, topEmojis: [{ emoji: "👍" }] }),
        person("Vikram Mama", 1410, 9874, { starts: 390, medianReplyMinutes: 18, lateNight: 0, doubleTexts: 160, topEmojis: [{ emoji: "🌅" }] }),
        person("You", 1120, 9874, { starts: 60, medianReplyMinutes: 54, lateNight: 120, doubleTexts: 5 }),
      ],
    },
    report: {
      headline: "Mummy runs this group, but Anjali quietly keeps the peace.",
      vibe_emoji: "🏡",
      vibe_words: ["Loving", "Loud", "Forwarded"],
      summary:
        "Eleven people, three generations, and around 400 good-morning flowers. Under all of that there's a family that checks on each other every day. Mummy asks if everyone has eaten 14 times a week, and nobody has ever said no.\n\nThe real hero is Anjali. Every time an argument starts, about Diwali plans, the wedding seating, or Mama's political forwards, she's the one who steps in with a joke or a plan. She's done it 23 times. Nobody has thanked her for it.",
      effort: {
        who_cares_more: "Mummy",
        explanation: "Mummy sends 31% of all messages and starts 512 conversations. Anjali is second on effort and first on settling arguments.",
        scores: [
          { name: "Mummy", score: 95 },
          { name: "Anjali", score: 80 },
          { name: "Vikram Mama", score: 64 },
          { name: "Papa", score: 40 },
          { name: "You", score: 35 },
        ],
      },
      people: [
        { name: "Mummy", emoji: "🙏", role: "The CEO", didi_thinks: "The heart of the group. Every message is a hug, even the ones in capitals.", green_flags: ["Checks on everyone daily"], red_flags: ["Forwards health tips without checking them"] },
        { name: "Anjali", emoji: "🕊️", role: "The Peacekeeper", didi_thinks: "She settles every fight with a meme or a plan. Someone should say thank you.", green_flags: ["Calms things down", "Organises every trip"], red_flags: [] },
        { name: "Papa", emoji: "👍", role: "The Thumbs-Up", didi_thinks: "A man of few words, almost all of them 'ok'. When he does write a full sentence, everyone pays attention.", green_flags: ["Always shows up for birthdays"], red_flags: ["Replies with 👍 to serious news"] },
        { name: "Vikram Mama", emoji: "🌅", role: "The Good-Morning Guy", didi_thinks: "Means well, posts a lot, and has started most of the group's arguments.", green_flags: ["Never misses a morning"], red_flags: ["Political forwards before 7am"] },
        { name: "You", emoji: "📵", role: "The Lurker", didi_thinks: "You read everything and reply to almost nothing. They notice, beta.", green_flags: ["Funny when you do show up"], red_flags: ["Median reply: 54 minutes"] },
      ],
      what_changed: [
        { period: "May 2025", title: "Wedding season", detail: "The busiest month: 980 messages about seating plans and one big argument." },
        { period: "Oct 2025", title: "Diwali logistics", detail: "Anjali took over the planning, and the arguments dropped by half." },
        { period: "Apr 2026", title: "Nani's 80th", detail: "The most photos ever sent, and Papa wrote his longest message of the year." },
      ],
      moments: [
        { date: "2026-04-18", author: "Papa", quote: "Proud of this family. Thank you all for coming.", why: "Papa's longest message in two years. The whole group replied with hearts." },
        { date: "2025-10-22", author: "Anjali", quote: "ok new plan, everyone at ours, I'll make the list", why: "The moment the Diwali argument ended." },
      ],
      advice: ["Thank Anjali in the group. Publicly.", "Reply to Mummy's 'khana khaya?' at least once a day. It costs nothing."],
      share_line: "Eleven people, one group, and a lot of good-morning flowers.",
    },
  },
  {
    id: "goa",
    label: "Goa trip 2026 🌴",
    emoji: "🌴",
    stats: {
      totalMessages: 2330,
      firstDate: "2026-02-10T00:00:00Z",
      lastDate: "2026-06-05T00:00:00Z",
      months: months("2026-02", [180, 520, 760, 690, 180]),
      people: [
        person("Kabir", 820, 2330, { starts: 61, medianReplyMinutes: 4, lateNight: 90, doubleTexts: 30 }),
        person("Meera", 640, 2330, { starts: 44, medianReplyMinutes: 6, lateNight: 40, doubleTexts: 12 }),
        person("Dev", 520, 2330, { starts: 12, medianReplyMinutes: 22, lateNight: 150, doubleTexts: 4 }),
        person("Tanya", 350, 2330, { starts: 9, medianReplyMinutes: 95, lateNight: 10, doubleTexts: 2 }),
      ],
    },
    report: {
      headline: "Kabir planned the whole trip. Dev planned none of it, then won the trip.",
      vibe_emoji: "🌴",
      vibe_words: ["Chaotic", "Hyped", "Sunburnt"],
      summary:
        "Four friends, one villa, and 2,330 messages to choose a hotel that Kabir had already picked in week one. He made 11 spreadsheets. Meera paid everyone back on time. Dev only showed up after midnight, and yet every one of his jokes became a group catchphrase.\n\nTanya said she was 'in' and then went quiet for 19 days. She was there, though. Everyone noticed, and everyone was happy about it.",
      effort: {
        who_cares_more: "Kabir",
        explanation: "Kabir started 61 of the 126 planning conversations and replied within 4 minutes on average.",
        scores: [
          { name: "Kabir", score: 92 },
          { name: "Meera", score: 76 },
          { name: "Dev", score: 48 },
          { name: "Tanya", score: 30 },
        ],
      },
      people: [
        { name: "Kabir", emoji: "📋", role: "The Travel Agent", didi_thinks: "Without Kabir there's no trip. Somebody buy this boy a drink.", green_flags: ["Organised everything"], red_flags: ["11 spreadsheets"] },
        { name: "Meera", emoji: "💸", role: "The Accountant", didi_thinks: "Reliable, fair, and the reason nobody fell out over money.", green_flags: ["Split every bill to the rupee"], red_flags: [] },
        { name: "Dev", emoji: "🌙", role: "The Night Shift", didi_thinks: "Useless at planning and essential for morale.", green_flags: ["Funniest person in the group"], red_flags: ["Seen at 3am, no reply"] },
        { name: "Tanya", emoji: "🐢", role: "The Ghost", didi_thinks: "Quiet in the chat, loud on the trip. That counts.", green_flags: ["Showed up"], red_flags: ["19-day silence"] },
      ],
      what_changed: [
        { period: "Feb 2026", title: "We should go!", detail: "Everyone's in. Nobody books anything." },
        { period: "Mar–Apr 2026", title: "Kabir takes over", detail: "Spreadsheets, polls, and the great villa debate." },
        { period: "May 2026", title: "The trip", detail: "Fewer messages, more photos, and Dev's 'one more song' becomes the group's motto." },
      ],
      moments: [{ date: "2026-05-12", author: "Dev", quote: "one more song and then we sleep, I promise", why: "They did not sleep. It's now the group's catchphrase." }],
      advice: ["Let Kabir pick the next destination. He's earned it.", "Make Dev book something. Just one thing."],
      share_line: "One villa, four friends, 11 spreadsheets and zero sleep.",
    },
  },
];
