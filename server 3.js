// 利用規約・プライバシーポリシーを配信する小さな静的サーバー(依存パッケージなし)
//
// docs フォルダの構成と、対応するURL:
//   docs/index.html              → /                    (Bot一覧)
//   docs/<bot名>/index.html      → /<bot名>/
//   docs/<bot名>/terms.html      → /<bot名>/terms       (.html付きでも可)
//   docs/<bot名>/privacy.html    → /<bot名>/privacy     (.html付きでも可)
// botを増やすときは、docs に新しいフォルダを足すだけで、このファイルの変更は不要です。
const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, "docs");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

// botが1つだけだった頃の旧URL(/terms など)は、pigeonBot のページへ転送する。
// すでにDiscordなどに登録済みのURLが、リンク切れにならないようにするため。
const LEGACY_REDIRECTS = {
  "/terms": "/pigeonBot/terms",
  "/terms.html": "/pigeonBot/terms",
  "/privacy": "/pigeonBot/privacy",
  "/privacy.html": "/pigeonBot/privacy"
};

async function isFile(p) {
  try {
    return (await fsp.stat(p)).isFile();
  } catch {
    return false;
  }
}

async function isDir(p) {
  try {
    return (await fsp.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

// URLのパスを、配信するファイル(またはリダイレクト・エラー)に変換する
async function resolve(pathname) {
  const segments = pathname.split("/").filter(Boolean);

  // .git や .env など、ドットで始まるものは配信しない(".." もここで弾く)
  if (segments.some(s => s.startsWith("."))) return { status: 404 };

  const target = path.join(ROOT, ...segments);

  // docs フォルダの外は読ませない
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    return { status: 403 };
  }

  // フォルダ: /pigeonBot → /pigeonBot/ に転送し、中の index.html を返す。
  // 末尾の / がないと、ページ内の相対リンク(terms.html など)が壊れるため。
  if (await isDir(target)) {
    if (!pathname.endsWith("/")) return { redirect: pathname + "/" };
    const index = path.join(target, "index.html");
    return (await isFile(index)) ? { file: index } : { status: 404 };
  }

  if (await isFile(target)) return { file: target };

  // きれいなURL: /pigeonBot/terms → pigeonBot/terms.html
  if (!path.extname(target) && (await isFile(target + ".html"))) {
    return { file: target + ".html" };
  }

  return { status: 404 };
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end();
  }

  let url;
  let pathname;
  try {
    url = new URL(req.url, "http://localhost");
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end("Bad Request");
  }

  // Render のヘルスチェック用
  if (pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("ok");
  }

  if (LEGACY_REDIRECTS[pathname]) {
    res.writeHead(301, { Location: LEGACY_REDIRECTS[pathname] + url.search });
    return res.end();
  }

  try {
    const r = await resolve(pathname);

    if (r.redirect) {
      res.writeHead(301, { Location: r.redirect + url.search });
      return res.end();
    }

    if (r.status) {
      res.writeHead(r.status, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(r.status === 403 ? "Forbidden" : "404 Not Found");
    }

    const data = await fsp.readFile(r.file);
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(r.file)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300"
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500 Internal Server Error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Webページを配信中: ポート ${PORT}`);
});

module.exports = server;
