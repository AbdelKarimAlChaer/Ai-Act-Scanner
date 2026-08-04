import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "site");
const MIME = { ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

const server = createServer(async (req, res) => {
  let path = (req.url ?? "/").split("?")[0];
  if (path === "/") path = "/index.html";
  try {
    const filePath = join(root, decodeURIComponent(path));
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 8090;
server.listen(port, "127.0.0.1", () => {
  console.log(`Demo-Site läuft auf http://127.0.0.1:${port}`);
});
