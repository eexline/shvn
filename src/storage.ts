import { isLocale, type Locale } from './i18n'

const LOCALE_KEY = 'signalai.locale'
const AGENT_KEY = 'signalai.agentId'

export type { Locale }

export function loadLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_KEY)
    if (isLocale(v)) return v
  } catch {
    /* ignore */
  }
  return 'en'
}

export function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    /* ignore */
  }
}

export function loadAgentId(): string | null {
  try {
    return localStorage.getItem(AGENT_KEY)
  } catch {
    return null
  }
}

export function saveAgentId(agentId: string) {
  try {
    localStorage.setItem(AGENT_KEY, agentId)
  } catch {
    /* ignore */
  }
}
