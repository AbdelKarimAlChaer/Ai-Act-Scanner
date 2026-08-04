import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
};

export function startStaticServer(rootDir: string): Promise<{ server: Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const path = (req.url ?? "/").split("?")[0];
        const filePath = join(rootDir, decodeURIComponent(path));
        const body = await readFile(filePath);
        res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}
