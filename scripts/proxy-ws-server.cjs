/**
 * Прокси-сервер на порту 3000: проксирует HTTP в Next.js (3001), обрабатывает WebSocket на /ws.
 * WebSocket: авторизация по api_key в query. Broadcast при зачислении — через POST /internal/broadcast.
 */

const http = require("http");
const { WebSocketServer } = require("ws");
const { PrismaClient } = require("@prisma/client");

const NEXT_PORT = 3001;
const db = new PrismaClient();

// userId -> Set<WebSocket>
const connectionsByUser = new Map();

function broadcastToUser(userId, message) {
  const conns = connectionsByUser.get(userId);
  if (!conns || conns.size === 0) return;
  const data = JSON.stringify(message);
  for (const ws of conns) {
    if (ws.readyState === 1) ws.send(data);
  }
}

function removeConnection(userId, ws) {
  const conns = connectionsByUser.get(userId);
  if (conns) {
    conns.delete(ws);
    if (conns.size === 0) connectionsByUser.delete(userId);
  }
}

const server = http.createServer((req, res) => {
  const url = req.url || "";
  const path = url.split("?")[0];

  // Внутренний эндпоинт: broadcast (только с localhost, лимит тела — защита от DoS)
  if (path === "/internal/broadcast" && req.method === "POST") {
    const clientIp = req.socket.remoteAddress || "";
    if (!clientIp.includes("127.0.0.1") && !clientIp.includes("::1") && !clientIp.includes("::ffff:127.0.0.1")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const MAX_BODY = 512;
    let body = "";
    let overflow = false;
    req.on("data", (chunk) => {
      if (body.length + chunk.length > MAX_BODY) overflow = true;
      else body += chunk;
    });
    req.on("end", () => {
      if (overflow || body.length > MAX_BODY) {
        res.writeHead(413);
        res.end("Payload Too Large");
        return;
      }
      try {
        const { userId } = JSON.parse(body);
        if (userId && typeof userId === "string" && userId.length <= 64) {
          broadcastToUser(userId, { type: "balance_updated" });
          res.writeHead(200);
          res.end("OK");
        } else {
          res.writeHead(400);
          res.end("Bad Request");
        }
      } catch {
        res.writeHead(400);
        res.end("Bad Request");
      }
    });
    return;
  }

  // Остальные запросы — проксируем в Next.js
  const opts = {
    hostname: "127.0.0.1",
    port: NEXT_PORT,
    path: url,
    method: req.method,
    headers: req.headers,
  };
  const proxy = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxy.on("error", () => {
    res.writeHead(502);
    res.end("Bad Gateway");
  });
  req.pipe(proxy);
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  if (url.pathname !== "/ws" && url.pathname !== "/api/ws") {
    socket.destroy();
    return;
  }
  const apiKey = url.searchParams.get("api_key")?.trim();
  if (!apiKey || apiKey.length < 16) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  db.user
    .findUnique({ where: { apiKey }, select: { id: true } })
    .then((user) => {
      if (!user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req, user.id);
      });
    })
    .catch(() => {
      socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      socket.destroy();
    });
});

wss.on("connection", (ws, req, userId) => {
  let conns = connectionsByUser.get(userId);
  if (!conns) {
    conns = new Set();
    connectionsByUser.set(userId, conns);
  }
  conns.add(ws);

  ws.on("close", () => removeConnection(userId, ws));
  ws.on("error", () => removeConnection(userId, ws));
});

const port = parseInt(process.env.PORT, 10) || 3000;
const host = process.env.HOSTNAME || "0.0.0.0";

server.listen(port, host, () => {
  console.log(`Proxy+WS listening on ${host}:${port}`);
});
