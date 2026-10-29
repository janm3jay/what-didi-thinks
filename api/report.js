// POST /api/report — Vercel serverless function (also used by server.js locally).
import Anthropic from "@anthropic-ai/sdk";
import { createReport, validateInput, ReportError } from "../lib/report.js";
import { mockReport } from "../lib/mock.js";

let client;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const accessCode = process.env.ACCESS_CODE;
  if (accessCode && req.headers["x-access-code"] !== accessCode) {
    return res.status(401).json({ error: "This preview needs an access code." });
  }

  try {
    const input = validateInput(typeof req.body === "string" ? JSON.parse(req.body) : req.body);
    if (process.env.DIDI_MOCK === "1") {
      return res.status(200).json({ report: mockReport(input), mock: true });
    }
    client ??= new Anthropic();
    const report = await createReport(client, input);
    return res.status(200).json({ report });
  } catch (err) {
    if (err instanceof ReportError) return res.status(err.status).json({ error: err.message });
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Didi is swamped right now. Try again in a minute." });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic auth failed: check ANTHROPIC_API_KEY");
      return res.status(500).json({ error: "The server isn't set up yet (missing API key)." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return res.status(502).json({ error: "Didi couldn't be reached. Please try again." });
    }
    if (err instanceof SyntaxError) return res.status(400).json({ error: "Invalid JSON." });
    console.error(err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
