import type { PlanId } from './data'
import { buildExtraLocales } from './i18n-langs'

export const LOCALES = [
  { id: 'en', code: 'EN', name: 'English', native: 'English', flag: '/flags/en.svg' },
  { id: 'ru', code: 'RU', name: 'Russian', native: 'Русский', flag: '/flags/ru.svg' },
  { id: 'uk', code: 'UK', name: 'Ukrainian', native: 'Українська', flag: '/flags/uk.svg' },
  { id: 'es', code: 'ES', name: 'Spanish', native: 'Español', flag: '/flags/es.svg' },
  { id: 'pt', code: 'PT', name: 'Portuguese', native: 'Português', flag: '/flags/pt.svg' },
  { id: 'de', code: 'DE', name: 'German', native: 'Deutsch', flag: '/flags/de.svg' },
  { id: 'tr', code: 'TR', name: 'Turkish', native: 'Türkçe', flag: '/flags/tr.svg' },
  { id: 'zh', code: 'ZH', name: 'Chinese', native: '中文', flag: '/flags/zh.svg' },
] as const

export type Locale = (typeof LOCALES)[number]['id']

export type LocaleMeta = (typeof LOCALES)[number]

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.some((l) => l.id === value)
}

export function getLocaleMeta(id: Locale): LocaleMeta {
  return LOCALES.find((l) => l.id === id) ?? LOCALES[0]
}

type PlanCopy = {
  tagline: string
  features: string[]
}

export type Dict = {
  newAnalysis: string
  historyOpen: string
  historyTitle: string
  historyNew: string
  historyEmpty: string
  historyMax: string
  historyDelete: string
  historyActive: string
  chatUntitled: string
  langSwitch: string
  langTitle: string
  langClose: string
  chat: string
  charts: string
  chartsSoon: string
  chartsHint: string
  chartsAnalyze: string
  chartsPickPair: string
  chartsLive: string
  chartsForexOnly: string
  chartsLoadError: string
  forexClosed: string
  forexClosedHint: string
  pair: string
  market: string
  timeframe: string
  amount: string
  attach: string
  send: string
  removePhoto: string
  preview: string
  attachment: string
  placeholderParams: string
  placeholderPhoto: string
  navMain: string
  navSignal: string
  navPlan: string
  navProfile: string
  waitModel: string
  newAnalysisToast: string
  paramsReset: string
  alreadyNew: string
  needImage: string
  photoAttached: string
  photoRemoved: string
  paramsResetPick: string
  familyPlan: (family: string, plan: string) => string
  agentPlan: (agent: string, plan: string) => string
  familyAvailable: (family: string, plan: string) => string
  noAgents: (family: string, plan: string) => string
  imagePrompt: string
  analysisDone: (dir: string) => string
  analysisDoneImage: (dir: string) => string
  buyLabel: string
  sellLabel: string
  emptyTitle: string
  emptyBody: string
  planTitle: string
  planSub: string
  planNow: string
  planUntil: (name: string, amount: string) => string
  planMax: string
  deposit: string
  planActive: string
  planLocked: string
  planFrom: string
  session: string
  signals: string
  agent: string
  marketLabel: string
  model: string
  broker: string
  updated: string
  untilPlan: (name: string) => string
  pickGallery: string
  takePhoto: string
  removePhotoItem: string
  repeatSignal: string
  confidence: (n: number) => string
  updatedJustNow: string
  status: {
    think: string
    type: string
    analyze: string
    imgThink: string
    imgType: string
    imgAnalyze: string
  }
  tf: Record<string, { label: string; short: string }>
  plans: Record<PlanId, PlanCopy>
  buildPrompt: (bits: string) => string
  signal: {
    fromImage: string
    fromSnapshot: string
    bullish: string
    bearish: string
    explainImage: (agent: string, bias: string, pairPart: string) => string
    explainMarket: (
      agent: string,
      pair: string,
      tf: string,
      bias: string,
    ) => string
    pairFor: (pair: string) => string
    pointImage1: (r: string) => string
    pointImage2: (r: string) => string
    pointMarket1: (r: string) => string
    pointMarket2: (r: string) => string
    pointConf: (n: number) => string
    ups: string[]
    downs: string[]
  }
}

const tfEn = {
  '5s': { label: '5 seconds', short: '5s' },
  '10s': { label: '10 seconds', short: '10s' },
  '15s': { label: '15 seconds', short: '15s' },
  '30s': { label: '30 seconds', short: '30s' },
  '1m': { label: '1 minute', short: '1m' },
  '3m': { label: '3 minutes', short: '3m' },
  '5m': { label: '5 minutes', short: '5m' },
  '15m': { label: '15 minutes', short: '15m' },
  '60m': { label: '1 hour', short: '1H' },
}

export const en: Dict = {
  newAnalysis: 'New analysis',
  historyOpen: 'Chat history',
  historyTitle: 'History',
  historyNew: 'New chat',
  historyEmpty: 'No messages yet',
  historyMax: 'Maximum 3 chats',
  historyDelete: 'Delete chat',
  historyActive: 'Current',
  chatUntitled: 'New chat',
  langSwitch: 'Language',
  langTitle: 'Choose language',
  langClose: 'Close',
  chat: 'Chat',
  charts: 'Charts',
  chartsSoon: 'Charts coming soon',
  chartsHint: 'signals via chat for now',
  chartsAnalyze: 'Analyze in chat',
  chartsPickPair: 'Select a pair',
  chartsLive: 'Live',
  chartsForexOnly: 'Forex only — OTC pairs are not available here',
  chartsLoadError: 'Could not load the chart',
  forexClosed: 'Forex is closed for the weekend — signal unavailable',
  forexClosedHint: 'Switch to OTC to get a signal',
  pair: 'Pair',
  market: 'Market',
  timeframe: 'TF',
  amount: 'Amount',
  attach: 'Attach photo',
  send: 'Send',
  removePhoto: 'Remove photo',
  preview: 'Preview',
  attachment: 'Attachment',
  placeholderParams: 'Pick parameters and tap send',
  placeholderPhoto: 'Comment on the image (optional)…',
  navMain: 'Main navigation',
  navSignal: 'Signal',
  navPlan: 'Plan',
  navProfile: 'Profile',
  waitModel: 'Wait for the model reply',
  newAnalysisToast: 'New analysis',
  paramsReset: 'Parameters cleared',
  alreadyNew: 'Already a new chat',
  needImage: 'Image required',
  photoAttached: 'Photo attached',
  photoRemoved: 'Photo removed',
  paramsResetPick: 'Parameters cleared — pick a pair and TF',
  familyPlan: (family, plan) => `${family} family — ${plan} plan`,
  agentPlan: (agent, plan) => `${agent} — ${plan} plan`,
  familyAvailable: (family, plan) => `${family} unlocks on ${plan}`,
  noAgents: (family, plan) => `No ${family} agents on ${plan}`,
  imagePrompt:
    'Request: analyze market structure from the attached image. Produce a trade signal.',
  analysisDone: (dir) => `Analysis complete. Priority signal — ${dir}.`,
  analysisDoneImage: (dir) =>
    `Image analysis complete. Priority signal — ${dir}.`,
  buyLabel: 'BUY',
  sellLabel: 'SELL',
  emptyTitle: '',
  emptyBody:
    'Set the instrument, timeframe and size — or attach a chart screenshot for analysis.',
  planTitle: 'Plan',
  planSub: 'Grows with your broker deposit — no in-app payment',
  planNow: 'Now',
  planUntil: (name, amount) => `To ${name} · $${amount}`,
  planMax: 'Maxed out',
  deposit: 'Deposit',
  planActive: 'Active',
  planLocked: 'Locked',
  planFrom: 'from',
  session: 'Session',
  signals: 'Signals',
  agent: 'Agent',
  marketLabel: 'Market',
  model: 'Model',
  broker: 'Broker',
  updated: 'Updated',
  untilPlan: (name) => `To ${name}`,
  pickGallery: 'Choose from gallery',
  takePhoto: 'Take a photo',
  removePhotoItem: 'Remove photo',
  repeatSignal: 'Repeat signal',
  confidence: (n) => `Confidence ${n}%`,
  updatedJustNow: 'just now',
  status: {
    think: 'Processing request…',
    type: 'Collecting data…',
    analyze: 'Building signal…',
    imgThink: 'Uploading image…',
    imgType: 'Reading structure…',
    imgAnalyze: 'Analyzing snapshot…',
  },
  tf: tfEn,
  plans: {
    start: {
      tagline: 'Start exploring signals',
      features: [
        'Grok and the basic agent only',
        'Core currency pairs',
        '1m / 5m timeframes',
        'Up to 10 signals a day',
      ],
    },
    pro: {
      tagline: 'Daily trading workhorse',
      features: [
        'All families: Grok, GPT, Claude, Gemini',
        'Mid-tier agents for each model',
        'All timeframes and pairs',
        'Up to 100 signals a day',
        'Thinking mode',
      ],
    },
    elite: {
      tagline: 'Maximum speed and priority',
      features: [
        'Everything in Pro',
        'Flagship agents (Grok 4.6, GPT-6, Opus, Pro)',
        'Priority signal queue',
        'No daily limit',
        'Early access to new models',
      ],
    },
  },
  buildPrompt: (bits) => `Analyze ${bits} — produce a trade signal.`,
  signal: {
    fromImage: 'from image',
    fromSnapshot: 'from snapshot',
    bullish: 'bullish',
    bearish: 'bearish',
    explainImage: (agent, bias, pairPart) =>
      `${agent}: from the attached image a ${bias} scenario was formed${pairPart}. Demo estimate only — not investment advice.`,
    explainMarket: (agent, pair, tf, bias) =>
      `${agent}: on ${pair} (${tf}) the priority scenario is ${bias}. Demo estimate only — not investment advice.`,
    pairFor: (pair) => ` for ${pair}`,
    pointImage1: (r) => `On the image: ${r}.`,
    pointImage2: (r) => `Extra cue: ${r}.`,
    pointMarket1: (r) => `Market structure: ${r}.`,
    pointMarket2: (r) => `Confirmation: ${r}.`,
    pointConf: (n) => `Confidence score: ${n}%.`,
    ups: [
      'local support is holding',
      'short-term demand dominates',
      'price holds above the local average',
      'selling pressure has eased',
    ],
    downs: [
      'rejection from local resistance',
      'short-term supply dominates',
      'price holds below the local average',
      'demand looks limited',
    ],
  },
}

export const ru: Dict = {
  newAnalysis: 'Новый анализ',
  historyOpen: 'История чатов',
  historyTitle: 'История',
  historyNew: 'Новый чат',
  historyEmpty: 'Пока нет сообщений',
  historyMax: 'Максимум 3 чата',
  historyDelete: 'Удалить чат',
  historyActive: 'Текущий',
  chatUntitled: 'Новый чат',
  langSwitch: 'Язык',
  langTitle: 'Выберите язык',
  langClose: 'Закрыть',
  chat: 'Чат',
  charts: 'Графики',
  chartsSoon: 'Графики скоро',
  chartsHint: 'пока сигналы через чат',
  chartsAnalyze: 'Анализ в чат',
  chartsPickPair: 'Выберите пару',
  chartsLive: 'Онлайн',
  chartsForexOnly: 'Только Forex — OTC здесь недоступен',
  chartsLoadError: 'Не удалось загрузить график',
  forexClosed: 'Forex на выходных закрыт — сигнал недоступен',
  forexClosedHint: 'Переключитесь на OTC, чтобы получить сигнал',
  pair: 'Пара',
  market: 'Рынок',
  timeframe: 'ТФ',
  amount: 'Сумма',
  attach: 'Прикрепить фото',
  send: 'Отправить',
  removePhoto: 'Убрать фото',
  preview: 'Превью',
  attachment: 'Вложение',
  placeholderParams: 'Выберите параметры и нажмите отправить',
  placeholderPhoto: 'Комментарий к изображению (необязательно)…',
  navMain: 'Основная навигация',
  navSignal: 'Сигнал',
  navPlan: 'План',
  navProfile: 'Профиль',
  waitModel: 'Дождись ответа модели',
  newAnalysisToast: 'Новый анализ',
  paramsReset: 'Параметры сброшены',
  alreadyNew: 'Уже новый чат',
  needImage: 'Нужно изображение',
  photoAttached: 'Фото прикреплено',
  photoRemoved: 'Фото убрано',
  paramsResetPick: 'Параметры сброшены — выберите пару и ТФ',
  familyPlan: (family, plan) => `Семья ${family} — с тарифа ${plan}`,
  agentPlan: (agent, plan) => `${agent} — с тарифа ${plan}`,
  familyAvailable: (family, plan) => `${family} доступен с тарифа ${plan}`,
  noAgents: (family, plan) => `Нет агентов ${family} на тарифе ${plan}`,
  imagePrompt:
    'Запрос: анализ рыночной структуры по приложенному изображению. Сформируйте торговый сигнал.',
  analysisDone: (dir) => `Анализ завершён. Приоритетный сигнал — ${dir}.`,
  analysisDoneImage: (dir) =>
    `Анализ изображения завершён. Приоритетный сигнал — ${dir}.`,
  buyLabel: 'BUY (покупка)',
  sellLabel: 'SELL (продажа)',
  emptyTitle: '',
  emptyBody:
    'Укажите инструмент, таймфрейм и объём — либо приложите снимок графика для анализа.',
  planTitle: 'План',
  planSub: 'Растёт с депозитом на брокере — без оплаты в приложении',
  planNow: 'Сейчас',
  planUntil: (name, amount) => `До ${name} · $${amount}`,
  planMax: 'Максимум',
  deposit: 'Депозит',
  planActive: 'Активен',
  planLocked: 'Закрыт',
  planFrom: 'от',
  session: 'Сессия',
  signals: 'Сигналы',
  agent: 'Агент',
  marketLabel: 'Рынок',
  model: 'Модель',
  broker: 'Брокер',
  updated: 'Обновление',
  untilPlan: (name) => `До ${name}`,
  pickGallery: 'Выбрать из галереи',
  takePhoto: 'Сделать фото',
  removePhotoItem: 'Убрать фото',
  repeatSignal: 'Повторить сигнал',
  confidence: (n) => `Уверенность ${n}%`,
  updatedJustNow: 'только что',
  status: {
    think: 'Обработка запроса…',
    type: 'Сбор данных…',
    analyze: 'Формирование сигнала…',
    imgThink: 'Загрузка изображения…',
    imgType: 'Распознавание структуры…',
    imgAnalyze: 'Анализ по снимку…',
  },
  tf: {
    '5s': { label: '5 секунд', short: '5с' },
    '10s': { label: '10 секунд', short: '10с' },
    '15s': { label: '15 секунд', short: '15с' },
    '30s': { label: '30 секунд', short: '30с' },
    '1m': { label: '1 минута', short: '1м' },
    '3m': { label: '3 минуты', short: '3м' },
    '5m': { label: '5 минут', short: '5м' },
    '15m': { label: '15 минут', short: '15м' },
    '60m': { label: '1 час', short: '1H' },
  },
  plans: {
    start: {
      tagline: 'Старт для знакомства с сигналами',
      features: [
        'Только Grok и базовый агент',
        'Основные валютные пары',
        'Таймфреймы 1м / 5м',
        'До 10 сигналов в день',
      ],
    },
    pro: {
      tagline: 'Рабочий план для ежедневной торговли',
      features: [
        'Все семейства: Grok, GPT, Claude, Gemini',
        'Средние агенты каждой модели',
        'Все таймфреймы и пары',
        'До 100 сигналов в день',
        'Режим Thinking',
      ],
    },
    elite: {
      tagline: 'Максимум скорости и приоритета',
      features: [
        'Всё из Pro',
        'Флагманские агенты (Grok 4.6, GPT-6, Opus, Pro)',
        'Приоритетная очередь сигналов',
        'Без дневного лимита',
        'Ранний доступ к новым моделям',
      ],
    },
  },
  buildPrompt: (bits) => `Анализ ${bits} — сформируйте торговый сигнал.`,
  signal: {
    fromImage: 'по изображению',
    fromSnapshot: 'по снимку',
    bullish: 'бычий',
    bearish: 'медвежий',
    explainImage: (agent, bias, pairPart) =>
      `${agent}: по приложенному изображению сформирован ${bias} сценарий${pairPart}. Оценка носит демонстрационный характер и не является инвестиционной рекомендацией.`,
    explainMarket: (agent, pair, tf, bias) =>
      `${agent}: по ${pair} на интервале ${tf} приоритетный сценарий — ${bias}. Оценка демонстрационная, не является инвестиционной рекомендацией.`,
    pairFor: (pair) => ` для ${pair}`,
    pointImage1: (r) => `На изображении: ${r}.`,
    pointImage2: (r) => `Дополнительный признак: ${r}.`,
    pointMarket1: (r) => `Структура рынка: ${r}.`,
    pointMarket2: (r) => `Подтверждение: ${r}.`,
    pointConf: (n) => `Оценка уверенности: ${n}%.`,
    ups: [
      'локальная поддержка удерживается',
      'краткосрочный спрос преобладает',
      'цена закрепилась выше локальной средней',
      'давление предложения снизилось',
    ],
    downs: [
      'отражение от локального сопротивления',
      'краткосрочное предложение преобладает',
      'цена закрепилась ниже локальной средней',
      'спрос выглядит ограниченным',
    ],
  },
}

const DICTS: Record<Locale, Dict> = {
  en,
  ru,
  ...buildExtraLocales(en),
}

export function dict(locale: Locale): Dict {
  return DICTS[locale] ?? en
}

export function localeCode(locale: Locale): string {
  return getLocaleMeta(locale).code
}
