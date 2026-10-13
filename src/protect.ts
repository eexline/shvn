/**
 * Client-side deterrents for casual copy / open-outside-Telegram.
 * Real cryptographic lock needs a backend that verifies Telegram initData HMAC.
 */

function isDevHost(): boolean {
  if (typeof location === 'undefined') return true
  const host = location.hostname
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.local')
  )
}

/** Production: only Telegram Mini App with initData (or local dev hosts). */
export function isAppAccessAllowed(): boolean {
  if (import.meta.env.DEV || isDevHost()) return true
  const wa = window.Telegram?.WebApp
  return Boolean(wa?.initData && wa.initData.length > 10)
}

function blockScreen(): void {
  document.documentElement.innerHTML = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SignalAI</title><style>
html,body{margin:0;height:100%;background:#050505;color:#f2f2f7;font-family:system-ui,sans-serif;display:grid;place-items:center}
main{max-width:280px;text-align:center;padding:24px}
h1{font-size:18px;margin:0 0 8px;font-weight:650}
p{margin:0;font-size:13px;line-height:1.45;color:#8e8e93}
</style></head><body><main><h1>SignalAI</h1><p>Open this app from Telegram.</p></main></body></html>`
}

function hardenDocument(): void {
  const root = document.documentElement
  root.classList.add('app-protected')

  const stop = (e: Event) => {
    e.preventDefault()
  }

  document.addEventListener('contextmenu', stop, { capture: true })
  document.addEventListener('dragstart', stop, { capture: true })
  document.addEventListener(
    'selectstart',
    (e) => {
      const t = e.target as HTMLElement | null
      if (t?.closest?.('input, textarea, [contenteditable="true"]')) return
      e.preventDefault()
    },
    { capture: true },
  )

  document.addEventListener(
    'keydown',
    (e) => {
      const key = e.key.toLowerCase()
      const ctrl = e.ctrlKey || e.metaKey
      if (key === 'f12') {
        e.preventDefault()
        return
      }
      if (ctrl && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
        e.preventDefault()
        return
      }
      if (ctrl && (key === 'u' || key === 's')) {
        e.preventDefault()
      }
    },
    { capture: true },
  )
}

/**
 * Call before React mount. Returns false if the app must not start.
 */
export function installProtection(): boolean {
  if (!isAppAccessAllowed()) {
    blockScreen()
    return false
  }

  if (!import.meta.env.DEV && !isDevHost()) {
    hardenDocument()
  }

  return true
}
