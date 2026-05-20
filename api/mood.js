const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      response.status(503).json({ error: "Missing server API key." });
      return;
    }

    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const result = await getAiMoodReading({
      message: String(body.message || "").slice(0, 1200),
      signal: String(body.signal || ""),
      color: String(body.color || ""),
      apiKey
    });

    response.status(200).json(result);
  } catch (error) {
    response.status(500).json({ error: "AI mood reading failed." });
  }
};

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
      "HTTP-Referer": process.env.PUBLIC_SITE_URL || "https://cosmica-mood.vercel.app",
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
