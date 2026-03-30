import express from "express";

const app = express();

console.log("🔥 CLEAN SERVER DEPLOYED");

/* TEST ROUTE */
app.get("/test", (req, res) => {
  res.send("TEST WORKING ✅");
});

/* ROOT */
app.get("/", (req, res) => {
  res.json({ status: "NEW SERVER RUNNING 🚀" });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});
