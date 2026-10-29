# What Didi Thinks 🫖

Upload a WhatsApp chat and Didi (your honest, funny older sister) tells you what's really going on: who cares more, who texts first, what changed and when, and what she thinks of everyone in it.

## How it works

1. **In the browser:** the WhatsApp export (`.txt` from Android, `.zip` from iPhone) is parsed in the browser (`lib/parse.js`, `lib/unzip.js`). Exact stats are calculated from every message: who sends more, who starts conversations, reply times, late-night texting and messages per month (`lib/stats.js`).
2. **Sampling:** long chats are cut down to about 150k characters. The sample keeps the start, the latest stretch and evenly spaced slices of the middle (`lib/sample.js`).
3. **On the server:** `POST /api/report` sends the sample and the stats to Claude (`claude-opus-5-5`) with Didi's persona. Structured outputs return a JSON report (`lib/report.js`). Nothing is stored.
4. The page renders the report: verdict, stat tiles, effort scores, comparison bars, a monthly chart, people cards, what changed, key quotes and advice.

Tapping an example chat on the homepage shows a fictional demo report (`lib/demos.js`) with no API call.

## Run it locally

```bash
npm install
npm run mock                           # no API key: real stats, placeholder writing
ANTHROPIC_API_KEY=sk-ant-... npm start # real reports
```

Open http://localhost:3000 and use "Try a sample" or upload your own export.

```bash
npm test
```

## Deploy (Vercel)

1. Import this repo in Vercel. No build settings are needed.
2. Add the environment variable `ANTHROPIC_API_KEY`.
3. Optional: set `ACCESS_CODE` to a word. The site will ask visitors for that code before writing a report, so strangers can't spend your API credit while you test.

`vercel.json` gives `/api/report` up to 300 seconds. Long chats usually take 30–90 seconds.

## Cost

Each report is about 40k input tokens plus a few thousand output tokens. At Opus 5.5 pricing ($4 / $20 per million tokens) that's roughly $0.20–0.25 per long chat, and less for short ones.

## Renaming

The brand appears in `index.html` (title, logo, copy), `app.js` (share text) and the persona in `lib/report.js`. Search for "Didi" to rename it.
