export type Pair = {
  id: string
  label: string
  name: string
}

export type Timeframe = {
  id: string
  label: string
  short: string
}

export type PlanId = 'start' | 'pro' | 'elite'

export type Agent = {
  id: string
  name: string
  available: boolean
  /** Минимальный тариф для доступа */
  minPlan: PlanId
}

export type ModelFamily = {
  id: 'grok' | 'gpt' | 'claude' | 'gemini'
  name: string
  product: string
  color: string
  minPlan: PlanId
  agents: Agent[]
}

export const PAIRS: Pair[] = [
  { id: 'eurusd', label: 'EUR/USD', name: 'евро доллар' },
  { id: 'gbpusd', label: 'GBP/USD', name: 'фунт доллар' },
  { id: 'usdjpy', label: 'USD/JPY', name: 'доллар йена' },
  { id: 'usdchf', label: 'USD/CHF', name: 'доллар франк' },
  { id: 'audusd', label: 'AUD/USD', name: 'австралийский доллар' },
  { id: 'usdcad', label: 'USD/CAD', name: 'доллар канадец' },
  { id: 'nzdusd', label: 'NZD/USD', name: 'новозеландский доллар' },
  { id: 'eurgbp', label: 'EUR/GBP', name: 'евро фунт' },
  { id: 'eurjpy', label: 'EUR/JPY', name: 'евро йена' },
  { id: 'gbpjpy', label: 'GBP/JPY', name: 'фунт йена' },
  { id: 'audjpy', label: 'AUD/JPY', name: 'австралиец йена' },
  { id: 'cadjpy', label: 'CAD/JPY', name: 'канадец йена' },
  { id: 'chfjpy', label: 'CHF/JPY', name: 'франк йена' },
  { id: 'nzdjpy', label: 'NZD/JPY', name: 'киви йена' },
  { id: 'euraud', label: 'EUR/AUD', name: 'евро австралиец' },
  { id: 'eurcad', label: 'EUR/CAD', name: 'евро канадец' },
  { id: 'eurchf', label: 'EUR/CHF', name: 'евро франк' },
  { id: 'eurnzd', label: 'EUR/NZD', name: 'евро киви' },
  { id: 'gbpaud', label: 'GBP/AUD', name: 'фунт австралиец' },
  { id: 'gbpcad', label: 'GBP/CAD', name: 'фунт канадец' },
  { id: 'gbpchf', label: 'GBP/CHF', name: 'фунт франк' },
  { id: 'gbpnzd', label: 'GBP/NZD', name: 'фунт киви' },
  { id: 'audcad', label: 'AUD/CAD', name: 'австралиец канадец' },
  { id: 'audchf', label: 'AUD/CHF', name: 'австралиец франк' },
  { id: 'audnzd', label: 'AUD/NZD', name: 'австралиец киви' },
  { id: 'nzdcad', label: 'NZD/CAD', name: 'киви канадец' },
  { id: 'nzdchf', label: 'NZD/CHF', name: 'киви франк' },
  { id: 'cadchf', label: 'CAD/CHF', name: 'канадец франк' },
  { id: 'xauusd', label: 'XAU/USD', name: 'золото' },
  { id: 'xagusd', label: 'XAG/USD', name: 'серебро' },
]

export const TIMEFRAMES: Timeframe[] = [
  { id: '1m', label: '1 минута', short: '1м' },
  { id: '5m', label: '5 минут', short: '5м' },
  { id: '15m', label: '15 минут', short: '15м' },
  { id: '60m', label: '1 hour', short: '1H' },
]

/** OTC: секунды + минуты; Forex: только минуты */
export const OTC_TIMEFRAMES: Timeframe[] = [
  { id: '5s', label: '5 секунд', short: '5с' },
  { id: '10s', label: '10 секунд', short: '10с' },
  { id: '15s', label: '15 секунд', short: '15с' },
  { id: '30s', label: '30 секунд', short: '30с' },
  ...TIMEFRAMES,
]

export function timeframesForMarket(market: MarketId | string): Timeframe[] {
  return market === 'otc' ? OTC_TIMEFRAMES : TIMEFRAMES
}

export const AMOUNTS = [5, 10, 25, 50, 100, 250]

export const MARKETS = [
  { id: 'otc', label: 'OTC' },
  { id: 'forex', label: 'Forex' },
] as const

export type MarketId = (typeof MARKETS)[number]['id']

/** OTC — приставка у пары; Forex — только тикер */
export function formatPairLabel(
  pair: Pair | null | undefined,
  market: MarketId | string,
): string {
  if (!pair) return ''
  return market === 'otc' ? `${pair.label} OTC` : pair.label
}

export type BrokerBalance = {
  real: number
  demo: number
  currency: string
  broker: string
  updatedAt: string
}

/** Имя брокера в профиле (сумма депозита приходит из postback_shahov) */
export const BROKER_NAME = 'Pocket Option'

export type Plan = {
  id: PlanId
  name: string
  minDeposit: number
  nextDeposit?: number
  tagline: string
  features: string[]
}

/** План повышается автоматически от депозита на брокере */
export const PLANS: Plan[] = [
  {
    id: 'start',
    name: 'Start',
    minDeposit: 0,
    nextDeposit: 50,
    tagline: 'Старт для знакомства с сигналами',
    features: [
      'Только Grok и базовый агент',
      'Основные валютные пары',
      'Таймфреймы 1м / 5м',
      'До 10 сигналов в день',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    minDeposit: 50,
    nextDeposit: 150,
    tagline: 'Рабочий план для ежедневной торговли',
    features: [
      'Все семейства: Grok, GPT, Claude, Gemini',
      'Средние агенты каждой модели',
      'Все таймфреймы и пары',
      'До 100 сигналов в день',
      'Режим Thinking',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    minDeposit: 150,
    tagline: 'Максимум скорости и приоритета',
    features: [
      'Всё из Pro',
      'Флагманские агенты (Grok 4.6, GPT-6, Opus, Pro)',
      'Приоритетная очередь сигналов',
      'Без дневного лимита',
      'Ранний доступ к новым моделям',
    ],
  },
]

export function planFromDeposit(deposit: number): Plan {
  let current = PLANS[0]
  for (const plan of PLANS) {
    if (deposit >= plan.minDeposit) current = plan
  }
  return current
}

export function nextPlan(plan: Plan): Plan | null {
  const idx = PLANS.findIndex((p) => p.id === plan.id)
  return idx >= 0 && idx < PLANS.length - 1 ? PLANS[idx + 1] : null
}

export const MODELS: ModelFamily[] = [
  {
    id: 'grok',
    name: 'Grok',
    product: 'xAI',
    color: '#ff6b4a',
    minPlan: 'start',
    agents: [
      { id: 'grok-4.6', name: 'Grok 4.6', available: true, minPlan: 'elite' },
      { id: 'grok-4.5', name: 'Grok 4.5', available: true, minPlan: 'pro' },
      { id: 'grok-4.3', name: 'Grok 4.3', available: true, minPlan: 'start' },
    ],
  },
  {
    id: 'gpt',
    name: 'GPT',
    product: 'ChatGPT',
    color: '#19c37d',
    minPlan: 'pro',
    agents: [
      { id: 'gpt-6-astra', name: 'GPT-6 Astra', available: true, minPlan: 'elite' },
      { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', available: true, minPlan: 'pro' },
      { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', available: true, minPlan: 'pro' },
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    product: 'Anthropic',
    color: '#ff8f6b',
    minPlan: 'pro',
    agents: [
      { id: 'claude-fable-5.1', name: 'Claude Fable 5.1', available: true, minPlan: 'elite' },
      { id: 'claude-opus-5', name: 'Claude Opus 5', available: true, minPlan: 'elite' },
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', available: true, minPlan: 'pro' },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    product: 'Google',
    color: '#4c8df6',
    minPlan: 'pro',
    agents: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', available: true, minPlan: 'pro' },
      { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', available: true, minPlan: 'elite' },
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', available: true, minPlan: 'pro' },
    ],
  },
]

const PLAN_RANK: Record<PlanId, number> = {
  start: 0,
  pro: 1,
  elite: 2,
}

export function planAllows(userPlan: PlanId, minPlan: PlanId): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[minPlan]
}

export function isFamilyUnlocked(family: ModelFamily, userPlan: PlanId): boolean {
  return planAllows(userPlan, family.minPlan)
}

export function isAgentUnlocked(agent: Agent, userPlan: PlanId): boolean {
  return agent.available && planAllows(userPlan, agent.minPlan)
}

export function planLabel(planId: PlanId): string {
  return PLANS.find((p) => p.id === planId)?.name ?? planId
}

export function findAgent(agentId: string) {
  for (const family of MODELS) {
    const agent = family.agents.find((a) => a.id === agentId)
    if (agent) return { family, agent }
  }
  return { family: MODELS[0], agent: MODELS[0].agents[0] }
}

/** Первый доступный агент для тарифа (fallback при смене плана) */
export function firstUnlockedAgent(userPlan: PlanId) {
  for (const family of MODELS) {
    if (!isFamilyUnlocked(family, userPlan)) continue
    const agent = family.agents.find((a) => isAgentUnlocked(a, userPlan))
    if (agent) return { family, agent }
  }
  return { family: MODELS[0], agent: MODELS[0].agents[2] }
}

export function buildPrompt(opts: {
  pair: Pair | null
  timeframe: Timeframe | null
  amount: number | null
  market: MarketId | string
  /** Localized short TF label; falls back to timeframe.short */
  timeframeShort?: string
  format?: (bits: string) => string
}): string {
  if (!opts.pair && !opts.timeframe && opts.amount == null) return ''

  const bits: string[] = []
  if (opts.pair) bits.push(formatPairLabel(opts.pair, opts.market))
  if (opts.timeframe)
    bits.push(opts.timeframeShort ?? opts.timeframe.short)
  if (opts.amount != null) bits.push(`$${opts.amount}`)
  if (opts.market === 'forex') bits.push('Forex')
  else if (!opts.pair) bits.push('OTC')

  const joined = bits.join(' · ')
  return opts.format
    ? opts.format(joined)
    : `Analyze ${joined} — produce a trade signal.`
}
