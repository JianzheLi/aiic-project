import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 3000);
const backendUrl = process.env.BACKEND_URL || "http://backend:8000";
const distDir = join(process.cwd(), "dist");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function collectBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function proxyApi(request, response, requestUrl) {
  const backendPath = requestUrl.pathname.replace(/^\/api/, "") || "/";
  const targetUrl = new URL(`${backendPath}${requestUrl.search}`, backendUrl);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await collectBody(request);

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: {
        "content-type": request.headers["content-type"] || "application/json",
      },
      body,
    });
    const payload = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    });
    response.end(payload);
  } catch {
    response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ detail: "3000 端口已打开，但前端代理无法连接后端服务。" }));
  }
}

async function serveStatic(response, pathname) {
  const requestedPath = normalize(pathname === "/" ? "/index.html" : pathname);
  const filePath = join(distDir, requestedPath);
  const safePath = filePath.startsWith(distDir) && existsSync(filePath) ? filePath : join(distDir, "index.html");
  const ext = extname(safePath);
  response.writeHead(200, {
    "content-type": mimeTypes[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(safePath).pipe(response);
}

createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (requestUrl.pathname.startsWith("/api/")) {
    await proxyApi(request, response, requestUrl);
    return;
  }

  try {
    await serveStatic(response, requestUrl.pathname);
  } catch {
    const fallback = await readFile(join(distDir, "index.html"));
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(fallback);
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Frontend server listening on http://0.0.0.0:${port}`);
  console.log(`Proxying /api to ${backendUrl}`);
});
