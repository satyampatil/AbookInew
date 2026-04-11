import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MIN_REQUEST_INTERVAL_MS = 60 * 1000;
const allowedOrigins = new Set([
  "https://abooki.co.uk",
  "https://www.abooki.co.uk",
  "https://studio-5978542726-e345b.web.app",
  "https://studio-5978542726-e345b.firebaseapp.com",
  "http://127.0.0.1:5000",
  "http://localhost:5000",
  "http://127.0.0.1:5002",
  "http://localhost:5002",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://localhost:5500"
]);

const responseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    genre: { type: "STRING" },
    description: { type: "STRING" },
    image_prompt: { type: "STRING" },
    cover_hex_bg: { type: "STRING" },
    cover_hex_text: { type: "STRING" },
    pages: {
      type: "ARRAY",
      items: { type: "STRING" }
    }
  },
  required: [
    "title", "genre", "description", "image_prompt",
    "cover_hex_bg", "cover_hex_text", "pages"
  ]
};

function cleanText(value, fallback, maxLength) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, maxLength);
}

function buildPrompt({ genre, title, idea }) {
  return `You are a creative author. Write a 10-page mini-book based on these details. Return ONLY JSON.
Genre: ${genre}
Title: ${title}
Core Idea: ${idea}

You must return ONLY a single JSON object matching this schema:
{
  "title": "The Book Title",
  "genre": "${genre}",
  "description": "A short, one-sentence compelling logline or description for the book.",
  "image_prompt": "A detailed, vivid 5-10 word prompt for an image generator.",
  "cover_hex_bg": "A 6-digit hex color code with no # for the book cover background.",
  "cover_hex_text": "A 6-digit hex color code with no # for contrasting cover text.",
  "pages": [
    "Page 1 text...",
    "Page 2 text...",
    "Page 3 text...",
    "Page 4 text...",
    "Page 5 text...",
    "Page 6 text...",
    "Page 7 text...",
    "Page 8 text...",
    "Page 9 text...",
    "Page 10 text..."
  ]
}`;
}

async function enforceCooldown(uid) {
  const db = getFirestore();
  const ref = db.collection("generationLimits").doc(uid);

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const lastRequestAt = snap.exists ? snap.data().lastRequestAt?.toMillis?.() || 0 : 0;
    const elapsed = Date.now() - lastRequestAt;

    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      throw new Error(`Please wait ${Math.ceil((MIN_REQUEST_INTERVAL_MS - elapsed) / 1000)} seconds before generating another book.`);
    }

    transaction.set(ref, {
      lastRequestAt: FieldValue.serverTimestamp(),
      totalRequests: FieldValue.increment(1)
    }, { merge: true });
  });
}

export const generateBookApi = onRequest({ secrets: [geminiApiKey], cors: false, region: "us-central1" }, async (req, res) => {
  const origin = req.get("Origin");
  if (origin && !allowedOrigins.has(origin)) {
    res.status(403).json({ error: "Origin not allowed." });
    return;
  }

  if (req.method !== "POST") {
    res.set("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authHeader = req.get("Authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!idToken) {
    res.status(401).json({ error: "Sign in before generating a book." });
    return;
  }

  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: "Invalid sign-in session." });
    return;
  }

  if (decodedToken.firebase?.sign_in_provider === "anonymous") {
    res.status(403).json({ error: "Use an email account before generating a book." });
    return;
  }

  const genre = cleanText(req.body?.genre, "Fantasy", 40);
  const title = cleanText(req.body?.title, "My AI Story", 120);
  const idea = cleanText(req.body?.idea, `A ${genre} story.`, 1000);

  if (!["Fantasy", "Sci-Fi", "Mystery", "Romance", "Children's"].includes(genre)) {
    res.status(400).json({ error: "Invalid genre." });
    return;
  }

  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    res.status(500).json({ error: "AI generation is not configured." });
    return;
  }

  try {
    await enforceCooldown(decodedToken.uid);

    const geminiResponse = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt({ genre, title, idea }) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema
        }
      })
    });

    const payload = await geminiResponse.json();

    if (!geminiResponse.ok) {
      res.status(geminiResponse.status).json({
        error: payload?.error?.message || "Gemini request failed."
      });
      return;
    }

    res.status(200).json(payload);
  } catch (error) {
    if (error.message?.startsWith("Please wait")) {
      res.status(429).json({ error: error.message });
      return;
    }

    console.error("Gemini proxy failed", error);
    res.status(502).json({ error: "AI generation failed." });
  }
});
