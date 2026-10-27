const mongoose = require("mongoose");

/**
 * A query issued while the connection is down waits in a buffer. Ten seconds
 * is long enough to ride out a reconnect and short enough that a request
 * fails with an error instead of hanging until the proxy times it out.
 */
mongoose.set("bufferTimeoutMS", 10000);

const OPTIONS = {
  // Fail fast when no cluster node can be reached (a paused cluster, an IP
  // dropped from the Atlas allowlist) rather than waiting out the default.
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  // Without this a silently dropped connection — a firewall change mid-flight —
  // leaves every query waiting on a socket that will never answer.
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  maxPoolSize: 20,
  // Index builds belong to a migration, not to every boot: on a shared cluster
  // they can stall the first queries after a restart.
  autoIndex: process.env.NODE_ENV !== "production",
};

/** Logs the state changes that otherwise show up only as a hung API. */
const watch = () => {
  const { connection } = mongoose;
  connection.on("disconnected", () => console.error("⚠️  MongoDB disconnected"));
  connection.on("reconnected", () => console.log("✅ MongoDB reconnected"));
  connection.on("error", (err) => console.error("❌ MongoDB error:", err.message));
};

/**
 * Connects, and keeps trying. Exiting on the first failure turned a cluster
 * that was briefly unreachable into a restart loop; the driver reconnects on
 * its own once the first connection is made, so the retry only covers boot.
 */
const connectDB = async (attempt = 1) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, OPTIONS);
    console.log("✅ MongoDB Connected");
    if (attempt === 1) watch();
  } catch (error) {
    const wait = Math.min(30, 2 ** attempt);
    console.error(
      `❌ MongoDB connection failed (attempt ${attempt}): ${error.message} — retrying in ${wait}s`
    );
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    return connectDB(attempt + 1);
  }
};

module.exports = connectDB;
