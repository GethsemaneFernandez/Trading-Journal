export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Access-Control-Allow-Origin', 'https://basic-journal.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
