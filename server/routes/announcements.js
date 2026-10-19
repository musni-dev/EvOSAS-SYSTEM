const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json([
    {
      id: 1,
      title: "OSAS System is now live",
      date: "2026-05-02"
    }
  ]);
});

module.exports = router;