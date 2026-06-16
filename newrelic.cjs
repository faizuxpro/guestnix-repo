"use strict";

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || "Guestnix"],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  distributed_tracing: {
    enabled: true,
  },
  application_logging: {
    forwarding: {
      enabled: true,
    },
  },
  logging: {
    level: "info",
  },
  allow_all_headers: false,
  attributes: {
    exclude: [
      "request.headers.authorization",
      "request.headers.cookie",
      "request.headers.x-api-key",
      "response.headers.set-cookie",
    ],
  },
};
