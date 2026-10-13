import { formatPairLabel, type Pair, type Timeframe } from './data'
import { dict, type Locale } from './i18n'

export type SignalDirection = 'UP' | 'DOWN'

export type FakeSignal = {
  direction: SignalDirection
  confidence: number
  pair: string
  timeframe: string
  amount: number | null
  entry: string
  explanation: string
  points: string[]
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fakePrice(pairId: string): number {
  const base: Record<string, number> = {
    eurusd: 1.0842,
    gbpusd: 1.2631,
    usdjpy: 149.82,
    usdchf: 0.8714,
    audusd: 0.6521,
    usdcad: 1.3588,
    nzdusd: 0.5984,
    eurgbp: 0.8582,
    eurjpy: 162.45,
    gbpjpy: 189.2,
    audjpy: 97.65,
    cadjpy: 110.32,
    chfjpy: 171.88,
    nzdjpy: 89.74,
    euraud: 1.662,
    eurcad: 1.473,
    eurchf: 0.9452,
    eurnzd: 1.812,
    gbpaud: 1.937,
    gbpcad: 1.717,
    gbpchf: 1.101,
    gbpnzd: 2.112,
    audcad: 0.886,
    audchf: 0.568,
    audnzd: 1.09,
    nzdcad: 0.813,
    nzdchf: 0.521,
    cadchf: 0.641,
    xauusd: 2348.5,
    xagusd: 27.84,
  }
  const b = base[pairId] ?? 1.1
  const jitter = b * (0.0004 + Math.random() * 0.0012)
  return b + (Math.random() > 0.5 ? jitter : -jitter)
}

function formatPrice(pairId: string, value: number): string {
  if (pairId === 'xauusd' || pairId === 'xagusd') return value.toFixed(2)
  if (pairId.endsWith('jpy')) return value.toFixed(3)
  return value.toFixed(5)
}

export function generateSignal(opts: {
  pair: Pair | null
  timeframe: Timeframe | null
  amount: number | null
  market?: string
  agentName: string
  fromImage?: boolean
  locale?: Locale
}): FakeSignal {
  const t = dict(opts.locale ?? 'en')
  const direction: SignalDirection = Math.random() > 0.5 ? 'UP' : 'DOWN'
  const confidence = 62 + Math.floor(Math.random() * 28)
  const pairLabel =
    formatPairLabel(opts.pair, opts.market ?? 'forex') || t.signal.fromImage
  const tfMeta = opts.timeframe
    ? (t.tf[opts.timeframe.id] ?? {
        label: opts.timeframe.label,
        short: opts.timeframe.short,
      })
    : null
  const tfLabel = tfMeta?.label ?? t.signal.fromSnapshot
  const entryNum = fakePrice(opts.pair?.id ?? 'eurusd')
  const reasons = direction === 'UP' ? t.signal.ups : t.signal.downs
  const r1 = pick(reasons)
  const r2 = pick(reasons.filter((r) => r !== r1))
  const bias =
    direction === 'UP' ? t.signal.bullish : t.signal.bearish

  const explanation = opts.fromImage
    ? t.signal.explainImage(
        opts.agentName,
        bias,
        opts.pair ? t.signal.pairFor(pairLabel) : '',
      )
    : t.signal.explainMarket(opts.agentName, pairLabel, tfLabel, bias)

  return {
    direction,
    confidence,
    pair: pairLabel,
    timeframe: tfMeta?.short ?? tfLabel,
    amount: opts.amount,
    entry: formatPrice(opts.pair?.id ?? 'eurusd', entryNum),
    explanation,
    points: opts.fromImage
      ? [
          t.signal.pointImage1(r1),
          t.signal.pointImage2(r2),
          t.signal.pointConf(confidence),
        ]
      : [
          t.signal.pointMarket1(r1),
          t.signal.pointMarket2(r2),
          t.signal.pointConf(confidence),
        ],
  }
}

export function statusSteps(locale: Locale, fromImage: boolean) {
  const t = dict(locale)
  if (fromImage) {
    return [
      { id: 'think', label: t.status.imgThink, kind: 'think' as const },
      { id: 'type', label: t.status.imgType, kind: 'type' as const },
      { id: 'analyze', label: t.status.imgAnalyze, kind: 'analyze' as const },
    ]
  }
  return [
    { id: 'think', label: t.status.think, kind: 'think' as const },
    { id: 'type', label: t.status.type, kind: 'type' as const },
    { id: 'analyze', label: t.status.analyze, kind: 'analyze' as const },
  ]
}

/** @deprecated use statusSteps(locale, false) */
export const STATUS_STEPS = statusSteps('en', false)
/** @deprecated use statusSteps(locale, true) */
export const IMAGE_STATUS_STEPS = statusSteps('en', true)
