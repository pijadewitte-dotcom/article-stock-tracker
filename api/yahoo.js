const YAHOO_BASE = 'https://query1.finance.yahoo.com';

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 's-maxage=45, stale-while-revalidate=120');
  res.end(JSON.stringify(data));
}

function extractSymbol(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  try {
    const normalized = raw.replace(/^HTTPS?:/i, match => match.toLowerCase());
    const url = new URL(normalized);
    const quoteMatch = url.pathname.match(/\/quote\/([^/?#]+)/i);
    const fromPath = quoteMatch && decodeURIComponent(quoteMatch[1]);
    const fromQuery = url.searchParams.get('p') || url.searchParams.get('symbol');
    return String(fromPath || fromQuery || '').trim().toUpperCase();
  } catch {
    const yahooMatch = raw.match(/finance\.yahoo\.com\/quote\/([^/?#\s]+)/i);
    if (yahooMatch) return decodeURIComponent(yahooMatch[1]).trim().toUpperCase();
    return raw.trim().toUpperCase();
  }
}

async function yahooJson(path) {
  const response = await fetch(`${YAHOO_BASE}${path}`, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0 ArticleStockTracker/1.0',
    },
  });

  if (!response.ok) {
    return { status: response.status, data: { error: `Yahoo returned ${response.status}` } };
  }

  return { status: 200, data: await response.json() };
}

module.exports = async function handler(req, res) {
  try {
    const kind = req.query.kind || 'quote';
    const rawSymbol = String(req.query.symbol || req.query.q || '').trim();
    const symbol = kind === 'search' ? rawSymbol : extractSymbol(rawSymbol);

    if (!symbol) return sendJson(res, 400, { error: 'Missing symbol or query' });

    let result;
    if (kind === 'search') {
      const query = extractSymbol(symbol) || symbol;
      result = await yahooJson(`/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0`);
    } else if (kind === 'history') {
      result = await yahooJson(`/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`);
    } else {
      result = await yahooJson(`/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`);
    }

    return sendJson(res, result.status, result.data);
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Yahoo proxy failed' });
  }
};
