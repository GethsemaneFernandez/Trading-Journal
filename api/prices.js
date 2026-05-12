export default async function handler(req, res) {
  let { url, symbol, period1, period2, interval = '1d' } = req.query;

  // If symbol is provided, construct the Yahoo Finance URL
  if (!url && symbol) {
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const params = new URLSearchParams();
    if (period1) params.append('period1', period1);
    if (period2) params.append('period2', period2);
    params.append('interval', interval);
    params.append('includePrePost', 'false');
    params.append('events', 'div|split');
    url += `?${params.toString()}`;
  }

  if (!url) {
    return res.status(400).json({ error: 'Missing url or symbol parameter' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      // Return error status and body if Yahoo returns an error (e.g. 404 for invalid symbol)
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: `Yahoo API error: ${response.status}`, details: errData });
    }

    const data = await response.json();

    // Mimic AllOrigins format: { contents: "stringified_json" }
    // This maintains backward compatibility with the existing client logic.
    return res.status(200).json({
      contents: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
