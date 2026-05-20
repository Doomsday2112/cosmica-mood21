const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "localhost";
const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

loadDotEnv();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/mood") {
    await handleMoodRequest(request, response);
    return;
  }

  serveStatic(request, response);
});

server.listen(port, host, () => {
  console.log(`Cosmica is running at http://${host}:${port}`);
});

function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${host}:${port}`);
  const appRoutes = new Set(["/", "/auraday", "/AuraDay", "/cosmica", "/Cosmica"]);
  const requested = appRoutes.has(url.pathname) ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const filePath = path.resolve(root, requested);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(data);
  });
}

async function handleMoodRequest(request, response) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      sendJson(response, 503, { error: "Missing server API key." });
      return;
    }

    const body = await readJson(request);
    const result = await getAiMoodReading({
      message: String(body.message || "").slice(0, 1200),
      signal: String(body.signal || ""),
      color: String(body.color || ""),
      apiKey
    });

    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, { error: "AI mood reading failed." });
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 8000) {
        reject(new Error("Request too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

async function getAiMoodReading({ message, signal, color, apiKey }) {
  const fallbackMood = signal || "mystic";
  const prompt = [
    "You are Cosmica Mood Helper, a magical cosmic mood companion.",
    "Infer a likely everyday mood from the user's text, emoji signal, and color signal.",
    "Do not diagnose, moralize, or overstate certainty. Use phrases like 'you may be feeling'.",
    "If the user mentions self-harm, abuse, or immediate danger, respond gently and encourage contacting trusted people or emergency/professional support.",
    "Return only valid JSON matching this exact shape:",
    '{"mood":"happy|stressed|excited|lonely|tired|mystic","title":"short poetic title","summary":"one supportive sentence","intensity":"number from 35% to 92%","music":"one music suggestion","body":"one breathing/stretch/rest idea","aesthetic":"space-like color/aura direction","prompt":"one tiny journal prompt","comfort":"one gentle comfort-chat sentence","quote":"one calming quote"}',
    "",
    `User message: ${message || "(empty)"}`,
    `Selected emoji mood: ${signal || "(none)"}`,
    `Selected color: ${color || "(none)"}`,
    `Fallback mood if unsure: ${fallbackMood}`
  ].join("\n");

  const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.PUBLIC_SITE_URL || "http://localhost:4173",
      "X-Title": "Cosmica Mood Helper"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You write concise, encouraging wellness UI copy. You are not a therapist and you never diagnose." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    })
  });

  if (!aiResponse.ok) {
    throw new Error(`OpenRouter returned ${aiResponse.status}.`);
  }

  const data = await aiResponse.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  return sanitizeAiMood(JSON.parse(content));
}

function sanitizeAiMood(raw) {
  const moods = new Set(["happy", "stressed", "excited", "lonely", "tired", "mystic"]);
  const mood = moods.has(raw.mood) ? raw.mood : "mystic";

  return {
    mood,
    title: cleanText(raw.title, "Cosmic reading"),
    summary: cleanText(raw.summary, "You may need a gentle pace and one small next step."),
    intensity: /^\d{2}%$/.test(raw.intensity || "") ? raw.intensity : "68%",
    music: cleanText(raw.music, "Soft ambient music with a slow rhythm."),
    body: cleanText(raw.body, "Take three slow breaths and relax your shoulders."),
    aesthetic: cleanText(raw.aesthetic, "Purple nebula, soft stars, and moonlit calm."),
    prompt: cleanText(raw.prompt, "What would make this moment one percent easier?"),
    comfort: cleanText(raw.comfort, "You can take this moment slowly."),
    quote: cleanText(raw.quote, "Small steps still move you through the stars.")
  };
}

function cleanText(value, fallback) {
  return String(value || fallback).replace(/\s+/g, " ").trim().slice(0, 180);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
