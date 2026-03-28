import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let token = "";
let expiry = 0;

// 🔐 GET TOKEN
async function getToken() {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );

  const data = await res.json();

  token = data.access_token;
  expiry = Date.now() + data.expires_in * 1000;

  console.log("New Twitch token acquired");
}

async function ensureToken() {
  if (!token || Date.now() >= expiry) {
    await getToken();
  }
}

// 🟢 HEALTH
app.get("/", (req, res) => {
  res.json({ status: "PulsePlay API running" });
});

// 👤 USER
app.get("/user", async (req, res) => {
  try {
    await ensureToken();

    const response = await fetch(
      "https://api.twitch.tv/helix/users?login=veiltactician",
      {
        headers: {
          "Client-ID": CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.json(await response.json());
  } catch {
    res.status(500).json({ error: "User fetch failed" });
  }
});

// 🎬 CLIPS
app.get("/clips", async (req, res) => {
  try {
    await ensureToken();

    const user = await fetch(
      "https://api.twitch.tv/helix/users?login=veiltactician",
      {
        headers: {
          "Client-ID": CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const userData = await user.json();
    const userId = userData.data[0].id;

    const clips = await fetch(
      `https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=6`,
      {
        headers: {
          "Client-ID": CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.json(await clips.json());
  } catch {
    res.status(500).json({ error: "Clips fetch failed" });
  }
});

// 🔴 LIVE STATUS
app.get("/analytics", async (req, res) => {
  try {
    await ensureToken();

    const response = await fetch(
      "https://api.twitch.tv/helix/streams?user_login=veiltactician",
      {
        headers: {
          "Client-ID": CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    res.json({
      live: data.data.length > 0,
      stream: data.data[0] || null,
    });
  } catch {
    res.status(500).json({ error: "Analytics failed" });
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port", PORT));