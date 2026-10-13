import type { FakeSignal } from './signal'

export const MAX_CHATS = 3
export const MAX_MESSAGES = 5

const HISTORY_KEY = 'signalai.chats'

export type StoredMessage =
  | { id: string; role: 'user'; text: string; imageUrl?: string }
  | {
      id: string
      role: 'assistant'
      text: string
      signal?: FakeSignal
      agentName: string
      familyId: 'grok' | 'gpt' | 'claude' | 'gemini'
    }
  | { id: string; role: 'forex-closed' }

export type ChatSession = {
  id: string
  title: string
  updatedAt: number
  messages: StoredMessage[]
}

export type ChatHistoryState = {
  activeId: string
  chats: ChatSession[]
}

export function createEmptyChat(title = 'New chat'): ChatSession {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    updatedAt: Date.now(),
    messages: [],
  }
}

export function defaultHistory(title = 'New chat'): ChatHistoryState {
  const chat = createEmptyChat(title)
  return { activeId: chat.id, chats: [chat] }
}

export function loadChatHistory(fallbackTitle = 'New chat'): ChatHistoryState {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return defaultHistory(fallbackTitle)
    const parsed = JSON.parse(raw) as ChatHistoryState
    if (!parsed?.chats?.length || !parsed.activeId) {
      return defaultHistory(fallbackTitle)
    }
    const chats = parsed.chats
      .slice(0, MAX_CHATS)
      .map((c) => ({
        ...c,
        messages: (c.messages ?? [])
          .filter(
            (m) =>
              m.role === 'user' ||
              m.role === 'assistant' ||
              m.role === 'forex-closed',
          )
          .slice(-MAX_MESSAGES),
      }))
    const activeId = chats.some((c) => c.id === parsed.activeId)
      ? parsed.activeId
      : chats[0].id
    return { activeId, chats }
  } catch {
    return defaultHistory(fallbackTitle)
  }
}

export function saveChatHistory(state: ChatHistoryState) {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({
        activeId: state.activeId,
        chats: state.chats.slice(0, MAX_CHATS).map((c) => ({
          ...c,
          messages: c.messages.slice(-MAX_MESSAGES),
        })),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function titleFromMessages(
  messages: { role: string; text?: string; signal?: FakeSignal }[],
  fallback: string,
): string {
  const firstUser = messages.find((m) => m.role === 'user' && m.text?.trim())
  if (firstUser?.text) {
    const t = firstUser.text.trim()
    return t.length > 42 ? `${t.slice(0, 42)}…` : t
  }
  const withSignal = messages.find((m) => m.role === 'assistant' && m.signal)
  if (withSignal?.signal) {
    return `${withSignal.signal.pair} · ${withSignal.signal.timeframe}`
  }
  return fallback
}

export function toStoredMessages(
  messages: Array<
    | StoredMessage
    | { id: string; role: 'status'; step: string; kind: string }
  >,
): StoredMessage[] {
  return messages
    .filter(
      (m): m is StoredMessage =>
        m.role === 'user' ||
        m.role === 'assistant' ||
        m.role === 'forex-closed',
    )
    .map((m) => {
      if (m.role === 'forex-closed') {
        return { id: m.id, role: 'forex-closed' as const }
      }
      if (m.role === 'user') {
        const imageUrl =
          m.imageUrl && !m.imageUrl.startsWith('blob:') ? m.imageUrl : undefined
        return { id: m.id, role: 'user' as const, text: m.text, imageUrl }
      }
      return {
        id: m.id,
        role: 'assistant' as const,
        text: m.text,
        signal: m.signal,
        agentName: m.agentName,
        familyId: m.familyId,
      }
    })
    .slice(-MAX_MESSAGES)
}

export function formatChatTime(ts: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleString()
  }
}
