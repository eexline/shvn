import type { Pair, Timeframe } from './data'

const TV_SCRIPT = 'https://s3.tradingview.com/tv.js'

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => { remove?: () => void }
    }
  }
}

let scriptPromise: Promise<void> | null = null

export function loadTradingViewScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.TradingView?.widget) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TV_SCRIPT}"]`,
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('TradingView script failed')),
      )
      if (window.TradingView?.widget) resolve()
      return
    }

    const script = document.createElement('script')
    script.src = TV_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('TradingView script failed'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

/** Forex / metals only — no OTC */
export function toTvSymbol(pair: Pair | null | undefined): string {
  if (!pair) return 'FX:EURUSD'
  const id = pair.id.toUpperCase()
  if (id === 'XAUUSD' || id === 'XAGUSD') return `OANDA:${id}`
  return `FX:${id}`
}

export function toTvInterval(tf: Timeframe | null | undefined): string {
  if (!tf) return '15'
  switch (tf.id) {
    case '1m':
      return '1'
    case '3m':
      return '3'
    case '5m':
      return '5'
    case '15m':
      return '15'
    case '60m':
      return '60'
    default:
      return '15'
  }
}

export function tvLocale(appLocale: string): string {
  const map: Record<string, string> = {
    en: 'en',
    ru: 'ru',
    uk: 'uk',
    es: 'es',
    pt: 'pt',
    de: 'de',
    tr: 'tr',
    zh: 'zh_CN',
  }
  return map[appLocale] ?? 'en'
}
