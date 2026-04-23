import fs from "fs";
import path from "path";
import { defineConfig } from "vite";

const dashboardRoutePatterns = [
  /^\/login\/?$/,
  /^\/dashboard(?:\/.*)?$/
];

function shouldServeApp(url = "") {
  const pathname = String(url || "").split("?")[0].split("#")[0];
  if (!pathname) return false;
  if (/\.[a-z0-9]+$/i.test(pathname)) return false;
  return dashboardRoutePatterns.some((pattern) => pattern.test(pathname));
}

function dashboardRouteFallbackPlugin() {
  const indexHtmlPath = path.resolve(process.cwd(), "index.html");

  return {
    name: "dashboard-route-fallback",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = request.url || "/";
        const method = request.method || "GET";

        if (method !== "GET" || !shouldServeApp(url)) {
          next();
          return;
        }

        const html = fs.readFileSync(indexHtmlPath, "utf-8");
        const transformedHtml = await server.transformIndexHtml(url, html);
        response.setHeader("Content-Type", "text/html");
        response.end(transformedHtml);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url || "/";
        const method = request.method || "GET";

        if (method !== "GET" || !shouldServeApp(url)) {
          next();
          return;
        }

        const html = fs.readFileSync(indexHtmlPath, "utf-8");
        response.setHeader("Content-Type", "text/html");
        response.end(html);
      });
    }
  };
}

export default defineConfig({
  plugins: [dashboardRouteFallbackPlugin()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true
  }
});
