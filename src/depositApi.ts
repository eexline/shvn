export type DepositResponse = {
  telegram_id: number
  has_deposit: boolean
  deposit: number
  traders: { trader_id: number; deposit: number }[]
}

/**
 * Запрос идёт на тот же HTTPS-домен Vercel (/api/...),
 * сервер проксирует на FastAPI (POSTBACK_API_URL), даже если там http.
 */
export async function fetchDeposit(telegramId: number): Promise<number> {
  const res = await fetch(`/api/deposit/${telegramId}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`deposit HTTP ${res.status}`)
  }

  const data = (await res.json()) as DepositResponse
  return Number(data.deposit) || 0
}
