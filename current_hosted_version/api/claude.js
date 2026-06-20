export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', 'https://basic-journal.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') return res.status(405).end();

  // KEY GUARD — fail fast with clear actionable message
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY environment variable is not set in Vercel. Go to Project Settings \u2192 Environment Variables \u2192 add ANTHROPIC_API_KEY, then redeploy.'
    });
  }

  try {
    const sysPrompt = "You are a ruthless but constructive trading coach.\nAnalyze this trader's data and identify:\n(1) top 3 recurring mistakes with specific evidence from the trades,\n(2) which setups are profitable vs which they should stop doing,\n(3) one specific rule they must add to their system immediately.\nBe direct. No fluff. Use bullet points. Reference specific trades by ticker and date.";

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: sysPrompt,
        messages: req.body.messages
      })
    });

    const data = await response.json();
    // Pass through full response including Anthropic error objects
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
