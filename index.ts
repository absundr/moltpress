import { file, serve } from "bun";
import path from "path";
import { routes as apiRoutes } from "./api.ts";
import { routes as clientRoutes } from "./client.ts";
import config from "./config.ts";
import { initDB } from "./db.ts";

await initDB();

const server = serve({
  routes: {
    ...clientRoutes,
    ...apiRoutes,
  },

  ...config,

  // Fallback for unmatched routes
  fetch(req) {
    const url = new URL(req.url);

    // STATIC ASSET HANDLER
    if (url.pathname.startsWith("/images/")) {
      // Log request to debug
      // console.log(`Requested asset: ${url.pathname}`);

      const filePath = path.join(process.cwd(), "public", url.pathname);
      const asset = file(filePath);

      // Return 404 if file is 0 bytes or doesn't exist
      if (asset.size === 0) {
        return new Response("Image Not Found", { status: 404 });
      }
      return new Response(asset);
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Server running on ${server.url}`);
