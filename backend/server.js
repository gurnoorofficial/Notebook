"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const blockchainRoutes = require("./routes/blockchain");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.get("/api/health", (request, response) => {
  response.json({
    success: true,
    service: "Notebook backend",
  });
});

app.use("/api", blockchainRoutes);

app.use((request, response) => {
  response.status(404).json({
    success: false,
    error: "API route not found.",
  });
});

app.use((error, request, response, next) => {
  console.error("Unhandled backend error:", error?.stack || error?.message || error);

  if (response.headersSent) {
    return next(error);
  }

  return response.status(500).json({
    success: false,
    error: "An internal backend error occurred.",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Notebook backend running on http://localhost:${PORT}`);
});
