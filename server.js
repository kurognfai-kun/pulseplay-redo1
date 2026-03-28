import express from "express";
import fetch from "node-fetch";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// ======================
// PATH FIX (IMPORTANT)
// ======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================
// ENV
// ======================
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ======================
// SERVER + SOCKET
// ======================
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

function broadcast(event, data) {
  io.emit(event, data);
}

// ======================
// STATIC FRONTEND
// ======================
app.use(express.static("public"));

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================
// TWITCH AUTH
// ======================
let token = "";
let expiry = 0;

async function getToken() {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );

  const data = await res.json();
  token = data.access_token;
  expiry = Date.now() + data.expires_in * 1000;
}

async function ensureToken() {
  if (!token || Date.now() >= expiry) {
    await getToken();
  }
}

// ======================
// AI SCORING
// ======================
async function scoreClip(title, views) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `
Score virality 1-100.

Title: ${title}
Views: ${views}

Return ONLY JSON:
{"score": number}
        `
      }
    ]
  });

  const raw = completion.choices[0].message.content;
  return JSON.parse(raw).score;
}

// ======================
// VIRAL CHECK
// ======================
function checkViral(clip) {
  if (clip.score >= 85) {
    broadcast("viral_alert", {
      title: clip.title,
      score: clip.score,
      message: "🔥 VIRAL CLIP DETECTED"
    });
  }
}

// ======================
// HOME
// ======================
app.get("/", (req, res) => {
  res.json({ status: "PulsePlay API running 🚀" });
});

// ======================
// CLIPS PIPELINE
// ======================
app.get("/clips", async (req, res) => {
  try {
    await ensureToken();

    const userRes = await fetch(
      "https://api.twitch.tv/helix/users?login=veiltactician",
      {
        headers: {
          "Client-ID": CLIENT_ID,
          Authorization: `Bearer ${token}`
        }
      }
    );

    const userData = await userRes.json();
    const userId = userData.data[0].id;

    const clipRes = await fetch(
      `https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=6`,
      {
        headers: {
          "Client-ID": CLIENT_ID,
          Authorization: `Bearer ${token}`
        }
      }
    );

    const clips = await clipRes.json();

    const processed = [];

    for (const clip of clips.data) {
      const score = await scoreClip(clip.title, clip.view_count);

      await supabase.from("clips").upsert({
        twitch_clip_id: clip.id,
        title: clip.title,
        url: clip.url,
        views: clip.view_count,
        creator: clip.creator_name,
        ai_score: score
      });

      const clipData = {
        id: clip.id,
        title: clip.title,
        views: clip.view_count,
        score
      };

      // REAL-TIME UPDATE
      broadcast("clip_scored", clipData);

      // VIRAL ALERT
      checkViral(clipData);

      processed.push(clipData);
    }

    res.json({ success: true, clips: processed });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "pipeline failed" });
  }
});

// ======================
// SERVER START
// ======================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("PulsePlay running on port", PORT);
});