// Local dev server: serves the static site and /api/report with no extra deps.
//   ANTHROPIC_API_KEY=sk-... npm start      (real reports)
//   DIDI_MOCK=1 npm start                   (canned report, no API key)
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import handler from "./api/report.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};
const PUBLIC = /^\/(index\.html|app\.js|favicon\.svg|lib\/(parse|stats|sample|unzip|demos|template|prompt)\.js|samples\/[\w-]+\.txt)$/;

function withHelpers(res) {
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (data) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
    return res;
  };
  return res;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/report") {
      req.body = await readBody(req);
      return handler(req, withHelpers(res));
    }
    const file = url.pathname === "/" ? "/index.html" : url.pathname;
    if (!PUBLIC.test(file)) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    try {
      const data = await readFile(path.join(root, file));
      res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  })
  .listen(port, () => console.log(`What Didi Thinks running at http://localhost:${port}`));
