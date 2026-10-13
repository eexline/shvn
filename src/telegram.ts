export type TelegramUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

type SafeAreaInset = {
  top: number
  bottom: number
  left: number
  right: number
}

type TelegramWebApp = {
  initData?: string
  initDataUnsafe?: {
    user?: TelegramUser
  }
  version?: string
  platform?: string
  colorScheme?: 'light' | 'dark'
  isExpanded?: boolean
  isFullscreen?: boolean
  viewportHeight?: number
  viewportStableHeight?: number
  safeAreaInset?: SafeAreaInset
  contentSafeAreaInset?: SafeAreaInset
  ready: () => void
  expand: () => void
  requestFullscreen?: () => void
  exitFullscreen?: () => void
  disableVerticalSwipes?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  isVersionAtLeast?: (version: string) => boolean
  onEvent?: (event: string, callback: () => void) => void
  offEvent?: (event: string, callback: () => void) => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

/** Fallback вне Telegram (локальная разработка) */
const DEV_USER: TelegramUser = {
  id: 4821,
  first_name: 'Trader',
  username: 'demo_trader',
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return typeof window !== 'undefined' ? (window.Telegram?.WebApp ?? null) : null
}

export function getTelegramUser(): TelegramUser {
  const user = getTelegramWebApp()?.initDataUnsafe?.user
  if (user?.id) return user
  return DEV_USER
}

export function telegramDisplayName(user: TelegramUser): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return full || user.username || `ID ${user.id}`
}

export function telegramInitials(user: TelegramUser): string {
  const a = user.first_name?.trim()?.[0]
  const b = user.last_name?.trim()?.[0]
  if (a && b) return `${a}${b}`.toUpperCase()
  if (a) return a.toUpperCase()
  if (user.username?.[0]) return user.username[0].toUpperCase()
  return '?'
}

function px(n: number | undefined): string {
  return `${Math.max(0, Math.round(n ?? 0))}px`
}

export function syncTelegramSafeArea(wa?: TelegramWebApp | null) {
  const app = wa ?? getTelegramWebApp()
  if (!app || typeof document === 'undefined') return

  const root = document.documentElement
  const safe = app.safeAreaInset
  const content = app.contentSafeAreaInset

  const top = (safe?.top ?? 0) + (content?.top ?? 0)
  const bottom = (safe?.bottom ?? 0) + (content?.bottom ?? 0)
  const left = (safe?.left ?? 0) + (content?.left ?? 0)
  const right = (safe?.right ?? 0) + (content?.right ?? 0)

  root.style.setProperty('--safe-top', px(top))
  root.style.setProperty('--safe-bottom', px(bottom))
  root.style.setProperty('--safe-left', px(left))
  root.style.setProperty('--safe-right', px(right))

  if (safe) {
    root.style.setProperty('--tg-safe-area-inset-top', px(safe.top))
    root.style.setProperty('--tg-safe-area-inset-bottom', px(safe.bottom))
    root.style.setProperty('--tg-safe-area-inset-left', px(safe.left))
    root.style.setProperty('--tg-safe-area-inset-right', px(safe.right))
  }

  if (content) {
    root.style.setProperty('--tg-content-safe-area-inset-top', px(content.top))
    root.style.setProperty('--tg-content-safe-area-inset-bottom', px(content.bottom))
    root.style.setProperty('--tg-content-safe-area-inset-left', px(content.left))
    root.style.setProperty('--tg-content-safe-area-inset-right', px(content.right))
  }

  const vh = app.viewportStableHeight || app.viewportHeight
  if (vh) {
    root.style.setProperty('--tg-viewport-stable-height', px(vh))
  }

  root.dataset.tgFullscreen = app.isFullscreen ? '1' : '0'
  root.classList.add('tg-webapp')
}

export function bootTelegram() {
  const wa = getTelegramWebApp()
  if (!wa) return

  wa.ready()
  wa.expand()

  try {
    wa.setHeaderColor?.('#000000')
    wa.setBackgroundColor?.('#000000')
  } catch {
    /* older clients */
  }

  try {
    wa.disableVerticalSwipes?.()
  } catch {
    /* optional */
  }

  const supportsFs = typeof wa.requestFullscreen === 'function'
  const versionOk = !wa.isVersionAtLeast || wa.isVersionAtLeast('8.0')

  if (supportsFs && versionOk && !wa.isFullscreen) {
    try {
      wa.requestFullscreen!()
    } catch {
      /* fullscreenFailed handled via event */
    }
  }

  syncTelegramSafeArea(wa)

  const resync = () => syncTelegramSafeArea(wa)
  wa.onEvent?.('fullscreenChanged', resync)
  wa.onEvent?.('fullscreenFailed', resync)
  wa.onEvent?.('safeAreaChanged', resync)
  wa.onEvent?.('contentSafeAreaChanged', resync)
  wa.onEvent?.('viewportChanged', resync)
}
