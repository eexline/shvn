import { useEffect, useId, useRef } from 'react'
import {
  PAIRS,
  TIMEFRAMES,
  formatPairLabel,
  type Pair,
  type Timeframe,
} from './data'
import { dict, type Locale } from './i18n'
import {
  loadTradingViewScript,
  toTvInterval,
  toTvSymbol,
  tvLocale,
} from './tradingview'

type ChartsPaneProps = {
  pair: Pair | null
  timeframe: Timeframe | null
  locale: Locale
  onPair: (pair: Pair) => void
  onTimeframe: (tf: Timeframe) => void
  onAnalyze: () => void
}

export function ChartsPane({
  pair,
  timeframe,
  locale,
  onPair,
  onTimeframe,
  onAnalyze,
}: ChartsPaneProps) {
  const t = dict(locale)
  const reactId = useId().replace(/:/g, '')
  const containerId = `tv_chart_${reactId}`
  const widgetRef = useRef<{ remove?: () => void } | null>(null)
  const active = pair ?? PAIRS[0]
  const activeTf =
    timeframe && TIMEFRAMES.some((tf) => tf.id === timeframe.id)
      ? timeframe
      : TIMEFRAMES[2]

  useEffect(() => {
    if (!pair) onPair(PAIRS[0])
    if (!timeframe || !TIMEFRAMES.some((tf) => tf.id === timeframe.id)) {
      onTimeframe(TIMEFRAMES[2])
    }
    // intentionally once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    async function mount() {
      const el = document.getElementById(containerId)
      if (!el) return
      el.innerHTML = ''

      try {
        await loadTradingViewScript()
      } catch {
        if (!cancelled && el) {
          el.innerHTML = `<div class="charts-tv-error">${t.chartsLoadError}</div>`
        }
        return
      }
      if (cancelled || !window.TradingView?.widget) return

      widgetRef.current?.remove?.()
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: toTvSymbol(active),
        interval: toTvInterval(activeTf),
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: tvLocale(locale),
        toolbar_bg: '#0a0a0a',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: containerId,
        backgroundColor: 'rgba(0, 0, 0, 0)',
        gridColor: 'rgba(255, 255, 255, 0.06)',
        allow_symbol_change: false,
        details: false,
        hotlist: false,
        calendar: false,
        studies: [],
      })
    }

    void mount()

    return () => {
      cancelled = true
      try {
        widgetRef.current?.remove?.()
      } catch {
        /* ignore */
      }
      widgetRef.current = null
      const el = document.getElementById(containerId)
      if (el) el.innerHTML = ''
    }
  }, [containerId, active.id, activeTf.id, locale, t.chartsLoadError])

  return (
    <div className="pane charts-pane">
      <header className="charts-head">
        <div className="charts-head-text">
          <strong>{formatPairLabel(active, 'forex')}</strong>
          <span>
            {t.tf[activeTf.id]?.short ?? activeTf.short} · Forex ·{' '}
            {t.chartsLive}
          </span>
        </div>
        <button type="button" className="charts-analyze" onClick={onAnalyze}>
          {t.chartsAnalyze}
        </button>
      </header>

      <div className="charts-filters" aria-label={t.pair}>
        <div className="charts-chips">
          {PAIRS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`charts-chip${p.id === active.id ? ' on' : ''}`}
              onClick={() => onPair(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="charts-chips charts-chips-tf">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              type="button"
              className={`charts-chip${tf.id === activeTf.id ? ' on' : ''}`}
              onClick={() => onTimeframe(tf)}
            >
              {t.tf[tf.id]?.short ?? tf.short}
            </button>
          ))}
        </div>
      </div>

      <p className="charts-hint">{t.chartsForexOnly}</p>

      <div className="charts-tv-wrap">
        <div id={containerId} className="charts-tv" />
      </div>
    </div>
  )
}
