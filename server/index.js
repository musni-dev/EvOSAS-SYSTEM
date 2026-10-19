const express = require("express");
const cors = require("cors");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

/* 🔥 ROUTES GO HERE */
app.use("/api/announcements", require("./routes/announcements"));

// test route
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// server start
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});