
import express from "express";

const app = express();

/* 🔥 FORCE LOG */
console.log("🔥 FORCE DEPLOY VERSION 3");

/* 🔥 TEST ROUTE */
app.get("/test", (req, res) => {
  console.log("✅ /test route hit");
  res.send("TEST WORKING ✅");
});

/* ROOT */
app.get("/", (req, res) => {
  res.json({ status: "PulsePlay API running 🚀" });
});

/* 🚀 START SERVER */
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});
