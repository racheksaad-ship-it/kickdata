export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const body = req.body;
    const isChat = body.system && body.system.includes('KickData');

    // use same model for everything — haiku had wrong model string
    const payload = {
      ...body,
      model: 'claude-haiku-4-5',
      max_tokens: body.max_tokens || 1000,
    };

    // web search only for chat
    if (isChat) {
      payload.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    } else {
      delete payload.tools;
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
    if (isChat) headers['anthropic-beta'] = 'web-search-2025-03-05';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) console.error('Anthropic error:', JSON.stringify(data));
    return res.status(response.status).json(data);

  } catch (err) {
    console.error('Proxy error:', err.message);
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
