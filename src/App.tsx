import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  AMOUNTS,
  BROKER_NAME,
  MARKETS,
  MODELS,
  PAIRS,
  PLANS,
  TIMEFRAMES,
  buildPrompt,
  findAgent,
  firstUnlockedAgent,
  formatPairLabel,
  isAgentUnlocked,
  isFamilyUnlocked,
  nextPlan,
  planFromDeposit,
  planLabel,
  timeframesForMarket,
  type MarketId,
  type Pair,
  type Timeframe,
} from './data'
import { fetchDeposit } from './depositApi'
import { Dock, DockIcon } from './Dock'
import { BrandLogo } from './logos'
import { MagicCard } from './MagicCard'
import { NumberTicker } from './NumberTicker'
import { ShineBorder } from './ShineBorder'
import {
  generateSignal,
  statusSteps,
  type FakeSignal,
} from './signal'
import { ChartsPane } from './ChartsPane'
import { isForexWeekendClosed } from './forexMarket'
import {
  MAX_CHATS,
  MAX_MESSAGES,
  createEmptyChat,
  formatChatTime,
  loadChatHistory,
  saveChatHistory,
  titleFromMessages,
  toStoredMessages,
  type ChatSession,
} from './chats'
import {
  LOCALES,
  dict,
  getLocaleMeta,
  type Locale,
} from './i18n'
import {
  loadAgentId,
  loadLocale,
  saveAgentId,
  saveLocale,
} from './storage'
import {
  getTelegramUser,
  telegramDisplayName,
  telegramInitials,
} from './telegram'

type Tab = 'signal' | 'plan' | 'profile'
type ViewMode = 'chat' | 'charts'
type OpenMenu =
  | 'pair'
  | 'market'
  | 'timeframe'
  | 'amount'
  | 'model'
  | 'attach'
  | null
type StatusKind = 'think' | 'type' | 'analyze'

type ChatMessage =
  | { id: string; role: 'user'; text: string; imageUrl?: string }
  | {
      id: string
      role: 'assistant'
      text: string
      signal?: FakeSignal
      agentName: string
      familyId: (typeof MODELS)[number]['id']
    }
  | { id: string; role: 'status'; step: string; kind: StatusKind }
  | { id: string; role: 'forex-closed' }

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function capMessages(msgs: ChatMessage[]): ChatMessage[] {
  const durable = msgs.filter((m) => m.role !== 'status')
  const status = msgs.filter((m) => m.role === 'status')
  return [...durable.slice(-MAX_MESSAGES), ...status]
}

function initialAgentId(deposit = 0) {
  const plan = planFromDeposit(deposit)
  const saved = loadAgentId()
  if (saved) {
    const found = findAgent(saved)
    if (isAgentUnlocked(found.agent, plan.id)) return saved
  }
  return firstUnlockedAgent(plan.id).agent.id
}

function initialHistory() {
  return loadChatHistory('New chat')
}

export default function App() {
  const boot = useRef(initialHistory()).current
  const [tab, setTab] = useState<Tab>('signal')
  const [view, setView] = useState<ViewMode>('chat')
  const [pair, setPair] = useState<Pair | null>(null)
  const [market, setMarket] = useState<MarketId>('otc')
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null)
  const [amount, setAmount] = useState<number | null>(null)
  const [agentId, setAgentId] = useState(() => initialAgentId(0))
  const [deposit, setDeposit] = useState(0)
  const [depositReady, setDepositReady] = useState(false)
  const [locale, setLocale] = useState<Locale>(loadLocale)
  const [langOpen, setLangOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [attachPreview, setAttachPreview] = useState<string | null>(null)
  const [chats, setChats] = useState<ChatSession[]>(boot.chats)
  const [activeChatId, setActiveChatId] = useState(boot.activeId)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const active = boot.chats.find((c) => c.id === boot.activeId)
    return active?.messages ?? []
  })
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<OpenMenu>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const [menuOpenUp, setMenuOpenUp] = useState(false)

  const [toast, setToast] = useState<{
    id: number
    text: string
    leaving: boolean
  } | null>(null)
  const toastTimer = useRef<number | null>(null)
  const toastExitTimer = useRef<number | null>(null)
  const toastId = useRef(0)
  const skipSync = useRef(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const modelBtnRef = useRef<HTMLButtonElement | null>(null)
  const attachBtnRef = useRef<HTMLButtonElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const pillRefs = useRef<
    Partial<
      Record<
        Exclude<OpenMenu, 'model' | 'attach' | null>,
        HTMLButtonElement | null
      >
    >
  >({})
  const draftLocked = useRef(false)

  const { family, agent } = findAgent(agentId)
  const t = dict(locale)
  const localeMeta = getLocaleMeta(locale)
  const tgUser = getTelegramUser()
  const tgName = telegramDisplayName(tgUser)
  const tgInitials = telegramInitials(tgUser)
  const currentPlan = planFromDeposit(deposit)
  const upcoming = nextPlan(currentPlan)
  const progressToNext = upcoming
    ? Math.min(
        100,
        Math.round(
          ((deposit - currentPlan.minDeposit) /
            (upcoming.minDeposit - currentPlan.minDeposit)) *
            100,
        ),
      )
    : 100

  function tfShort(tf: Timeframe | null | undefined) {
    if (!tf) return ''
    return t.tf[tf.id]?.short ?? tf.short
  }

  function tfLabel(tf: Timeframe | null | undefined) {
    if (!tf) return ''
    return t.tf[tf.id]?.label ?? tf.label
  }

  function makePrompt() {
    return buildPrompt({
      pair,
      timeframe,
      amount,
      market,
      timeframeShort: timeframe ? tfShort(timeframe) : undefined,
      format: t.buildPrompt,
    })
  }

  function pushMessages(
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
  ) {
    setMessages((prev) => {
      const next =
        typeof updater === 'function' ? updater(prev) : updater
      return capMessages(next)
    })
  }

  useEffect(() => {
    let cancelled = false
    setDepositReady(false)
    fetchDeposit(tgUser.id)
      .then((value) => {
        if (cancelled) return
        setDeposit(value)
        setAgentId((prev) => {
          const plan = planFromDeposit(value)
          const found = findAgent(prev)
          if (isAgentUnlocked(found.agent, plan.id)) return prev
          return firstUnlockedAgent(plan.id).agent.id
        })
      })
      .catch((err) => {
        console.error('[deposit]', err)
        if (!cancelled) setDeposit(0)
      })
      .finally(() => {
        if (!cancelled) setDepositReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [tgUser.id])

  useEffect(() => {
    saveAgentId(agentId)
  }, [agentId])

  useEffect(() => {
    saveLocale(locale)
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    if (!isAgentUnlocked(agent, currentPlan.id)) {
      setAgentId(firstUnlockedAgent(currentPlan.id).agent.id)
    }
  }, [agentId, currentPlan.id, agent])

  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false
      return
    }
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              messages: toStoredMessages(messages),
              updatedAt: Date.now(),
              title: titleFromMessages(messages, t.chatUntitled),
            }
          : c,
      ),
    )
  }, [messages, activeChatId, t.chatUntitled])

  useEffect(() => {
    saveChatHistory({ activeId: activeChatId, chats })
  }, [chats, activeChatId])

  function selectAgent(nextId: string) {
    const next = findAgent(nextId)
    if (!isFamilyUnlocked(next.family, currentPlan.id)) {
      showToast(t.familyPlan(next.family.name, planLabel(next.family.minPlan)))
      return false
    }
    if (!isAgentUnlocked(next.agent, currentPlan.id)) {
      showToast(t.agentPlan(next.agent.name, planLabel(next.agent.minPlan)))
      return false
    }
    setAgentId(nextId)
    return true
  }

  function selectFamily(familyId: (typeof MODELS)[number]['id']) {
    const m = MODELS.find((f) => f.id === familyId)
    if (!m) return
    if (!isFamilyUnlocked(m, currentPlan.id)) {
      showToast(t.familyAvailable(m.name, planLabel(m.minPlan)))
      return
    }
    const unlocked = m.agents.find((a) => isAgentUnlocked(a, currentPlan.id))
    if (!unlocked) {
      showToast(t.noAgents(m.name, currentPlan.name))
      return
    }
    setAgentId(unlocked.id)
  }

  useEffect(() => {
    if (draftLocked.current) return
    setDraft(makePrompt())
  }, [pair, timeframe, amount, market, locale])


  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const next = Math.min(Math.max(el.scrollHeight, 40), 128)
    el.style.height = `${next}px`
  }, [draft])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', family.id)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        family.id === 'gpt'
          ? '#212121'
          : family.id === 'claude'
            ? '#1a1614'
            : family.id === 'gemini'
              ? '#0b0f1a'
              : '#050505',
      )
  }, [family.id])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, tab, view])

  useLayoutEffect(() => {
    if (!menu) return

    const btn =
      menu === 'model'
        ? modelBtnRef.current
        : menu === 'attach'
          ? attachBtnRef.current
          : pillRefs.current[menu]
    if (!btn) return

    const rect = btn.getBoundingClientRect()
    const gap = 8
    const pad = 12
    const preferWidth =
      menu === 'model' ? 260 : menu === 'attach' ? 200 : Math.max(rect.width, 168)
    const width = Math.min(preferWidth, window.innerWidth - pad * 2)
    const maxMenuH = menu === 'model' ? 340 : 240

    const spaceBelow = window.innerHeight - rect.bottom - gap - pad
    const spaceAbove = rect.top - gap - pad
    const openUp =
      spaceBelow < Math.min(160, maxMenuH) && spaceAbove > spaceBelow

    const maxHeight = Math.max(
      120,
      Math.min(maxMenuH, openUp ? spaceAbove : spaceBelow),
    )

    let left = rect.left + rect.width / 2 - width / 2
    left = Math.min(Math.max(pad, left), window.innerWidth - width - pad)

    if (openUp) {
      setMenuOpenUp(true)
      setMenuStyle({
        position: 'fixed',
        left,
        width,
        maxHeight,
        bottom: window.innerHeight - rect.top + gap,
        top: 'auto',
      })
    } else {
      setMenuOpenUp(false)
      setMenuStyle({
        position: 'fixed',
        left,
        width,
        maxHeight,
        top: rect.bottom + gap,
        bottom: 'auto',
      })
    }
  }, [menu])

  function closeMenu() {
    setMenu(null)
  }

  function showToast(text: string, ms = 2200) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (toastExitTimer.current) window.clearTimeout(toastExitTimer.current)

    toastId.current += 1
    const id = toastId.current
    setToast({ id, text, leaving: false })

    toastTimer.current = window.setTimeout(() => {
      setToast((prev) =>
        prev && prev.id === id ? { ...prev, leaving: true } : prev,
      )
      toastExitTimer.current = window.setTimeout(() => {
        setToast((prev) => (prev && prev.id === id ? null : prev))
      }, 280)
    }, ms)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
      if (toastExitTimer.current) window.clearTimeout(toastExitTimer.current)
    }
  }, [])

  function openHistory() {
    closeMenu()
    setHistoryOpen(true)
  }

  function createChat() {
    if (busy) {
      showToast(t.waitModel)
      return
    }
    if (chats.length >= MAX_CHATS) {
      showToast(t.historyMax)
      return
    }
    const chat = createEmptyChat(t.chatUntitled)
    skipSync.current = true
    setChats((prev) => [chat, ...prev])
    setActiveChatId(chat.id)
    setMessages([])
    setPair(null)
    setTimeframe(null)
    setAmount(null)
    setMarket('otc')
    draftLocked.current = false
    setDraft('')
    clearAttach()
    setHistoryOpen(false)
    setTab('signal')
    setView('chat')
    showToast(t.historyNew)
  }

  function openChat(id: string) {
    if (busy) {
      showToast(t.waitModel)
      return
    }
    if (id === activeChatId) {
      setHistoryOpen(false)
      return
    }
    const chat = chats.find((c) => c.id === id)
    if (!chat) return
    skipSync.current = true
    setActiveChatId(id)
    setMessages(chat.messages)
    draftLocked.current = false
    setDraft('')
    clearAttach()
    setHistoryOpen(false)
    setTab('signal')
    setView('chat')
  }

  function deleteChat(id: string) {
    if (busy) {
      showToast(t.waitModel)
      return
    }
    const remaining = chats.filter((c) => c.id !== id)
    if (remaining.length === 0) {
      const chat = createEmptyChat(t.chatUntitled)
      skipSync.current = true
      setChats([chat])
      setActiveChatId(chat.id)
      setMessages([])
      setHistoryOpen(false)
      showToast(t.historyDelete)
      return
    }
    const nextActive =
      id === activeChatId ? remaining[0].id : activeChatId
    const nextMessages =
      id === activeChatId
        ? (remaining.find((c) => c.id === nextActive)?.messages ?? [])
        : messages
    skipSync.current = true
    setChats(remaining)
    setActiveChatId(nextActive)
    if (id === activeChatId) setMessages(nextMessages)
    showToast(t.historyDelete)
  }

  function clearAttach() {
    if (attachPreview?.startsWith('blob:')) URL.revokeObjectURL(attachPreview)
    setAttachPreview(null)
    if (galleryInputRef.current) galleryInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  function onPickFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) {
      showToast(t.needImage)
      return
    }
    if (attachPreview?.startsWith('blob:')) URL.revokeObjectURL(attachPreview)
    const url = URL.createObjectURL(file)
    setAttachPreview(url)
    closeMenu()
    showToast(t.photoAttached)
  }

  async function sendMessage(textOverride?: string) {
    const text = (textOverride ?? draft).trim()
    const hasPhoto = Boolean(attachPreview) && !textOverride
    const canSendText = Boolean(text && pair && timeframe)
    if (busy || (!canSendText && !hasPhoto)) return

    const sendText = text || (hasPhoto ? t.imagePrompt : '')
    const weekendBlock = market === 'forex' && isForexWeekendClosed()

    setBusy(true)
    closeMenu()
    const imageUrl = hasPhoto ? (attachPreview ?? undefined) : undefined
    pushMessages((m) => [
      ...m,
      { id: uid(), role: 'user', text: sendText, imageUrl },
    ])
    draftLocked.current = true
    setDraft('')
    if (hasPhoto) setAttachPreview(null)

    if (weekendBlock) {
      await wait(500)
      pushMessages((m) => [
        ...m,
        { id: uid(), role: 'forex-closed' },
      ])
      setDraft('')
      draftLocked.current = false
      setBusy(false)
      return
    }

    const statusId = uid()
    const steps = statusSteps(locale, hasPhoto)

    pushMessages((m) => [
      ...m,
      {
        id: statusId,
        role: 'status',
        step: steps[0].label,
        kind: steps[0].kind,
      },
    ])

    for (let i = 1; i < steps.length; i++) {
      await wait(700 + Math.random() * 400)
      pushMessages((m) =>
        m.map((msg) =>
          msg.id === statusId && msg.role === 'status'
            ? { ...msg, step: steps[i].label, kind: steps[i].kind }
            : msg,
        ),
      )
    }
    await wait(650)

    const signal = generateSignal({
      pair,
      timeframe,
      amount,
      market,
      agentName: agent.name,
      fromImage: hasPhoto,
      locale,
    })
    const dirLabel =
      signal.direction === 'UP' ? t.buyLabel : t.sellLabel

    pushMessages((m) => [
      ...m.filter((msg) => msg.id !== statusId),
      {
        id: uid(),
        role: 'assistant',
        familyId: family.id,
        agentName: agent.name,
        text: hasPhoto
          ? t.analysisDoneImage(dirLabel)
          : t.analysisDone(dirLabel),
        signal,
      },
    ])
    setDraft('')
    draftLocked.current = false
    setBusy(false)
  }

  function repeatSignal() {
    if (busy) return
    if (!pair || !timeframe) {
      showToast(t.paramsResetPick)
      return
    }
    const prompt = makePrompt()
    void sendMessage(prompt)
  }

  return (
    <div className="app" data-theme={family.id}>
      <header className="header">
        <button
          className="icon-btn"
          aria-label={t.historyOpen}
          title={t.historyOpen}
          disabled={busy}
          onClick={openHistory}
        >
          <IconHistory />
          {chats.length > 1 && (
            <span className="plus-badge" aria-hidden>
              {chats.length}
            </span>
          )}
        </button>

        <div className="view-toggle">
          <button
            type="button"
            className={view === 'chat' ? 'active' : ''}
            onClick={() => setView('chat')}
          >
            <IconChat />
            {t.chat}
          </button>
          <button
            type="button"
            className={view === 'charts' ? 'active' : ''}
            onClick={() => {
              setView('charts')
              if (market === 'otc') {
                setMarket('forex')
                const allowed = timeframesForMarket('forex')
                if (
                  timeframe &&
                  !allowed.some((tf) => tf.id === timeframe.id)
                ) {
                  setTimeframe(null)
                }
              }
            }}
          >
            <IconCandles />
            {t.charts}
          </button>
        </div>

        <button
          type="button"
          className={`icon-btn lang-trigger${langOpen ? ' open' : ''}`}
          aria-label={t.langSwitch}
          aria-haspopup="dialog"
          aria-expanded={langOpen}
          title={localeMeta.native}
          onClick={() => setLangOpen(true)}
        >
          <IconGlobe />
        </button>
      </header>

      <div className="main">
        {tab === 'signal' && view === 'chat' && (
          <div className="pane">
            {messages.length === 0 && (
              <div className="empty-chat">
                <div className="empty-logo">
                  <BrandLogo familyId={family.id} size={56} />
                </div>
                <h2>{agent.name}</h2>
                <p>{t.emptyBody}</p>
              </div>
            )}

            <div className="chat-scroll" ref={scrollRef}>
              {messages.map((msg) => {
                if (msg.role === 'status') {
                  return (
                    <div key={msg.id} className="msg assistant">
                      <div className="msg-avatar" data-brand={family.id}>
                        <BrandLogo familyId={family.id} size={16} />
                      </div>
                      <div className={`status-pill status-${msg.kind}`}>
                        <StatusGlyph kind={msg.kind} />
                        <span>{msg.step}</span>
                      </div>
                    </div>
                  )
                }

                if (msg.role === 'user') {
                  return (
                    <div
                      key={msg.id}
                      className={`msg user${msg.imageUrl ? ' has-media' : ''}`}
                    >
                      <div className="msg-bubble">
                        {msg.imageUrl && (
                          <img
                            className="msg-image"
                            src={msg.imageUrl}
                            alt={t.attachment}
                          />
                        )}
                        {msg.text ? (
                          <span className="msg-caption">{msg.text}</span>
                        ) : null}
                      </div>
                    </div>
                  )
                }

                if (msg.role === 'forex-closed') {
                  return (
                    <div key={msg.id} className="msg assistant">
                      <div className="msg-avatar" data-brand={family.id}>
                        <BrandLogo familyId={family.id} size={16} />
                      </div>
                      <div className="forex-closed-banner" role="status">
                        <strong>{t.forexClosed}</strong>
                        <button
                          type="button"
                          onClick={() => {
                            setMarket('otc')
                            draftLocked.current = false
                          }}
                        >
                          {t.forexClosedHint}
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className="msg assistant">
                    <div className="msg-avatar" data-brand={msg.familyId}>
                      <BrandLogo familyId={msg.familyId} size={16} />
                    </div>
                    <div>
                      <div
                        className={`msg-bubble${msg.signal ? ' has-signal' : ''}`}
                      >
                        {msg.signal ? (
                          <p className="msg-lead">{msg.text}</p>
                        ) : (
                          msg.text
                        )}
                        {msg.signal && (
                          <SignalBlock
                            signal={msg.signal}
                            onRepeat={repeatSignal}
                            busy={busy}
                            locale={locale}
                          />
                        )}
                      </div>
                      <div className="msg-meta">
                        <BrandLogo familyId={msg.familyId} size={12} />
                        {msg.agentName}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="composer-wrap">
              <div className="composer-panel">
              <div className="param-row">
                <Pill
                  className="pill-pair"
                  open={menu === 'pair'}
                  onClick={() => setMenu(menu === 'pair' ? null : 'pair')}
                  ref={(el) => {
                    pillRefs.current.pair = el
                  }}
                >
                  {pair ? formatPairLabel(pair, market) : t.pair}
                </Pill>
                <Pill
                  className="pill-compact"
                  open={menu === 'market'}
                  onClick={() => setMenu(menu === 'market' ? null : 'market')}
                  ref={(el) => {
                    pillRefs.current.market = el
                  }}
                >
                  {MARKETS.find((m) => m.id === market)?.label ?? t.market}
                </Pill>
                <Pill
                  className="pill-compact"
                  open={menu === 'timeframe'}
                  onClick={() =>
                    setMenu(menu === 'timeframe' ? null : 'timeframe')
                  }
                  ref={(el) => {
                    pillRefs.current.timeframe = el
                  }}
                  chevronUp={menu === 'timeframe'}
                >
                  {timeframe ? tfShort(timeframe) : t.timeframe}
                </Pill>
                <Pill
                  className="pill-compact"
                  open={menu === 'amount'}
                  onClick={() => setMenu(menu === 'amount' ? null : 'amount')}
                  ref={(el) => {
                    pillRefs.current.amount = el
                  }}
                >
                  {amount != null ? `$${amount}` : t.amount}
                </Pill>
              </div>

              <div className="composer">
                {attachPreview && (
                  <div className="attach-preview">
                    <img src={attachPreview} alt={t.preview} />
                    <button
                      type="button"
                      className="attach-remove"
                      aria-label={t.removePhoto}
                      onClick={clearAttach}
                    >
                      ×
                    </button>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={draft}
                  readOnly
                    placeholder={
                      attachPreview
                        ? t.placeholderPhoto
                        : t.placeholderParams
                    }
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                />
                <div className="composer-bar">
                  <button
                    ref={attachBtnRef}
                    type="button"
                    className={`attach-btn${attachPreview ? ' on' : ''}`}
                    aria-label={t.attach}
                    onClick={() =>
                      setMenu(menu === 'attach' ? null : 'attach')
                    }
                  >
                    <IconPaperclip />
                  </button>
                  <button
                    ref={modelBtnRef}
                    type="button"
                    className="model-btn"
                    onClick={() => setMenu(menu === 'model' ? null : 'model')}
                  >
                    <BrandLogo familyId={family.id} size={14} />
                    {agent.name}
                    <IconChevron />
                  </button>
                  <button
                    type="button"
                    className="send-btn"
                    aria-label={t.send}
                    disabled={
                      busy ||
                      (!(draft.trim() && pair && timeframe) && !attachPreview)
                    }
                    onClick={() => void sendMessage()}
                  >
                    <IconSend />
                  </button>
                </div>
              </div>
              </div>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
            </div>
          </div>
        )}

        {tab === 'signal' && view === 'charts' && (
          <ChartsPane
            pair={pair}
            timeframe={timeframe}
            locale={locale}
            onPair={(p) => {
              setPair(p)
              setMarket('forex')
              draftLocked.current = false
            }}
            onTimeframe={(tf) => {
              setTimeframe(tf)
              setMarket('forex')
              draftLocked.current = false
            }}
            onAnalyze={() => {
              setMarket('forex')
              setView('chat')
              draftLocked.current = false
              setDraft(
                buildPrompt({
                  pair: pair ?? PAIRS[0],
                  timeframe: timeframe ?? TIMEFRAMES[2],
                  amount,
                  market: 'forex',
                  timeframeShort: tfShort(timeframe ?? TIMEFRAMES[2]),
                  format: t.buildPrompt,
                }),
              )
            }}
          />
        )}

        {tab === 'plan' && (
          <div className="pane screen plan-screen">
            <header className="plan-header">
              <h1>{t.planTitle}</h1>
              <p className="plan-header-sub">{t.planSub}</p>
            </header>

            <div className="plan-progress">
              <div className="plan-progress-top">
                <span>
                  {t.planNow} · <strong>{currentPlan.name}</strong>
                </span>
                <span>
                  {upcoming
                    ? t.planUntil(
                        upcoming.name,
                        String(upcoming.minDeposit),
                      )
                    : t.planMax}
                </span>
              </div>
              <div className="plan-progress-bar">
                <i style={{ width: `${progressToNext}%` }} />
              </div>
              <div className="plan-progress-deposit">
                {t.deposit}{' '}
                <strong>
                  $
                  {deposit.toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                  })}
                </strong>
              </div>
            </div>

            <div className="plans-grid">
              {PLANS.map((plan) => {
                const active = plan.id === currentPlan.id
                const locked = deposit < plan.minDeposit
                const copy = t.plans[plan.id]
                return (
                  <article
                    key={plan.id}
                    className={`plan-card${active ? ' featured' : ''}${locked ? ' locked' : ''}`}
                  >
                    <div className="plan-card-head">
                      <h3>{plan.name}</h3>
                      {active && (
                        <span className="plan-badge">{t.planActive}</span>
                      )}
                      {locked && (
                        <span className="plan-badge muted">{t.planLocked}</span>
                      )}
                    </div>
                    <div className="price">
                      {t.planFrom} ${plan.minDeposit.toLocaleString('en-US')}
                    </div>
                    <p className="plan-tagline">{copy.tagline}</p>
                    <ul>
                      {copy.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div className="pane screen profile-screen">
            <div className="profile">
              <header className="profile-head">
                <div className="profile-avatar" aria-hidden>
                  {tgUser.photo_url ? (
                    <img
                      className="profile-avatar-img"
                      src={tgUser.photo_url}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{tgInitials}</span>
                  )}
                  <i className="profile-avatar-badge">
                    <BrandLogo familyId={family.id} size={12} />
                  </i>
                </div>
                <h1 className="profile-name">{tgName}</h1>
                <p className="profile-sub">
                  {tgUser.username
                    ? `@${tgUser.username}`
                    : `id · ${tgUser.id}`}
                  {' · '}
                  {BROKER_NAME}
                </p>
              </header>

              <MagicCard className="profile-balance">
                <div className="profile-balance-top">
                  <span className="profile-balance-label">{t.deposit}</span>
                  <span className="profile-chip">{currentPlan.name}</span>
                </div>
                <div
                  className="profile-balance-value"
                  aria-busy={!depositReady}
                >
                  <span className="profile-balance-currency">$</span>
                  <NumberTicker value={deposit} decimalPlaces={0} />
                </div>
                <div className="profile-balance-bar" aria-hidden>
                  <i style={{ width: `${progressToNext}%` }} />
                </div>
                <div className="profile-balance-meta">
                  <span className="profile-balance-next">
                    {upcoming
                      ? t.planUntil(
                          upcoming.name,
                          String(upcoming.minDeposit),
                        )
                      : t.planMax}
                  </span>
                  <span className="profile-chip muted">{family.name}</span>
                </div>
              </MagicCard>

              <div className="profile-stats" aria-label={t.session}>
                <div className="profile-stat">
                  <span>{t.signals}</span>
                  <strong>
                    {chats.reduce(
                      (n, c) =>
                        n +
                        c.messages.filter(
                          (m) => m.role === 'assistant' && m.signal,
                        ).length,
                      0,
                    )}
                  </strong>
                </div>
                <div className="profile-stat">
                  <span>{t.agent}</span>
                  <strong>{agent.name}</strong>
                </div>
                <div className="profile-stat">
                  <span>{t.marketLabel}</span>
                  <strong>
                    {MARKETS.find((m) => m.id === market)?.label ?? '—'}
                  </strong>
                </div>
              </div>

              <div className="profile-models" role="group" aria-label={t.model}>
                {MODELS.map((m) => {
                  const unlocked = isFamilyUnlocked(m, currentPlan.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      data-brand={m.id}
                      className={`profile-model${m.id === family.id ? ' on' : ''}${unlocked ? '' : ' locked'}`}
                      onClick={() => selectFamily(m.id)}
                      aria-pressed={m.id === family.id}
                      title={
                        unlocked
                          ? m.name
                          : t.familyAvailable(m.name, planLabel(m.minPlan))
                      }
                    >
                      <BrandLogo familyId={m.id} size={20} />
                      <span>{m.name}</span>
                    </button>
                  )
                })}
              </div>

              <div className="profile-panel">
                <div className="profile-panel-row">
                  <span>{t.broker}</span>
                  <strong>{BROKER_NAME}</strong>
                </div>
                <div className="profile-panel-row">
                  <span>{t.updated}</span>
                  <strong>{t.updatedJustNow}</strong>
                </div>
                <div className="profile-panel-row">
                  <span>{t.untilPlan(upcoming?.name ?? 'Elite')}</span>
                  <strong>
                    {upcoming
                      ? `$${upcoming.minDeposit.toLocaleString('en-US')}`
                      : t.planMax}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="bottom-nav" aria-label={t.navMain}>
        <div className="nav-brand">
          <span className="nav-brand-logo">
            <BrandLogo familyId={family.id} size={24} />
          </span>
          <div className="nav-brand-text">
            <strong>SignalAI</strong>
            <span>{agent.name}</span>
          </div>
        </div>
        <Dock className="nav-dock" disableMagnification>
          <DockIcon
            label={t.navSignal}
            active={tab === 'signal'}
            onClick={() => setTab('signal')}
          >
            <IconSignal />
          </DockIcon>
          <DockIcon
            label={t.navPlan}
            active={tab === 'plan'}
            onClick={() => setTab('plan')}
          >
            <IconPlan />
          </DockIcon>
          <DockIcon
            label={t.navProfile}
            active={tab === 'profile'}
            onClick={() => setTab('profile')}
          >
            <IconProfile />
          </DockIcon>
        </Dock>
      </nav>

      {menu && (
        <>
          <div className="popover-backdrop" onClick={closeMenu} />
          <div
            className={`popover${menu === 'model' ? ' model-popover' : ''}${menuOpenUp ? ' popover-up' : ' popover-down'}`}
            style={menuStyle}
          >
            {menu === 'model' &&
              MODELS.map((m) => {
                const familyOk = isFamilyUnlocked(m, currentPlan.id)
                return (
                  <div key={m.id}>
                    <div
                      className={`popover-section${familyOk ? '' : ' locked'}`}
                    >
                      <BrandLogo familyId={m.id} size={12} />
                      {m.product}
                      {!familyOk && (
                        <span className="popover-plan-badge">
                          {planLabel(m.minPlan)}
                        </span>
                      )}
                    </div>
                    {m.agents.map((a) => {
                      const unlocked = isAgentUnlocked(a, currentPlan.id)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          className={`popover-item${a.id === agentId ? ' active' : ''}${unlocked ? '' : ' locked'}`}
                          onClick={() => {
                            if (selectAgent(a.id)) closeMenu()
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <BrandLogo familyId={m.id} size={14} />
                            {a.name}
                            {!unlocked && (
                              <span className="popover-plan-badge">
                                {planLabel(a.minPlan)}
                              </span>
                            )}
                          </span>
                          {a.id === agentId && <IconCheck />}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            {menu === 'attach' && (
              <>
                <button
                  type="button"
                  className="popover-item"
                  onClick={() => {
                    closeMenu()
                    galleryInputRef.current?.click()
                  }}
                >
                  <span className="popover-item-lead">
                    <IconGallery />
                    {t.pickGallery}
                  </span>
                </button>
                <button
                  type="button"
                  className="popover-item"
                  onClick={() => {
                    closeMenu()
                    cameraInputRef.current?.click()
                  }}
                >
                  <span className="popover-item-lead">
                    <IconCamera />
                    {t.takePhoto}
                  </span>
                </button>
                {attachPreview && (
                  <button
                    type="button"
                    className="popover-item"
                    onClick={() => {
                      clearAttach()
                      closeMenu()
                      showToast(t.photoRemoved)
                    }}
                  >
                    <span className="popover-item-lead">{t.removePhotoItem}</span>
                  </button>
                )}
              </>
            )}
            {menu === 'pair' &&
              PAIRS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`popover-item${p.id === pair?.id ? ' active' : ''}`}
                  onClick={() => {
                    setPair(p)
                    draftLocked.current = false
                    closeMenu()
                  }}
                >
                  {formatPairLabel(p, market)}
                  {p.id === pair?.id && <IconCheck />}
                </button>
              ))}
            {menu === 'market' &&
              MARKETS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`popover-item${m.id === market ? ' active' : ''}`}
                  onClick={() => {
                    setMarket(m.id)
                    const allowed = timeframesForMarket(m.id)
                    if (
                      timeframe &&
                      !allowed.some((tf) => tf.id === timeframe.id)
                    ) {
                      setTimeframe(null)
                    }
                    draftLocked.current = false
                    closeMenu()
                  }}
                >
                  {m.label}
                  {m.id === market && <IconCheck />}
                </button>
              ))}
            {menu === 'timeframe' &&
              timeframesForMarket(market).map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  className={`popover-item${tf.id === timeframe?.id ? ' active' : ''}`}
                  onClick={() => {
                    setTimeframe(tf)
                    draftLocked.current = false
                    closeMenu()
                  }}
                >
                  {tfLabel(tf)}
                  {tf.id === timeframe?.id && <IconCheck />}
                </button>
              ))}
            {menu === 'amount' &&
              AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`popover-item${a === amount ? ' active' : ''}`}
                  onClick={() => {
                    setAmount(a)
                    draftLocked.current = false
                    closeMenu()
                  }}
                >
                  ${a}
                  {a === amount && <IconCheck />}
                </button>
              ))}
          </div>
        </>
      )}

      <div className="toast-root" aria-live="polite" aria-atomic="true">
        {toast && (
          <div
            key={toast.id}
            className={`toast${toast.leaving ? ' toast-out' : ' toast-in'}`}
            role="status"
          >
            {toast.text}
          </div>
        )}
      </div>

      {historyOpen && (
        <div className="lang-modal" role="presentation">
          <button
            type="button"
            className="lang-modal-backdrop"
            aria-label={t.langClose}
            onClick={() => setHistoryOpen(false)}
          />
          <div
            className="lang-sheet history-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t.historyTitle}
          >
            <div className="lang-sheet-handle" aria-hidden />
            <header className="lang-sheet-head">
              <div>
                <h2>{t.historyTitle}</h2>
                <p>
                  {chats.length}/{MAX_CHATS}
                </p>
              </div>
              <button
                type="button"
                className="lang-sheet-close"
                aria-label={t.langClose}
                onClick={() => setHistoryOpen(false)}
              >
                <IconClose />
              </button>
            </header>

            <button
              type="button"
              className="history-new"
              disabled={busy || chats.length >= MAX_CHATS}
              onClick={createChat}
            >
              <IconPlus />
              <span>{t.historyNew}</span>
            </button>

            <div className="lang-list history-list" role="listbox">
              {[...chats]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((chat) => {
                  const active = chat.id === activeChatId
                  return (
                    <div
                      key={chat.id}
                      className={`history-item${active ? ' active' : ''}`}
                      role="option"
                      aria-selected={active}
                    >
                      <button
                        type="button"
                        className="history-item-main"
                        onClick={() => openChat(chat.id)}
                      >
                        <span className="history-item-icon" aria-hidden>
                          <IconChat />
                        </span>
                        <span className="history-item-copy">
                          <strong>{chat.title || t.chatUntitled}</strong>
                          <small>
                            {chat.messages.length
                              ? formatChatTime(chat.updatedAt, locale)
                              : t.historyEmpty}
                            {active ? ` · ${t.historyActive}` : ''}
                          </small>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="history-item-delete"
                        aria-label={t.historyDelete}
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteChat(chat.id)
                        }}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {langOpen && (
        <div className="lang-modal" role="presentation">
          <button
            type="button"
            className="lang-modal-backdrop"
            aria-label={t.langClose}
            onClick={() => setLangOpen(false)}
          />
          <div
            className="lang-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t.langTitle}
          >
            <div className="lang-sheet-handle" aria-hidden />
            <header className="lang-sheet-head">
              <div>
                <h2>{t.langTitle}</h2>
                <p>{localeMeta.native}</p>
              </div>
              <button
                type="button"
                className="lang-sheet-close"
                aria-label={t.langClose}
                onClick={() => setLangOpen(false)}
              >
                <IconClose />
              </button>
            </header>
            <div className="lang-list" role="listbox" aria-label={t.langTitle}>
              {LOCALES.map((item) => {
                const active = item.id === locale
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`lang-option${active ? ' active' : ''}`}
                    onClick={() => {
                      setLocale(item.id)
                      setLangOpen(false)
                      showToast(item.native)
                    }}
                  >
                    <span className="lang-option-flag" aria-hidden>
                      <img src={item.flag} alt="" />
                    </span>
                    <span className="lang-option-copy">
                      <strong>{item.native}</strong>
                      <small>{item.name}</small>
                    </span>
                    {active && (
                      <span className="lang-option-check" aria-hidden>
                        <IconCheck />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusGlyph({ kind }: { kind: StatusKind }) {
  if (kind === 'think') {
    return (
      <span className="status-orbit" aria-hidden>
        <i />
      </span>
    )
  }
  if (kind === 'type') {
    return (
      <span className="thinking-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
    )
  }
  return (
    <span className="status-scan" aria-hidden>
      <i />
    </span>
  )
}

function SignalBlock({
  signal,
  onRepeat,
  busy,
  locale,
}: {
  signal: FakeSignal
  onRepeat?: () => void
  busy?: boolean
  locale: Locale
}) {
  const t = dict(locale)
  const up = signal.direction === 'UP'
  const shine = up
    ? ['#34c759', 'color-mix(in srgb, var(--accent) 80%, #fff)', '#34c759']
    : ['#ff453a', 'color-mix(in srgb, var(--accent) 80%, #fff)', '#ff453a']

  return (
    <div className={`signal-card${up ? ' is-up' : ' is-down'}`}>
      <ShineBorder borderWidth={1} duration={10} shineColor={shine} />
      <div className="signal-body">
        <div className="signal-head">
          <span className={`signal-dir ${up ? 'up' : 'down'}`}>
            <i aria-hidden>{up ? '▲' : '▼'}</i>
            {up ? 'BUY' : 'SELL'}
          </span>
          <div
            className="signal-conf"
            title={t.confidence(signal.confidence)}
          >
            <svg className="signal-ring" viewBox="0 0 36 36" aria-hidden>
              <circle className="signal-ring-track" cx="18" cy="18" r="15" />
              <circle
                className="signal-ring-value"
                cx="18"
                cy="18"
                r="15"
                style={{
                  strokeDasharray: `${signal.confidence} 100`,
                }}
              />
            </svg>
            <strong>{signal.confidence}%</strong>
          </div>
        </div>

        <div className="signal-meta">
          <span>{signal.pair}</span>
          <span>{signal.timeframe}</span>
          <span>
            {signal.amount != null ? `$${signal.amount}` : '—'}
          </span>
        </div>

        <ul className="signal-points">
          {signal.points.slice(0, 2).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        {onRepeat && (
          <button
            type="button"
            className="signal-repeat"
            disabled={busy}
            onClick={onRepeat}
          >
            <IconRepeat />
            {t.repeatSignal}
          </button>
        )}
      </div>
    </div>
  )
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const Pill = forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode
    open?: boolean
    onClick: () => void
    chevronUp?: boolean
    className?: string
  }
>(function Pill({ children, open, onClick, chevronUp, className }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`pill${open ? ' open' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      <span className="pill-text">{children}</span>
      <IconChevron className="chev" up={chevronUp} />
    </button>
  )
})

function IconHistory() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v5l3 2" />
      <path d="M3.05 11a9 9 0 1 1 .5 4" />
      <path d="M3 16v-5h5" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.8 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.8-3.8-9S9.5 5.7 12 3z" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  )
}

function IconCandles() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 5v4" />
      <rect width="4" height="6" x="7" y="9" rx="1" />
      <path d="M9 15v2" />
      <path d="M17 3v2" />
      <rect width="4" height="8" x="15" y="5" rx="1" />
      <path d="M17 13v3" />
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    </svg>
  )
}

function IconChevron({ className, up }: { className?: string; up?: boolean }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ transform: up ? 'rotate(180deg)' : undefined }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function IconPaperclip() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.5 8.49a1.5 1.5 0 1 1-2.12-2.12l7.78-7.78" />
    </svg>
  )
}

function IconGallery() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  )
}

function IconRepeat() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function IconSignal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 3c-2.5 3.5-6 5-6 9a6 6 0 0 0 12 0c0-4-3.5-5.5-6-9z" />
      <path d="M10 14c.5 2 1.2 3 2 4 .8-1 1.5-2 2-4" />
    </svg>
  )
}

function IconPlan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M4 12h16M4 17h10" />
      <circle cx="18" cy="17" r="2.5" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  )
}
