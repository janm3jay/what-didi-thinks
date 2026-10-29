# What Didi Thinks 🫖

Upload a WhatsApp chat and Didi (your honest, funny older sister) tells you what's really going on: who cares more, who texts first, what changed and when, and what she thinks of everyone in it.

It works with no API key and no server: everything runs in the browser and the site can be hosted free on GitHub Pages.

## Two modes

The mode is set by one line in `index.html`: `<meta name="didi-mode" content="free">`.

### Free mode (default): no API key and no server
- The WhatsApp export (`.txt` from Android, `.zip` from iPhone) is parsed in the browser (`lib/parse.js`, `lib/unzip.js`).
- Exact stats come from every message: who sends more, who starts conversations, reply times, late-night texting and messages per month (`lib/stats.js`).
- **Template Didi** (`lib/template.js`) writes the report from those numbers: the verdict, who cares more, a role and flags for each person, the chapters of the chat, real quotes (first, longest and latest message) and advice.
- **Copy chat for Claude:** builds Didi's full prompt with the stats and a sample of the chat (`lib/prompt.js`). The user pastes it into claude.ai for the full AI report. That costs you nothing.
- The chat never leaves the device. The site is static, so it runs on GitHub Pages.

### API mode: the full AI report on your site
Set `content="api"` and deploy on Vercel with `ANTHROPIC_API_KEY` (see below). `POST /api/report` (`api/report.js`, `lib/report.js`) sends a sample of up to about 150k characters, plus the stats, to Claude (`claude-opus-5-5`). It gets back a structured JSON report and stores nothing.

The homepage examples are fictional demo reports (`lib/demos.js`) and work in both modes.

## Host on GitHub Pages (free mode)

1. Repo → **Settings → Pages**.
2. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch to **main**, folder **/ (root)**, and save.
3. After a minute the site is live at `https://<username>.github.io/what-didi-thinks/`.

`.nojekyll` tells Pages to serve the files as they are.

## Run it locally

```bash
npm install
npm start                               # free mode works as-is
DIDI_MOCK=1 npm start                   # API mode without a key (set content="api" first)
ANTHROPIC_API_KEY=sk-ant-... npm start  # API mode with real reports
npm test
```

Open http://localhost:3000.

## Deploy with the API (Vercel)

1. Set `<meta name="didi-mode" content="api">` in `index.html`.
2. Import the repo in Vercel. No build settings are needed.
3. Add the environment variable `ANTHROPIC_API_KEY`.
4. Optional: set `ACCESS_CODE` to a word. Visitors are asked for it before a report is written, so strangers can't spend your API credit.

Each AI report costs roughly $0.20–0.25 for a long chat (about 40k input tokens at $4 per million, plus the output).

## Renaming

The brand appears in `index.html` (title, logo, copy), `app.js` (share text), the persona in `lib/prompt.js` and the template lines in `lib/template.js`. Search for "Didi" to rename it.
