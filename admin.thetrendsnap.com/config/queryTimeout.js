const mongoose = require("mongoose");

/**
 * A ceiling on every query, enforced by MongoDB itself.
 *
 * Without it a query against a cluster that accepts connections but never
 * answers — a throttled shared tier, a half-open socket after a network
 * change — waits for ever, and the request dies at the proxy sixty seconds
 * later as a 504 with no CORS headers and nothing in the application log.
 * With it the server aborts the operation and the route fails loudly.
 *
 * This must be required before any schema is compiled: a global plugin only
 * applies to schemas created after it is registered.
 */
const MAX_TIME_MS = Number(process.env.DB_QUERY_TIMEOUT_MS || 20000);

mongoose.plugin((schema) => {
  schema.pre(/^(find|count|distinct|replaceOne|update|delete)/, function () {
    if (typeof this.maxTimeMS === "function") this.maxTimeMS(MAX_TIME_MS);
  });

  schema.pre("aggregate", function () {
    this.option({ maxTimeMS: MAX_TIME_MS });
  });
});

module.exports = { MAX_TIME_MS };
