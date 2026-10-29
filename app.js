import { parseWhatsApp, participantsOf } from "./lib/parse.js";
import { computeStats, statsForPrompt } from "./lib/stats.js";
import { sampleTranscript } from "./lib/sample.js";
import { extractChatText } from "./lib/unzip.js";
import { DEMOS } from "./lib/demos.js";
import { templateReport } from "./lib/template.js";
import { buildCopyPrompt } from "./lib/prompt.js";

const $ = (id) => document.getElementById(id);
const COLORS = ["var(--p1)", "var(--p2)", "var(--p3)", "var(--p4)", "var(--p5)"];
const RELATIONSHIPS = [
  ["partner", "💍 Partner"],
  ["crush", "👀 Crush / talking stage"],
  ["situationship", "🙃 Situationship"],
  ["ex", "💔 Ex"],
  ["long_distance", "✈️ Long distance"],
  ["friend", "🫶 Friend"],
  ["group", "🍻 Friends group"],
  ["family", "🏡 Family"],
  ["work", "💼 Work"],
  ["other", "🤷 Other"],
];
const DECOR = [
  "Priya (Hinge) 💬", "Mummy 🏡", "The Boys 🍻", "Arjun (ex) 🚩", "Hubby 💍", "Bestie 💖",
  "College gang 🎓", "Neha (crush) ✨", "Cousins 🎄", "Office 4th floor 💼", "Sameer (again) 🔁",
];
const LOADING_LINES = [
  "Didi is putting the chai on…",
  "Reading every message. Yes, even the 2am ones…",
  "Counting who texts first…",
  "Looking for the moment things changed…",
  "Being fair to everyone. Mostly…",
  "Writing down what she really thinks…",
];

let chat = null; // { messages, participants }

// "free": template report in the browser plus "Copy for Claude" (static hosting).
// "api": the server writes the report with Claude (needs /api/report).
const MODE = document.querySelector('meta[name="didi-mode"]')?.content === "api" ? "api" : "free";
document.querySelectorAll("[data-mode]").forEach((el) => (el.hidden = el.dataset.mode !== MODE));
const COPY_BUDGET = 80_000; // keeps the paste small enough for free chat accounts

// ---------- helpers ----------

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function storage(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

function fmtNum(n) {
  return Number(n).toLocaleString("en-IN");
}

function fmtMonth(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }).replace(" ", " '");
}

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
}

function fmtMinutes(min) {
  if (min === null || min === undefined) return "n/a";
  if (min < 1) return "< 1 min";
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return `${h < 10 ? h.toFixed(1) : Math.round(h)} hr`;
}

function show(step) {
  for (const id of ["step-upload", "step-setup", "step-loading"]) $(id).hidden = id !== step;
}

function showError(id, message) {
  $(id).textContent = message;
  $(id).hidden = !message;
}

// ---------- theme ----------

const savedTheme = storage("theme");
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
$("theme").addEventListener("click", () => {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const current = document.documentElement.dataset.theme || (dark ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  storage("theme", next);
});
$("year").textContent = new Date().getFullYear();

// ---------- examples marquee ----------

function buildMarquee() {
  const items = [];
  DEMOS.forEach((demo, i) => {
    items.push(`<button class="chip demo" data-demo="${demo.id}">${esc(demo.label)} ${demo.emoji}</button>`);
    for (const label of DECOR.slice(i * 4, i * 4 + 4)) items.push(`<span class="chip decor" aria-hidden="true">${esc(label)}</span>`);
  });
  const half = items.join("");
  $("track").innerHTML = half + half.replace(/<button /g, '<button tabindex="-1" aria-hidden="true" ');
  $("track").addEventListener("click", (e) => {
    const id = e.target.closest("[data-demo]")?.dataset.demo;
    const demo = DEMOS.find((d) => d.id === id);
    if (demo) renderReport(demo.report, demo.stats, { demo: true });
  });
}
buildMarquee();

// ---------- upload ----------

async function readChatFile(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  return isZip ? extractChatText(buffer) : new TextDecoder().decode(buffer);
}

function loadChat(text) {
  const { messages } = parseWhatsApp(text);
  if (messages.length < 10) {
    throw new Error("Couldn't find WhatsApp messages in that file. Export the chat \"Without media\" and upload the .txt (Android) or .zip (iPhone).");
  }
  const participants = participantsOf(messages);
  chat = { messages, participants };

  const first = fmtDate(new Date(messages[0].ts).toISOString());
  const last = fmtDate(new Date(messages.at(-1).ts).toISOString());
  const names = participants.length <= 3 ? participants.join(", ").replace(/, ([^,]*)$/, " and $1") : `${participants.length} people`;
  $("found").innerHTML = `Found <b>${fmtNum(messages.length)} messages</b> between <b>${esc(names)}</b>, from ${first} to ${last}. 🎉`;

  $("me").innerHTML =
    participants.slice(0, 50).map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("") +
    `<option value="">I'd rather not say</option>`;
  const preset = participants.length > 2 ? "group" : "";
  $("relationship").innerHTML = RELATIONSHIPS.map(
    ([value, label]) =>
      `<input type="radio" name="rel" id="rel-${value}" value="${value}"${value === preset ? " checked" : ""}><label for="rel-${value}">${label}</label>`
  ).join("");
  showError("report-error", "");
  show("step-setup");
}

async function handleFile(file) {
  showError("upload-error", "");
  if (!file) return;
  if (file.size > 60 * 1024 * 1024) return showError("upload-error", "That file is too big. Export the chat without media.");
  try {
    loadChat(await readChatFile(file));
  } catch (err) {
    showError("upload-error", err.message);
  }
}

const drop = $("drop");
drop.addEventListener("click", () => $("file").click());
drop.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    $("file").click();
  }
});
$("file").addEventListener("change", (e) => handleFile(e.target.files[0]));
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  handleFile(e.dataTransfer.files[0]);
});
$("sample").addEventListener("click", async () => {
  try {
    const res = await fetch("samples/sample-chat.txt");
    loadChat(await res.text());
  } catch (err) {
    showError("upload-error", err.message);
  }
});
$("reset").addEventListener("click", () => {
  chat = null;
  $("file").value = "";
  show("step-upload");
});

// ---------- report request ----------

async function requestReport(payload) {
  const headers = { "Content-Type": "application/json" };
  const code = storage("access-code");
  if (code) headers["X-Access-Code"] = code;
  const res = await fetch("/api/report", { method: "POST", headers, body: JSON.stringify(payload) });
  if (res.status === 401) {
    const entered = prompt("This preview needs an access code:");
    if (!entered) throw new Error("An access code is needed to get a report.");
    storage("access-code", entered.trim());
    return requestReport(payload);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}).`);
  return data;
}

function startLoading() {
  show("step-loading");
  let line = 0;
  $("loading-line").textContent = LOADING_LINES[0];
  return setInterval(() => {
    line = (line + 1) % LOADING_LINES.length;
    $("loading-line").textContent = LOADING_LINES[line];
  }, MODE === "free" ? 700 : 2800);
}

$("go").addEventListener("click", async () => {
  if (!chat) return;
  const stats = computeStats(chat.messages);
  const me = $("me").value;
  const relationship = document.querySelector('input[name="rel"]:checked')?.value || "other";
  const question = $("question").value.trim();
  showError("report-error", "");
  const timer = startLoading();

  try {
    if (MODE === "free") {
      const copySample = sampleTranscript(chat.messages, COPY_BUDGET);
      const copyPrompt = buildCopyPrompt({
        transcript: copySample.transcript,
        sampled: copySample.sampled,
        stats: statsForPrompt(stats),
        me,
        relationship,
        question,
      });
      const report = templateReport({ stats, messages: chat.messages, me, relationship });
      await new Promise((r) => setTimeout(r, 1800)); // let the teapot do its thing
      renderReport(report, stats, { me, copyPrompt });
    } else {
      const sample = sampleTranscript(chat.messages);
      const { report, mock } = await requestReport({
        transcript: sample.transcript,
        sampled: sample.sampled,
        stats: statsForPrompt(stats),
        me,
        relationship,
        question,
      });
      renderReport(report, stats, { mock, me });
    }
    show("step-setup");
  } catch (err) {
    show("step-setup");
    showError("report-error", err.message);
  } finally {
    clearInterval(timer);
  }
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

// ---------- report rendering ----------

function colorFor(names) {
  const map = new Map();
  names.forEach((n, i) => map.set(n, COLORS[i] || "var(--muted)"));
  return (name) => map.get(name) || "var(--muted)";
}

function splitBar(title, entries, color) {
  const total = entries.reduce((s, e) => s + e.value, 0) || 1;
  let shown = entries.slice(0, 5);
  const rest = entries.slice(5).reduce((s, e) => s + e.value, 0);
  if (rest) shown = [...shown, { name: "Others", value: rest }];
  const segs = shown
    .filter((e) => e.value > 0)
    .map((e) => {
      const pct = (e.value / total) * 100;
      const label = pct >= 14 ? `${esc(e.name)} ${Math.round(pct)}%` : pct >= 7 ? `${Math.round(pct)}%` : "";
      return `<div style="flex:${e.value};background:${color(e.name)}" title="${esc(e.name)}: ${Math.round(pct)}%">${label}</div>`;
    })
    .join("");
  return `<div><div class="row-title">${esc(title)}</div><div class="split" role="img" aria-label="${esc(
    title + ": " + shown.map((e) => `${e.name} ${Math.round((e.value / total) * 100)}%`).join(", ")
  )}">${segs}</div></div>`;
}

function barRows(rows, max, color, format) {
  return `<div class="bars">${rows
    .map(
      (r) => `<div class="bar-row"><span class="name">${esc(r.name)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:0;background:${color(r.name)}" data-w="${Math.max(2, (r.value / (max || 1)) * 100)}%"></div></div>
      <span class="num">${format(r.value)}</span></div>`
    )
    .join("")}</div>`;
}

function monthChart(months) {
  if (!months || months.length < 2) return "";
  const W = 640, H = 160, gap = 2;
  const max = Math.max(...months.map((m) => m.total), 1);
  const bw = (W - gap * (months.length - 1)) / months.length;
  const bars = months
    .map((m, i) => {
      const h = Math.max(2, (m.total / max) * (H - 20));
      const x = i * (bw + gap);
      const y = H - h;
      const r = Math.min(4, bw / 2, h);
      const d = `M${x},${H}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${H}Z`;
      return `<g data-tip="${esc(fmtMonth(m.month))}: ${fmtNum(m.total)} messages" data-x="${((x + bw / 2) / W) * 100}" data-y="${(y / H) * 100}">
        <rect x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}" fill="transparent"/>
        <path d="${d}" fill="var(--accent)"/></g>`;
    })
    .join("");
  const peak = months.reduce((a, b) => (b.total > a.total ? b : a));
  return `<div class="card"><h3>Messages per month</h3>
    <p class="muted" style="margin:-6px 0 14px">Busiest: <b>${esc(fmtMonth(peak.month))}</b> with ${fmtNum(peak.total)} messages</p>
    <div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Messages per month bar chart">
      <line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="var(--line)" stroke-width="1"/>
      ${bars}
    </svg><div class="axis"><span>${esc(fmtMonth(months[0].month))}</span><span>${esc(fmtMonth(months.at(-1).month))}</span></div>
    <div class="tip" hidden></div></div></div>`;
}

function wireChart(root) {
  const chart = root.querySelector(".chart");
  if (!chart) return;
  const tip = chart.querySelector(".tip");
  const svg = chart.querySelector("svg");
  const showTip = (g) => {
    tip.textContent = g.dataset.tip;
    tip.style.left = g.dataset.x + "%";
    tip.style.top = (svg.clientHeight * g.dataset.y) / 100 + "px";
    tip.hidden = false;
  };
  chart.addEventListener("pointermove", (e) => {
    const g = e.target.closest("g[data-tip]");
    if (g) showTip(g);
  });
  chart.addEventListener("pointerleave", () => (tip.hidden = true));
}

function renderReport(report, stats, { mock = false, demo = false, me = "", copyPrompt = "" } = {}) {
  const people = stats.people || [];
  const names = people.map((p) => p.name);
  const color = colorFor(names);
  const top = (key, fn = (a, b) => b[key] - a[key]) => [...people].filter((p) => p[key] !== null && p[key] !== undefined).sort(fn)[0];

  const starter = top("starts");
  const fastest = top("medianReplyMinutes", (a, b) => a.medianReplyMinutes - b.medianReplyMinutes);
  const owl = top("lateNight");
  const days = stats.firstDate && stats.lastDate ? Math.max(1, Math.round((new Date(stats.lastDate) - new Date(stats.firstDate)) / 864e5)) : null;

  const banner = demo
    ? `<div class="mock-banner">👋 This is a sample report. The people in it aren't real. <a href="#try">Upload your own chat →</a></div>`
    : mock
      ? `<div class="mock-banner">🧪 Mock mode: the numbers are real, the writing is a placeholder. Add an API key on the server for Didi's real report.</div>`
      : "";

  const summary = String(report.summary || "")
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");

  const scores = (report.effort?.scores || []).map((s) => ({ name: s.name, value: s.score }));
  const replyRows = people.filter((p) => p.medianReplyMinutes !== null && p.medianReplyMinutes !== undefined).slice(0, 8)
    .map((p) => ({ name: p.name, value: p.medianReplyMinutes }));

  const html = `
    ${banner}
    <div class="card verdict">
      <div class="emoji">${esc(report.vibe_emoji)}</div>
      <h2>${esc(report.headline)}</h2>
      <div class="tags">${(report.vibe_words || []).map((w) => `<span class="tag">${esc(w)}</span>`).join("")}</div>
    </div>

    <div class="tiles">
      <div class="tile"><div class="label">Messages</div><div class="value">${fmtNum(stats.totalMessages)}</div><div class="sub">${days ? `over ${fmtNum(days)} days` : ""}</div></div>
      ${starter ? `<div class="tile"><div class="label">Texts first</div><div class="value">${esc(starter.name)}</div><div class="sub">${fmtNum(starter.starts)} conversations started</div></div>` : ""}
      ${fastest ? `<div class="tile"><div class="label">Fastest replies</div><div class="value">${esc(fastest.name)}</div><div class="sub">usually within ${fmtMinutes(fastest.medianReplyMinutes)}</div></div>` : ""}
      ${owl && owl.lateNight ? `<div class="tile"><div class="label">Night owl 🌙</div><div class="value">${esc(owl.name)}</div><div class="sub">${fmtNum(owl.lateNight)} messages after midnight</div></div>` : ""}
    </div>

    <div class="card summary"><h3>What Didi thinks</h3>${summary}</div>

    <div class="card">
      <h3>Who cares more?</h3>
      <p class="cares">${report.effort?.who_cares_more === "Even" ? "Honestly? It's <b>even</b>. 🤝" : `<b>${esc(report.effort?.who_cares_more)}</b> 💛`}</p>
      <p class="muted" style="margin-top:0">${esc(report.effort?.explanation)}</p>
      ${scores.length ? barRows(scores, 100, color, (v) => v) : ""}
    </div>

    <div class="card compare">
      <h3 style="margin-bottom:0">The numbers</h3>
      ${splitBar("Who sends more messages", people.map((p) => ({ name: p.name, value: p.messages })), color)}
      ${people.some((p) => p.starts) ? splitBar("Who starts conversations", people.map((p) => ({ name: p.name, value: p.starts || 0 })), color) : ""}
      ${replyRows.length ? `<div><div class="row-title">Typical reply time</div>${barRows(replyRows, Math.max(...replyRows.map((r) => r.value)), color, fmtMinutes)}</div>` : ""}
    </div>

    ${monthChart(stats.months)}

    <div class="people">
      ${(report.people || [])
        .map(
          (p) => `<div class="card person">
          <div class="head"><div class="avatar" style="background:color-mix(in srgb, ${color(p.name)} 30%, transparent)">${esc(p.emoji)}</div>
          <div><div class="pname">${esc(p.name)}${me && p.name === me ? ' <span class="muted" style="font-size:14px">(you)</span>' : ""}</div><div class="role">${esc(p.role)}</div></div></div>
          <p style="margin:0">${esc(p.didi_thinks)}</p>
          <ul class="flags">${(p.green_flags || []).map((f) => `<li class="g">${esc(f)}</li>`).join("")}${(p.red_flags || []).map((f) => `<li class="r">${esc(f)}</li>`).join("")}</ul>
        </div>`
        )
        .join("")}
    </div>

    ${(report.what_changed || []).length ? `<div class="card"><h3>What changed</h3><ol class="timeline">${report.what_changed
      .map((c) => `<li><span class="dot"></span><div><div class="period">${esc(c.period)}</div><strong>${esc(c.title)}</strong><span class="muted">${esc(c.detail)}</span></div></li>`)
      .join("")}</ol></div>` : ""}

    ${(report.moments || []).length ? `<div class="card"><h3>Moments that mattered</h3>${report.moments
      .map((m) => `<blockquote class="quote"><q>${esc(m.quote)}</q><div class="meta">${esc(m.author)} · ${esc(m.date)}</div><div>${esc(m.why)}</div></blockquote>`)
      .join("")}</div>` : ""}

    ${(report.advice || []).length ? `<div class="card"><h3>Didi's advice</h3><ul class="advice">${report.advice.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>` : ""}

    ${copyPrompt ? `<div class="card ai-card">
      <h3>Want Didi to actually read your messages? 🫖</h3>
      <p class="muted" style="margin-top:0">This report only uses the numbers. For Didi's full read, with real quotes, what changed and honest advice, copy your chat and paste it into Claude. A free account works.</p>
      <ol class="muted" style="margin:0 0 4px;padding-left:20px"><li>Tap <b>Copy chat for Claude</b></li><li>Open Claude and paste it into a new chat</li><li>Send it, and Didi does the rest</li></ol>
      <div class="actions">
        <button class="btn small" id="copy-ai">Copy chat for Claude</button>
        <a class="btn ghost small" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude ↗</a>
      </div>
      <p class="muted" id="copy-ai-status" style="margin-bottom:0" hidden></p>
    </div>` : ""}

    <div class="card share">
      <div class="eyebrow">Didi's one-liner</div>
      <div class="line">“${esc(report.share_line)}”</div>
      <div class="actions" style="justify-content:center">
        <button class="btn small" id="copy">Copy &amp; share</button>
        <a class="btn ghost small" href="#try" id="again">Read another chat</a>
      </div>
    </div>`;

  const root = $("report");
  root.innerHTML = html;
  $("result").hidden = false;
  wireChart(root);
  requestAnimationFrame(() => root.querySelectorAll(".bar-fill").forEach((el) => (el.style.width = el.dataset.w)));

  $("copy-ai")?.addEventListener("click", async () => {
    const ok = await copyText(copyPrompt);
    $("copy-ai-status").hidden = false;
    $("copy-ai-status").textContent = ok
      ? "Copied ✓ Now open Claude, paste it into a new chat and send."
      : "Couldn't copy automatically. Try again, or use a different browser.";
    if (ok) $("copy-ai").textContent = "Copied ✓";
  });

  $("copy").addEventListener("click", async () => {
    const text = `“${report.share_line}” — What Didi Thinks\n${location.origin}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        if (await copyText(text)) $("copy").textContent = "Copied ✓";
      }
    } catch {
      /* share sheet dismissed */
    }
  });
  $("result").scrollIntoView({ behavior: "smooth" });
}
