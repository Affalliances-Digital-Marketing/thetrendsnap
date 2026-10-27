const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");

const app = express();
const errorHandler = require("./middlewares/error.middleware");

/* =========================
   MIDDLEWARES
========================= */

app.use(compression());
app.use(cookieParser());

const ALLOWED_ORIGINS = [
  "https://driftdine.com",
  "https://www.driftdine.com",
  "https://admin.driftdine.com",
  "https://thetrendsnap.com",
  "https://www.thetrendsnap.com",
  "https://admin.thetrendsnap.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5180",
  "http://localhost:4173",
  "http://localhost:4174",
];

/**
 * Vite moves to the next free port when the default is taken, so a fixed list
 * of dev ports breaks the moment two projects run at once. Outside production
 * any localhost origin is accepted; the published list still governs the
 * deployed API.
 */
const isDevOrigin = (origin) =>
  process.env.NODE_ENV !== "production" &&
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin and server-to-server calls arrive without an Origin header.
      if (!origin || ALLOWED_ORIGINS.includes(origin) || isDevOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Articles carry full rich-text HTML, so the default 100 kb body cap is too low.
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

/* =========================
   ROUTES
========================= */

const mongoose = require("mongoose");

/** Named so the health check reads as a status rather than as a number. */
const DB_STATE = ["disconnected", "connected", "connecting", "disconnecting"];

// Answers 200 whenever the process is alive — the deployment's own health
// gate reads this — and names the database's state so a degraded API can be
// told apart from a dead one at a glance.
app.get("/api/health", (req, res) => {
  const db = DB_STATE[mongoose.connection.readyState] || "unknown";
  res.json({ status: db === "connected" ? "ok" : "degraded", db, uptime: process.uptime() });
});

/**
 * Every route below reads the database. While the connection is down those
 * queries used to sit in the driver's buffer until the proxy gave up a minute
 * later, and the browser saw a 504 with no CORS headers — which reads as "the
 * site is broken" with nothing in the logs to say why. Answer immediately
 * instead, with a status a caller can act on.
 */
app.use("/api", (req, res, next) => {
  if (mongoose.connection.readyState === 1 || req.path === "/health") return next();
  return res.status(503).json({
    success: false,
    message: "Database unavailable — the API is reconnecting. Please retry shortly.",
  });
});

/* ---- existing ---- */
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/contact", require("./routes/contact.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/news", require("./routes/news.routes"));
app.use("/api/homepage", require("./routes/homepage.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/auto-news", require("./routes/autoNews.routes"));

/* ---- added ---- */
app.use("/api/tags", require("./routes/tag.routes"));
app.use("/api/media", require("./routes/media.routes"));
app.use("/api/ads", require("./routes/advertisement.routes"));
app.use("/api/import", require("./routes/import.routes"));
app.use("/api/newsletter", require("./routes/newsletter.routes"));

/* =========================
   ERROR HANDLER (LAST)
========================= */

// Multer rejects oversized or wrong-typed uploads with its own error class;
// translate those into a clean 400 instead of a 500.
app.use((err, req, res, next) => {
  if (err && (err.name === "MulterError" || /file|upload/i.test(err.message || ""))) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

app.use(errorHandler);

module.exports = app;
