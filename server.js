const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT) || 8000;
const root = __dirname;
const allowedFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
  ["/category_list.json", "category_list.json"],
]);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  });
  response.end(JSON.stringify(payload));
}

function randomSample(items, amount) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy.slice(0, amount);
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function parseSearchResults(html) {
  const resultsStart = html.indexOf("videoSearchResult");
  const resultsHtml = resultsStart >= 0 ? html.slice(resultsStart) : html;
  const cards = resultsHtml.match(/<li class="[^"]*pcVideoListItem[^"]*"[\s\S]*?<\/li>/gi) ?? [];
  const videos = [];

  for (const card of cards) {
    const linkMatch = card.match(/href="(\/view_video\.php\?viewkey=[^"]+)"[^>]*title="([^"]+)"/i);
    const imageMatch = card.match(/<img[\s\S]*?\ssrc="([^"]+)"/i);
    const previewMatch = card.match(/data-mediabook="([^"]+)"/i);
    if (!linkMatch || !imageMatch) continue;

    videos.push({
      title: decodeHtml(linkMatch[2]),
      url: `https://www.pornhub.com${decodeHtml(linkMatch[1])}`,
      thumbnails: [decodeHtml(imageMatch[1])],
      previewUrl: previewMatch ? decodeHtml(previewMatch[1]) : null,
    });
  }

  return videos;
}

async function handleVideos(requestUrl, response) {
  const query = requestUrl.searchParams.get("query")?.trim();
  if (!query) return sendJson(response, 400, { error: "Brak wybranej kategorii." });

  const searchUrl = new URL("https://www.pornhub.com/video/search");
  searchUrl.searchParams.set("search", query);
  searchUrl.searchParams.set("page", "1");

  try {
    const searchResponse = await fetch(searchUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!searchResponse.ok) throw new Error(`Pornhub zwrócił HTTP ${searchResponse.status}.`);

    const html = await searchResponse.text();
    const firstPageVideos = parseSearchResults(html);
    const videos = randomSample(firstPageVideos, 6);
    if (videos.length < 6) throw new Error("Pierwsza strona wyszukiwania zawiera mniej niż 6 dostępnych filmów.");
    sendJson(response, 200, { videos });
  } catch (error) {
    sendJson(response, 502, {
      error: "Zewnętrzny serwis nie udostępnił wyników dla tej kategorii.",
      details: error.message,
    });
  }
}

function isAllowedPreviewUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)phncdn\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

async function handlePreview(request, requestUrl, response) {
  const previewUrl = requestUrl.searchParams.get("url");
  if (!previewUrl || !isAllowedPreviewUrl(previewUrl)) {
    return sendJson(response, 400, { error: "Nieprawidłowy adres podglądu." });
  }

  const headers = {
    Accept: "video/webm,video/*;q=0.9,*/*;q=0.8",
    Referer: "https://www.pornhub.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
  };
  if (request.headers.range) headers.Range = request.headers.range;

  try {
    const previewResponse = await fetch(previewUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!previewResponse.ok && previewResponse.status !== 206) {
      throw new Error(`CDN zwrócił HTTP ${previewResponse.status}.`);
    }

    const responseHeaders = {
      "Content-Type": previewResponse.headers.get("content-type") || "video/webm",
      "Cache-Control": "private, max-age=300",
      "Accept-Ranges": "bytes",
    };
    for (const header of ["content-length", "content-range"]) {
      const value = previewResponse.headers.get(header);
      if (value) responseHeaders[header] = value;
    }

    response.writeHead(previewResponse.status, responseHeaders);
    for await (const chunk of previewResponse.body) response.write(chunk);
    response.end();
  } catch (error) {
    if (!response.headersSent) {
      sendJson(response, 502, { error: "Nie udało się pobrać podglądu filmu." });
    } else {
      response.destroy(error);
    }
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (requestUrl.pathname === "/api/videos") return handleVideos(requestUrl, response);
  if (requestUrl.pathname === "/api/preview") return handlePreview(request, requestUrl, response);

  const fileName = allowedFiles.get(requestUrl.pathname);
  if (!fileName) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return response.end("Not found");
  }

  const filePath = path.join(root, fileName);
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Server error");
    }
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] });
    response.end(content);
  });
});

server.listen(port, () => {
  console.log(`Film Roulette działa na http://localhost:${port}`);
});
