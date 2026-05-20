const moodProfiles = {
  happy: {
    title: "Golden joy",
    summary: "You seem bright and open today. Keep the momentum gentle so the glow lasts.",
    intensity: "78%",
    music: "Sun-warmed indie pop, soft house, or bright acoustic loops.",
    body: "Take a five-minute walk and let the good energy move through you.",
    aesthetic: "Warm sunset, peach light, golden dust, soft sparks.",
    prompt: "What tiny moment made today feel lighter?",
    comfort: "Let the good feeling be simple. You do not have to explain it to deserve it.",
    quote: "A little light still counts as light."
  },
  stressed: {
    title: "Rainy blue reset",
    summary: "You may need fewer tabs open in your mind and a slower pace for the next hour.",
    intensity: "64%",
    music: "Low ambient piano, rain sounds, slow lo-fi without sharp percussion.",
    body: "Try 4-2-6 breathing: inhale 4, hold 2, exhale 6. Repeat four times.",
    aesthetic: "Rainy blue, glass reflections, distant moon, quiet water.",
    prompt: "What is one thing you can make smaller right now?",
    comfort: "You can lower the pressure without giving up on the day.",
    quote: "One breath can be the beginning of a softer room."
  },
  excited: {
    title: "Electric nebula",
    summary: "Your energy feels high and sparkling. Give it a clear direction so it becomes magic, not noise.",
    intensity: "88%",
    music: "Cosmic synthwave, playful pop, or upbeat instrumentals.",
    body: "Write the top three ideas before chasing all of them at once.",
    aesthetic: "Neon teal, violet plasma, shooting stars, silver glitter.",
    prompt: "What idea feels most alive right now?",
    comfort: "Big energy gets stronger when it has a little structure.",
    quote: "Follow the spark, then give it a lantern."
  },
  lonely: {
    title: "Moonlit quiet",
    summary: "You might be craving warmth, contact, or a reminder that you still belong somewhere.",
    intensity: "58%",
    music: "Soft vocals, moonlit jazz, or gentle acoustic songs.",
    body: "Send one low-pressure message to someone safe, or sit near a warm light.",
    aesthetic: "Deep indigo, pearl moon, lavender haze, window glow.",
    prompt: "Who or what helps you feel a little more held?",
    comfort: "This feeling is real, and it does not mean you are alone forever.",
    quote: "Even the quiet sky is full of unseen stars."
  },
  tired: {
    title: "Soft orbit",
    summary: "Your system sounds ready for rest, fewer demands, and a slower kind of kindness.",
    intensity: "52%",
    music: "Sleepy ambient, warm drones, slow piano, or ocean hush.",
    body: "Stretch your neck and hands, dim one light, and choose one task to pause.",
    aesthetic: "Soft blue, misty silver, clouded stars, low moon.",
    prompt: "What can wait until your energy returns?",
    comfort: "Rest is not a reward at the end. It is part of staying whole.",
    quote: "You are allowed to move softly."
  },
  mystic: {
    title: "Mystic calm",
    summary: "Your aura is balanced between curiosity and quiet. A small ritual could help you begin.",
    intensity: "68%",
    music: "Dreamy ambient pads with slow piano.",
    body: "Unclench your jaw, drop your shoulders, breathe out slowly.",
    aesthetic: "Purple nebula, silver dust, soft moonlight.",
    prompt: "What does your mind need less of right now?",
    comfort: "I can offer a small next step, not a diagnosis. Your pace can be soft today.",
    quote: "There is room for you in this moment."
  }
};

const keywords = {
  happy: ["happy", "good", "great", "joy", "calm", "peace", "grateful", "proud", "😊", "🙂"],
  stressed: ["stress", "stressed", "anxious", "overwhelmed", "panic", "worried", "pressure", "too much", "😵", "😰"],
  excited: ["excited", "hyped", "inspired", "energy", "amazing", "spark", "idea", "✨", "🔥"],
  lonely: ["lonely", "alone", "isolated", "miss", "empty", "sad", "distant", "🌙", "😔"],
  tired: ["tired", "sleepy", "drained", "exhausted", "burnt", "burned", "fatigue", "rest", "💤"]
};

const colorToMood = {
  nebula: "mystic",
  sunset: "happy",
  rainy: "stressed",
  sunrise: "excited"
};

const form = document.querySelector("#mood-form");
const input = document.querySelector("#mood-input");
const title = document.querySelector("#insight-title");
const summary = document.querySelector("#mood-summary");
const meter = document.querySelector(".meter span");
const suggestions = document.querySelector("#suggestions");
const comfortLine = document.querySelector("#comfort-line");
const journalList = document.querySelector("#journal-list");
const quoteButton = document.querySelector("#new-quote");
const submitButton = document.querySelector(".primary-action");
const aiStatus = document.querySelector("#ai-status");
const chips = [...document.querySelectorAll(".chip")];
const swatches = [...document.querySelectorAll(".swatch")];

let selectedSignal = "";
let selectedColor = "nebula";
let currentMood = "mystic";
let currentQuote = moodProfiles.mystic.quote;

function detectMood(text) {
  const phrase = `${text} ${selectedSignal}`.toLowerCase();
  const scores = Object.fromEntries(Object.keys(moodProfiles).map((mood) => [mood, 0]));

  for (const [mood, words] of Object.entries(keywords)) {
    words.forEach((word) => {
      if (phrase.includes(word)) scores[mood] += word.length > 2 ? 2 : 1;
    });
  }

  if (!text.trim() && selectedColor) scores[colorToMood[selectedColor]] += 1;
  if (selectedSignal) scores[selectedSignal] += 4;
  if (selectedColor) scores[colorToMood[selectedColor]] += 1;

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
    : "mystic";
}

function normalizeMood(mood) {
  return moodProfiles[mood] ? mood : "mystic";
}

function renderProfile(profile, shouldSave = false) {
  const mood = normalizeMood(profile.mood);
  currentMood = mood;
  document.body.dataset.mood = mood;
  title.textContent = profile.title;
  summary.textContent = profile.summary;
  meter.style.setProperty("--value", profile.intensity);
  comfortLine.textContent = profile.comfort;
  currentQuote = profile.quote;

  suggestions.innerHTML = [
    ["🎵", "Music", profile.music],
    ["🧘", "Body", profile.body],
    ["🎨", "Aesthetic", profile.aesthetic],
    ["📔", "Prompt", profile.prompt]
  ]
    .map(([icon, label, text]) => `
      <article>
        <span>${icon}</span>
        <h3>${label}</h3>
        <p>${text}</p>
      </article>
    `)
    .join("");

  if (shouldSave) saveJournal(mood, input.value.trim());
}

function renderMood(mood, shouldSave = false) {
  const normalizedMood = normalizeMood(mood);
  renderProfile({ mood: normalizedMood, ...moodProfiles[normalizedMood] }, shouldSave);
}

async function requestAiMood(text) {
  const response = await fetch("/api/mood", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      signal: selectedSignal,
      color: selectedColor
    })
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.error || "AI mood reading failed.");
  }

  return response.json();
}

function saveJournal(mood, text) {
  const entries = JSON.parse(localStorage.getItem("aura-journal") || "[]");
  const entry = {
    mood,
    text: text || `Chose a ${moodProfiles[mood].title.toLowerCase()} aura.`,
    date: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  };
  localStorage.setItem("aura-journal", JSON.stringify([entry, ...entries].slice(0, 6)));
  renderJournal();
}

function renderJournal() {
  const entries = JSON.parse(localStorage.getItem("aura-journal") || "[]");
  if (!entries.length) {
    journalList.innerHTML = `<p class="empty-note">Your first Cosmica reading will appear here, like a tiny constellation you can return to later.</p>`;
    return;
  }

  journalList.innerHTML = entries
    .map((entry) => `
      <div class="journal-item">
        <strong>${entry.date} · ${moodProfiles[entry.mood].title}</strong>
        <p>${escapeHtml(entry.text)}</p>
      </div>
    `)
    .join("");
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    selectedSignal = chip.dataset.signal;
    renderMood(selectedSignal);
  });
});

swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    swatches.forEach((item) => item.classList.remove("active"));
    swatch.classList.add("active");
    selectedColor = swatch.dataset.color;
    renderMood(colorToMood[selectedColor]);
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  submitButton.classList.add("is-loading");
  submitButton.textContent = "Reading...";
  submitButton.disabled = true;
  aiStatus.textContent = "Consulting the cosmic AI...";

  try {
    const profile = await requestAiMood(message);
    renderProfile(profile, true);
    aiStatus.textContent = "AI aura reading complete.";
  } catch (error) {
    renderMood(detectMood(message), true);
    aiStatus.textContent = "AI was unavailable, so Cosmica used its local mood reading.";
  } finally {
    submitButton.classList.remove("is-loading");
    submitButton.textContent = "Read My Aura";
    submitButton.disabled = false;
  }
});

quoteButton.addEventListener("click", () => {
  comfortLine.textContent = currentQuote || moodProfiles[currentMood].quote;
});

const canvas = document.querySelector("#starfield");
const context = canvas.getContext("2d");
let stars = [];

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  stars = Array.from({ length: Math.min(180, Math.floor(window.innerWidth / 6)) }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: Math.random() * 1.8 + 0.3,
    speed: Math.random() * 0.22 + 0.04,
    alpha: Math.random() * 0.7 + 0.25
  }));
}

function animateStars() {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  stars.forEach((star) => {
    star.y += star.speed;
    if (star.y > window.innerHeight + 4) {
      star.y = -4;
      star.x = Math.random() * window.innerWidth;
    }
    context.beginPath();
    context.fillStyle = `rgba(255,255,255,${star.alpha})`;
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  });
  requestAnimationFrame(animateStars);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
animateStars();
renderJournal();
