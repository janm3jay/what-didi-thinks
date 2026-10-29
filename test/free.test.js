import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseWhatsApp } from "../lib/parse.js";
import { computeStats, statsForPrompt } from "../lib/stats.js";
import { sampleTranscript } from "../lib/sample.js";
import { templateReport } from "../lib/template.js";
import { buildCopyPrompt } from "../lib/prompt.js";
import { REPORT_SCHEMA } from "../lib/report.js";

// Checks a value against the JSON schema subset the report uses.
function conforms(value, schema, path = "report") {
  if (schema.type === "object") {
    assert.equal(typeof value, "object", path);
    assert.deepEqual(Object.keys(value).sort(), Object.keys(schema.properties).sort(), path);
    for (const [k, sub] of Object.entries(schema.properties)) conforms(value[k], sub, `${path}.${k}`);
  } else if (schema.type === "array") {
    assert.ok(Array.isArray(value), path);
    value.forEach((v, i) => conforms(v, schema.items, `${path}[${i}]`));
  } else if (schema.type === "integer") {
    assert.ok(Number.isInteger(value), path);
  } else {
    assert.equal(typeof value, "string", path);
    assert.ok(!value.includes("undefined") && !value.includes("NaN"), `${path}: ${value}`);
  }
}

const sample = readFileSync(new URL("../samples/sample-chat.txt", import.meta.url), "utf8");

test("template report for a two-person chat matches the report shape", () => {
  const { messages } = parseWhatsApp(sample);
  const stats = computeStats(messages);
  const report = templateReport({ stats, messages, me: "Isha", relationship: "crush" });
  conforms(report, REPORT_SCHEMA);
  assert.equal(report.people.length, 2);
  assert.equal(report.vibe_emoji, "👀");
  assert.ok(report.moments.length >= 2);
  assert.equal(report.moments[0].quote, "hey! it was really nice meeting you at Kavya's party");
  assert.ok(report.what_changed.length >= 1);
  assert.match(report.summary, /You|Isha|Aarav/);
  assert.notEqual(report.people[0].role, report.people[1].role);
});

test("template report for a group chat, with no 'me' chosen", () => {
  const names = ["Kabir", "Meera", "Dev", "Tanya", "Rhea"];
  const messages = [];
  let ts = new Date(2025, 0, 1, 9).getTime();
  for (let i = 0; i < 3000; i++) {
    ts += (i % 50 === 0 ? 9 : 0.2) * 3600 * 1000;
    const author = names[(i * 7 + (i >> 3)) % (i % 11 === 0 ? 5 : 3)];
    messages.push({ ts, author, text: i % 13 ? `message ${i} 😂 what are we doing?` : "<Media omitted>", media: i % 13 === 0, deleted: false });
  }
  const stats = computeStats(messages);
  const report = templateReport({ stats, messages, me: "", relationship: "group" });
  conforms(report, REPORT_SCHEMA);
  assert.equal(report.people.length, 5);
  assert.match(report.headline, /keeps this group alive/);
  assert.equal(new Set(report.people.map((p) => p.role)).size, 5);
});

test("copy prompt includes Didi's persona, the stats and the chat", () => {
  const { messages } = parseWhatsApp(sample);
  const stats = computeStats(messages);
  const s = sampleTranscript(messages, 80_000);
  const prompt = buildCopyPrompt({ transcript: s.transcript, sampled: s.sampled, stats: statsForPrompt(stats), me: "Isha", relationship: "crush", question: "Is he interested?" });
  assert.match(prompt, /^You are Didi/);
  assert.match(prompt, /The user is "Isha"/);
  assert.match(prompt, /Is he interested\?/);
  assert.match(prompt, /<chat>\n\[2026-03-12 21:02\] Aarav: hey!/);
  assert.match(prompt, /Moments that mattered/);
  assert.ok(!prompt.includes("Write Didi's report.\n"));
});
