export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Mimic AllOrigins format: { contents: "stringified_json" }
    return res.status(200).json({
      contents: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
