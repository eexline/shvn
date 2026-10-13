import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * HTTPS-прокси: Telegram Mini App → Vercel → FastAPI на Ubuntu (можно http).
 * Env на Vercel: POSTBACK_API_URL=http://IP_ИЛИ_ДОМЕН:8000
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const id = String(req.query.id ?? '').trim()
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid telegram id' })
  }

  const base = process.env.POSTBACK_API_URL?.replace(/\/$/, '')
  if (!base) {
    return res.status(500).json({ error: 'POSTBACK_API_URL is not set' })
  }

  try {
    const upstream = await fetch(`${base}/deposit/${id}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    const text = await upstream.text()
    let body: unknown = text
    try {
      body = JSON.parse(text)
    } catch {
      /* leave as text */
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(upstream.status).json(
      typeof body === 'object' && body !== null
        ? body
        : { error: 'Invalid upstream response', raw: text },
    )
  } catch (err) {
    console.error('[proxy/deposit]', err)
    return res.status(502).json({ error: 'Upstream unreachable' })
  }
}
