import { serve } from "@hono/node-server";
import { createApp } from "./server.js";
import { PORT } from "./config.js";

const app = createApp();

serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`RelayX API listening on port ${info.port}`);
});
