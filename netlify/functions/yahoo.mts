const YAHOO_BASE = "https://query1.finance.yahoo.com";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=45",
    },
  });
}

async function yahooJson(path: string) {
  const response = await fetch(`${YAHOO_BASE}${path}`, {
    headers: {
      "accept": "application/json,text/plain,*/*",
      "user-agent": "Mozilla/5.0 ArticleStockTracker/1.0",
    },
  });

  if (!response.ok) {
    return json({ error: `Yahoo returned ${response.status}` }, response.status);
  }

  return json(await response.json());
}

export default async (request: Request) => {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") || "quote";
  const symbol = (url.searchParams.get("symbol") || url.searchParams.get("q") || "").trim();

  if (!symbol) return json({ error: "Missing symbol or query" }, 400);

  if (kind === "search") {
    return yahooJson(`/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=12&newsCount=0`);
  }

  if (kind === "history") {
    return yahooJson(`/v8/finance/chart/${encodeURIComponent(symbol.toUpperCase())}?interval=1d&range=1mo`);
  }

  return yahooJson(`/v8/finance/chart/${encodeURIComponent(symbol.toUpperCase())}?interval=1d&range=1d`);
};

export const config = {
  path: "/api/yahoo",
};
