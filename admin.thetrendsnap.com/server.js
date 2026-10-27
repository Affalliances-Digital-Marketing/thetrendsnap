// dotenv must run before anything that reads process.env at require time
// (Cloudinary is configured the moment its module is loaded).
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const dailyAutoUpdateJob = require("./jobs/dailyAutoUpdate.job");
const publishScheduledJob = require("./jobs/publishScheduled.job");

const PORT = process.env.PORT;

// Listen first, connect second. Waiting on the database to bind the port
// meant that a cluster which was slow or unreachable left nothing answering at
// all — no health check, no error, just a proxy timing out. The API now always
// answers; routes that need the database return 503 until it is back.
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

connectDB().then(() => {
  // Cron jobs write to the database, so they wait for the first connection.
  dailyAutoUpdateJob();
  publishScheduledJob();
});
