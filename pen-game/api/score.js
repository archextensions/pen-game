export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pitch, buyerName, buyerChallenge } = req.body;

  if (!pitch || pitch.length < 5) {
    return res.status(400).json({ error: 'Pitch is too short.' });
  }

  const systemPrompt = `You are ${buyerName}, a brutally honest Wall Street executive. Score this sales pitch for a pen across 4 criteria (0-100 each):
- hook: Did the opening immediately grab your attention?
- persuasion: Were benefits compelling and relevant to a busy executive?
- objection: Did they handle or pre-empt obvious resistance?
- close: Did they create urgency and go for the sale?

Calculate overall as the average of the 4 scores.

Respond ONLY with valid JSON, no backticks, no markdown, no extra text:
{"hook":NUMBER,"persuasion":NUMBER,"objection":NUMBER,"close":NUMBER,"overall":NUMBER,"verdict":"One punchy in-character sentence — did they make the sale?","feedback":"3-4 sentences of direct specific coaching referencing what they said or missed. Brutally honest but constructive."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Challenge given: "${buyerChallenge}"\n\nTheir pitch: "${pitch}"`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'API error' });
    }

    const data = await response.json();
    const raw = data.content.map(c => c.text || '').join('');
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    return res.status(200).json(result);

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Something went wrong.' });
  }
}
