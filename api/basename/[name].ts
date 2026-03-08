// proxy for basename API — avoids CORS (api.basename.app blocks browser requests)
export default async function handler(
  req: { method?: string; url?: string; query?: { name?: string } },
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { json: (d: unknown) => void }; json: (d: unknown) => void }
) {
  if (req.method !== 'GET') {
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let name = req.query?.name;
  if (!name && req.url) {
    const match = req.url.match(/\/api\/basename\/([^/?]+)/);
    name = match ? decodeURIComponent(match[1]) : undefined;
  }
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing name parameter' });
  }
  try {
    const response = await fetch(
      `https://api.basename.app/v1/names/${encodeURIComponent(name)}`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    console.error('basename proxy error:', err);
    return res.status(502).json({ error: 'Failed to resolve .base name' });
  }
}
