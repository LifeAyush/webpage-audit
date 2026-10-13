import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

const HOME = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Fixture page</title>
  <meta name="description" content="Local audit fixture">
</head>
<body>
  <h1>Fixture page</h1>
  <a href="/next">Learn more</a>
  <label>Password <input type="password" name="password" autocomplete="current-password"></label>
  <label>Note <input type="text" name="note" aria-label="Note"></label>
  <button type="button">Pay</button>
  <img src="/missing.png" alt="">
  <script>console.error("fixture console error")</script>
</body>
</html>`;

const NEXT = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Next page</title></head>
<body>
  <h1>Next page</h1>
  <a href="/">Back home</a>
</body>
</html>`;

function handler(req: IncomingMessage, res: ServerResponse): void {
  const pathname = req.url?.split("?")[0] ?? "/";
  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(HOME);
    return;
  }
  if (pathname === "/next") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(NEXT);
    return;
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("missing");
}

function listen(server: Server, port: number, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("error", onError);
      reject(error);
    };
    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      const address = server.address() as AddressInfo;
      resolve(address.port);
    });
  });
}

export async function startFixture(): Promise<{ port: number; close: () => Promise<void> }> {
  const v4 = createServer(handler);
  const port = await listen(v4, 0, "127.0.0.1");
  let v6: Server | null = createServer(handler);
  try {
    await listen(v6, port, "::1");
  } catch {
    v6.close();
    v6 = null;
  }
  return {
    port,
    close: () =>
      new Promise((resolve) => {
        const closeV4 = () => v4.close(() => resolve());
        if (v6) v6.close(closeV4);
        else closeV4();
      }),
  };
}
