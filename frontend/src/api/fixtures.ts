/**
 * Fixture payloads for the MunshiJi companion screen.
 *
 * These exist so the screen is fully presentable with **no backend running** — `npm run dev`
 * shows the complete demo today, and the same components go live the moment the API answers.
 *
 * Everything here matches `backend/munshiji/schemas/*.py` field-for-field.
 *
 * The story the numbers tell (agreed demo script):
 *   • collection today ~12% below the weekday baseline
 *   • 14 dormant regulars worth ~₹4,333 recoverable, 10 of them contactable
 *   • 3 dead-stock SKUs with ₹4,200 locked
 *   • ₹11,300 of open udhaar, 4 entries past 60 days
 *   • a PENDING "send ₹50 win-back offer to 12 customers" action
 *   • an EXECUTED earlier offer: 12 sent · 4 returned · ₹2,340 recovered, with its graph edges
 *
 * NOTE ON MONEY: `inr()` / `inrShort()` below mirror `backend/munshiji/money.py` purely to
 * *synthesise* fixture payloads — they stand in for the server. No component ever calls them;
 * the UI only ever renders `Money.display` / `Money.short`.
 */

import type {
  ActionListOut,
  ActionOut,
  DashboardOut,
  GraphEdgeOut,
  GraphNodeOut,
  GraphOut,
  HealthOut,
  InsightListOut,
  InsightOut,
  Meta,
  Money,
  PaymentMixSlice,
  SparkPoint,
  ToolCallOut,
  MerchantHealthOut,
} from './types'

export const FIXTURE_MERCHANT_ID = 'mer_01JSHARMA0GENERAL0STORE'

/* ------------------------------------------------------- money (fixture-side only) */

function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits
  let head = digits.slice(0, -3)
  const tail = digits.slice(-3)
  const chunks: string[] = []
  while (head.length > 2) {
    chunks.unshift(head.slice(-2))
    head = head.slice(0, -2)
  }
  if (head) chunks.unshift(head)
  return `${chunks.join(',')},${tail}`
}

function inr(amountPaise: number): string {
  const sign = amountPaise < 0 ? '-' : ''
  const magnitude = Math.abs(Math.round(amountPaise))
  const whole = Math.floor(magnitude / 100)
  const remainder = magnitude % 100
  const body = groupIndian(String(whole))
  return `${sign}₹${remainder ? `${body}.${String(remainder).padStart(2, '0')}` : body}`
}

function inrShort(amountPaise: number): string {
  const sign = amountPaise < 0 ? '-' : ''
  const magnitude = Math.abs(Math.round(amountPaise))
  const trim = (value: number, suffix: string): string =>
    `${sign}₹${value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}${suffix}`
  if (magnitude >= 1_000_000_000) return trim(magnitude / 1_000_000_000, 'Cr')
  if (magnitude >= 10_000_000) return trim(magnitude / 10_000_000, 'L')
  if (magnitude >= 100_000) return trim(magnitude / 100_000, 'K')
  return inr(amountPaise)
}

/** Build a `Money` exactly as `schemas/common.py::money()` would. */
export function fixtureMoney(amountPaise: number): Money {
  const paise = Math.round(amountPaise)
  return { paise, display: inr(paise), short: inrShort(paise) }
}

/* ------------------------------------------------------------------ IST calendar */

const IST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const IST_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAY_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार']
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Today's IST calendar date as `YYYY-MM-DD`. */
export function istToday(): string {
  return IST_DATE.format(new Date())
}

/** Minutes since midnight, IST. */
function istMinutes(): number {
  const [hours, minutes] = IST_TIME.format(new Date()).split(':').map(Number)
  return (hours ?? 12) * 60 + (minutes ?? 0)
}

function dayOffset(isoDay: string, days: number): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  const at = new Date(Date.UTC(y, (m ?? 1) - 1, d))
  at.setUTCDate(at.getUTCDate() + days)
  return at.toISOString().slice(0, 10)
}

function dayOfWeek(isoDay: string): number {
  const [y, m, d] = isoDay.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d)).getUTCDay()
}

/** An IST-offset ISO timestamp `minutesAgo` in the past — what the API emits. */
function istStamp(minutesAgo = 0): string {
  const at = new Date(Date.now() - minutesAgo * 60_000)
  const istMillis = at.getTime() + 5.5 * 3600_000
  return `${new Date(istMillis).toISOString().slice(0, 23)}+05:30`
}

/* ---------------------------------------------------------- deterministic series */

/** mulberry32 — seeded so every reload of the demo shows the identical sparkline. */
function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Weekday collection baseline in paise — Sat/Sun ~1.35x, Tue lowest (SPEC §6.1). */
const WEEKDAY_BASELINE_PAISE = [2_405_000, 1_813_000, 1_572_000, 1_757_000, 1_850_000, 1_998_000, 2_497_000]

/** Bimodal intraday share of the day's take, for hours 07:00–22:00 (SPEC §6.2). */
const INTRADAY_SHARE = [
  0.02, 0.06, 0.08, 0.09, 0.07, 0.05, 0.04, 0.03, 0.04, 0.05, 0.08, 0.1, 0.11, 0.09, 0.06, 0.03,
]

/** Share of the day's collection that should already be in, at the current IST minute. */
function dayProgress(): number {
  const minutes = istMinutes()
  const openMinutes = 7 * 60
  const closeMinutes = 22 * 60
  if (minutes <= openMinutes) return 0.34
  if (minutes >= closeMinutes) return 0.96
  let cumulative = 0
  for (let hour = 7; hour < 22; hour += 1) {
    const slice = INTRADAY_SHARE[hour - 7] ?? 0
    const hourStart = hour * 60
    if (minutes >= hourStart + 60) {
      cumulative += slice
    } else {
      cumulative += slice * ((minutes - hourStart) / 60)
      break
    }
  }
  return Math.min(0.96, Math.max(0.34, cumulative))
}

const DELTA_PCT = -12.3
const PROJECTION_RATIO = 1 + DELTA_PCT / 100

export interface TodayFigures {
  day: string
  dow: number
  baselinePaise: number
  projectedPaise: number
  collectedPaise: number
  progress: number
  transactions: number
  averageTicketPaise: number
  uniqueCustomers: number
}

/** Round to whole rupees — a kirana's totals are never quoted in paise. */
function toRupees(paise: number): number {
  return Math.round(paise / 100) * 100
}

/** The single source of truth for every "today" number in the fixtures. */
export function todayFigures(): TodayFigures {
  const day = istToday()
  const dow = dayOfWeek(day)
  const baselinePaise = WEEKDAY_BASELINE_PAISE[dow] ?? 1_850_000
  const projectedPaise = toRupees(baselinePaise * PROJECTION_RATIO)
  const progress = dayProgress()
  const collectedPaise = toRupees(projectedPaise * progress)
  const transactions = Math.max(1, Math.round(collectedPaise / 24_700))
  return {
    day,
    dow,
    baselinePaise,
    projectedPaise,
    collectedPaise,
    progress,
    transactions,
    averageTicketPaise: toRupees(collectedPaise / transactions),
    uniqueCustomers: Math.round(transactions * 0.72),
  }
}

function meta(provider = 'local', latencyMs = 0): Meta {
  return { provider, latency_ms: latencyMs, as_of: istStamp(), extra: {} }
}

/* ------------------------------------------------------------------------ health */

export function fixtureHealth(): HealthOut {
  return {
    status: 'ok',
    version: '1.0.0',
    env: 'dev',
    provider_mode: 'auto',
    providers: [
      { name: 'sarvam-stt', kind: 'stt', mode: 'local', ok: true, detail: 'offline saaras fallback', latency_ms: 210 },
      { name: 'sarvam-llm', kind: 'llm', mode: 'local', ok: true, detail: 'local intent + template Hinglish', latency_ms: 380 },
      { name: 'sarvam-tts', kind: 'tts', mode: 'local', ok: true, detail: 'browser speechSynthesis', latency_ms: 60 },
      { name: 'cognee', kind: 'memory', mode: 'local', ok: true, detail: 'local graph + BM25 retrieval', latency_ms: 34 },
      { name: 'n8n', kind: 'actions', mode: 'local', ok: true, detail: 'local action runner', latency_ms: 48 },
    ],
    sponsors: { sarvam: 'local', cognee: 'local', n8n: 'local' },
    database_ready: true,
    merchant_id: FIXTURE_MERCHANT_ID,
    checked_at: istStamp(),
  }
}

/* --------------------------------------------------------------------- dashboard */

function sparkline(figures: TodayFigures): SparkPoint[] {
  const random = rng(20260919)
  const points: SparkPoint[] = []
  for (let back = 13; back >= 0; back -= 1) {
    const day = dayOffset(figures.day, -back)
    const dow = dayOfWeek(day)
    const base = WEEKDAY_BASELINE_PAISE[dow] ?? 1_850_000
    const jitter = 0.92 + random() * 0.17
    // The soft collection dip of the last week — this is what the anomaly engine finds.
    const dip = back <= 6 ? 0.93 : 1
    const collection = back === 0 ? figures.collectedPaise : toRupees(base * jitter * dip)
    points.push({
      day,
      weekday: WEEKDAY_SHORT[dow] ?? '',
      collection: fixtureMoney(collection),
      transactions: Math.max(1, Math.round(collection / 24_700)),
      is_today: back === 0,
    })
  }
  return points
}

function paymentMix(collectedPaise: number): PaymentMixSlice[] {
  const shares: Array<[string, number]> = [
    ['upi', 52.4],
    ['cash', 20.9],
    ['soundbox', 17.8],
    ['card', 5.6],
    ['wallet', 3.3],
  ]
  let assigned = 0
  return shares.map(([method, share], index) => {
    const isLast = index === shares.length - 1
    const amount = isLast ? collectedPaise - assigned : toRupees((collectedPaise * share) / 100)
    assigned += amount
    return { method, share_pct: share, amount: fixtureMoney(amount) }
  })
}

export function fixtureDashboard(): DashboardOut {
  const figures = todayFigures()
  return {
    merchant: {
      id: FIXTURE_MERCHANT_ID,
      owner_name: 'Ramesh Sharma',
      shop_name: 'Sharma General Store',
      category: 'kirana',
      city: 'New Delhi',
      locality: 'Lajpat Nagar II',
      language: 'hi-IN',
      phone: '+91 98110 42117',
      soundbox_id: 'SB-DEL-88214',
      business_hours_start: 7,
      business_hours_end: 22,
    },
    today: {
      day: figures.day,
      weekday_en: WEEKDAY_EN[figures.dow] ?? '',
      weekday_hi: WEEKDAY_HI[figures.dow] ?? '',
      collected: fixtureMoney(figures.collectedPaise),
      transactions: figures.transactions,
      unique_customers: figures.uniqueCustomers,
      average_ticket: fixtureMoney(figures.averageTicketPaise),
      projected_close: fixtureMoney(figures.projectedPaise),
      projection_confidence: 0.81,
      baseline: fixtureMoney(figures.baselinePaise),
      delta_pct: DELTA_PCT,
      robust_z: -2.14,
      day_progress: figures.progress,
      is_too_early_to_project: false,
    },
    sparkline: sparkline(figures),
    payment_mix: paymentMix(figures.collectedPaise),
    open_udhaar: fixtureMoney(1_130_000),
    open_udhaar_count: 18,
    low_stock_count: 3,
    dormant_customer_count: 12,
    pending_action_count: 2,
    generated_at: istStamp(),
    meta: meta('local', 41),
  }
}

/* ---------------------------------------------------------------------- insights */

export function fixtureInsights(): InsightListOut {
  const figures = todayFigures()
  const gapPaise = figures.baselinePaise - figures.projectedPaise
  const weekdayHi = WEEKDAY_HI[figures.dow] ?? ''
  const weekdayEn = WEEKDAY_EN[figures.dow] ?? ''

  const insights: InsightOut[] = [
    {
      id: 'ins_01JDORMANT12',
      kind: 'dormant_customers',
      severity: 'high',
      title_hi: '14 पुराने ग्राहक चार हफ़्ते से नहीं आए',
      title_en: '14 regulars have not visited in over four weeks',
      body_hi:
        'हर ग्राहक की अपनी आने की आदत के हिसाब से नापा है, 30 दिन के एक ही नियम से नहीं। इन चौदह ने पिछले 90 दिन में ₹28,600 की ख़रीद की थी। वापसी की उम्मीद ₹4,333 है।',
      body_en:
        'Measured against each customer’s own visit cadence (median gap + 1.5×IQR), not a flat 30-day rule. These fourteen spent ₹28,600 in the last 90 days; expected recoverable value is ₹4,333.',
      metrics: {
        dormant_count: 14,
        recoverable_paise: 433_322,
        median_gap_days: 9.4,
        days_since_last: 31,
        spend_90d_paise: 2_860_000,
        p_return: 0.34,
      },
      suggested_tool: 'send_winback_offer',
      suggested_params: { segment: 'dormant', offer_paise: 5000, channel: 'whatsapp', customer_count: 12 },
      impact: fixtureMoney(433_322),
      confidence: 0.78,
      score: 94.2,
      status: 'open',
      created_at: istStamp(46),
    },
    {
      id: 'ins_01JUDHAAR60',
      kind: 'udhaar_overdue',
      severity: 'critical',
      title_hi: '₹11,300 उधार बाकी — 4 खाते 60 दिन से ऊपर',
      title_en: '₹11,300 of open udhaar — 4 accounts past 60 days',
      body_hi:
        '60+ दिन वाले चार खातों में ₹4,850 फँसा है, सबसे पुराना 78 दिन का। चार में से तीन का चुकाने का रिकॉर्ड अच्छा है, इसलिए लहज़ा standard रखा है — सख़्त नहीं।',
      body_en:
        'Four accounts past 60 days hold ₹4,850, the oldest at 78 days. Three of the four have a good settle history, so the tone ladder selects STANDARD, not FIRM.',
      metrics: {
        open_paise: 1_130_000,
        open_count: 18,
        bucket_60_plus_paise: 485_000,
        bucket_60_plus_count: 4,
        oldest_days: 78,
        recovery_rate: 0.62,
      },
      suggested_tool: 'send_udhaar_reminder',
      suggested_params: { bucket: '60_plus', tone: 'standard', entry_count: 4 },
      impact: fixtureMoney(485_000),
      confidence: 0.86,
      score: 91.6,
      status: 'open',
      created_at: istStamp(46),
    },
    {
      id: 'ins_01JANOMALY',
      kind: 'collection_anomaly',
      severity: 'high',
      title_hi: `आज की वसूली ${weekdayHi} के औसत से 12% कम`,
      title_en: `Collection is tracking 12% below the ${weekdayEn} baseline`,
      body_hi: `पिछले 8 हफ़्तों के ${weekdayHi} का median ${inr(figures.baselinePaise)} है (MAD से नापा)। अभी तक ${inr(
        figures.collectedPaise,
      )} आया है — इस रफ़्तार से दिन ${inr(figures.projectedPaise)} पर बंद होगा। robust z = −2.14।`,
      body_en: `Median of the last eight ${weekdayEn}s is ${inr(
        figures.baselinePaise,
      )} (robust, MAD-scaled). ${inr(figures.collectedPaise)} in so far; the intraday curve projects a ${inr(
        figures.projectedPaise,
      )} close. Robust z = −2.14.`,
      metrics: {
        collected_paise: figures.collectedPaise,
        baseline_paise: figures.baselinePaise,
        projected_close_paise: figures.projectedPaise,
        delta_pct: DELTA_PCT,
        robust_z: -2.14,
        day_progress: Number(figures.progress.toFixed(2)),
        baseline_weeks: 8,
      },
      suggested_tool: 'compare_sales',
      suggested_params: { period: 'today', against: 'weekday_baseline', weeks: 8 },
      impact: fixtureMoney(gapPaise),
      confidence: 0.81,
      score: 88.4,
      status: 'open',
      created_at: istStamp(12),
    },
    {
      id: 'ins_01JDEADSTOCK',
      kind: 'dead_stock',
      severity: 'medium',
      title_hi: '3 SKU में ₹4,200 फँसा है — 45 दिन से बिक्री नहीं',
      title_en: '₹4,200 of capital locked in 3 dead SKUs',
      body_hi:
        'Everest गरम मसाला 500g, Nivea सॉफ्ट 200ml और Lays क्रीम-अनियन फैमिली पैक — 45+ दिन से एक भी नहीं बिका। दिवाली से पहले combo में निकाल दें तो पैसा वापस चलेगा।',
      body_en:
        'Everest Garam Masala 500g, Nivea Soft 200ml and Lays Cream & Onion family pack have not sold in 45+ days. Bundling them before Diwali releases the working capital.',
      metrics: {
        sku_count: 3,
        capital_locked_paise: 420_000,
        days_since_last_sale: 52,
        worst_sku: 'Nivea Soft 200ml',
        worst_sku_locked_paise: 186_000,
      },
      suggested_tool: 'get_product_performance',
      suggested_params: { skus: ['EVR-GM-500', 'NIV-SOFT-200', 'LAY-CO-FAM'], window_days: 60 },
      impact: fixtureMoney(420_000),
      confidence: 0.92,
      score: 72.1,
      status: 'open',
      created_at: istStamp(46),
    },
    {
      id: 'ins_01JSTOCKOUT',
      kind: 'stockout_risk',
      severity: 'medium',
      title_hi: 'आटा और रिफ़ाइंड तेल शनिवार से पहले ख़त्म',
      title_en: 'Atta and refined oil run out before the weekend',
      body_hi:
        'Aashirvaad आटा 5kg का cover 1.8 दिन का बचा है, Fortune तेल 1L का 2.1 दिन। सप्लायर का lead time 2 दिन है और शनिवार 1.35× चलता है — आज ऑर्डर करना होगा।',
      body_en:
        'Aashirvaad Atta 5kg has 1.8 days of cover, Fortune Refined 1L has 2.1 — against a 2-day supplier lead time and a 1.35× Saturday uplift. The order has to go today.',
      metrics: {
        sku_count: 2,
        min_days_of_cover: 1.8,
        lead_time_days: 2,
        weekend_uplift: 1.35,
        lost_sale_paise: 260_000,
      },
      suggested_tool: 'draft_restock_order',
      suggested_params: { skus: ['ASH-ATTA-5', 'FOR-RFD-1L'], cover_days: 7 },
      impact: fixtureMoney(260_000),
      confidence: 0.74,
      score: 64.8,
      status: 'open',
      created_at: istStamp(46),
    },
    {
      id: 'ins_01JMARGIN',
      kind: 'margin_leak',
      severity: 'low',
      title_hi: 'डेयरी का मार्जिन तीन हफ़्ते में 14% से 11% पर',
      title_en: 'Dairy margin slipped from 14% to 11% in three weeks',
      body_hi:
        'दूध और पनीर की लागत बढ़ी है पर बिक्री का भाव वही है। हफ़्ते का नुक़सान करीब ₹1,800 का है।',
      body_en:
        'Milk and paneer landed cost rose while the shelf price held. The leak is running at about ₹1,800 a week.',
      metrics: {
        category: 'dairy',
        margin_now_pct: 11.2,
        margin_before_pct: 14.1,
        weekly_leak_paise: 180_000,
        sku_count: 6,
      },
      suggested_tool: 'get_product_performance',
      suggested_params: { category: 'dairy', window_days: 21 },
      impact: fixtureMoney(180_000),
      confidence: 0.69,
      score: 55.3,
      status: 'open',
      created_at: istStamp(46),
    },
    {
      id: 'ins_01JPEAKHOUR',
      kind: 'peak_hour',
      severity: 'info',
      title_hi: 'शाम 7–8 बजे दिन की 22% बिक्री होती है',
      title_en: 'The 7–8pm hour carries 22% of the day',
      body_hi: 'दूसरा peak सुबह 9 बजे है। स्टाफ़ और stock उसी हिसाब से लगाएँ।',
      body_en: 'A second, smaller peak sits at 9am. Staffing and shelf-filling should follow this curve.',
      metrics: { peak_hour: 19, peak_share_pct: 21.6, second_peak_hour: 9, second_peak_share_pct: 8.4 },
      suggested_tool: null,
      suggested_params: {},
      impact: fixtureMoney(0),
      confidence: 0.95,
      score: 41.2,
      status: 'open',
      created_at: istStamp(46),
    },
  ]

  const totalImpact = insights.reduce((sum, insight) => sum + insight.impact.paise, 0)
  return { insights, total_impact: fixtureMoney(totalImpact), meta: meta('local', 63) }
}

/* ----------------------------------------------------------------------- actions */

export function fixtureActions(): ActionListOut {
  const actions: ActionOut[] = [
    {
      id: 'act_01JWINBACK02',
      tool_name: 'send_winback_offer',
      status: 'pending_approval',
      summary_hi: '10 ग्राहकों को 10% का ऑफ़र, 7 दिन के लिए',
      summary_en: 'Send a 10% win-back offer to 10 customers (valid 7 days)',
      params: {
        segment: 'dormant',
        discount_pct: 10,
        channel: 'whatsapp',
        customer_count: 10,
        template: 'winback_v3',
        message_hi: 'नमस्ते {{name}} जी — बहुत दिन हो गए! इस हफ़्ते शर्मा जनरल स्टोर पर आपके लिए 10% की छूट।',
        valid_days: 7,
      },
      // The dormancy engine found fourteen; four had never consented to marketing, so the offer
      // goes to ten. Marketing templates bill at 78 paise, hence 10 x 78 = 780.
      target_count: 10,
      estimated_impact: fixtureMoney(121_843),
      estimated_cost: fixtureMoney(780),
      net_expected: fixtureMoney(121_063),
      requested_at: istStamp(3),
      decided_at: null,
      executed_at: null,
      provider: 'local',
      error: '',
      result: {
        compliance: {
          allowed_count: 10,
          refused_count: 4,
          blocked: false,
          rules_applied: ['send_window', 'consent', 'template_category'],
          refusals: [
            {
              customer_id: 'cus_fx_dormant_03',
              name: 'Zubair Arora',
              rule: 'no_marketing_consent',
              reason_en: 'No marketing consent on file for Zubair Arora.',
              reason_hi: 'Zubair Arora ki prachar ke liye anumati nahi hai.',
            },
            {
              customer_id: 'cus_fx_dormant_07',
              name: 'Anjali Khan',
              rule: 'no_marketing_consent',
              reason_en: 'No marketing consent on file for Anjali Khan.',
              reason_hi: 'Anjali Khan ki prachar ke liye anumati nahi hai.',
            },
            {
              customer_id: 'cus_fx_dormant_11',
              name: 'Usha Singh',
              rule: 'opted_out',
              reason_en: 'Usha Singh has opted out of messages.',
              reason_hi: 'Usha Singh ne sandesh band karwa diye hain.',
            },
            {
              customer_id: 'cus_fx_dormant_12',
              name: 'Preeti Bhatia',
              rule: 'no_marketing_consent',
              reason_en: 'No marketing consent on file for Preeti Bhatia.',
              reason_hi: 'Preeti Bhatia ki prachar ke liye anumati nahi hai.',
            },
          ],
        },
      },
      outcomes: [],
      requires_approval: true,
    },
    {
      id: 'act_01JUDHAAR02',
      tool_name: 'send_udhaar_reminder',
      status: 'pending_approval',
      summary_hi: '60 दिन से ऊपर वाले 4 खातों को नरम याद दिलाएँ',
      summary_en: 'Send a standard-tone reminder to 4 accounts past 60 days',
      params: {
        bucket: '60_plus',
        tone: 'standard',
        entry_count: 4,
        channel: 'whatsapp',
        rate_limit: '1 per khata entry per 7 days',
      },
      target_count: 4,
      estimated_impact: fixtureMoney(485_000),
      estimated_cost: fixtureMoney(48),
      net_expected: fixtureMoney(484952),
      requested_at: istStamp(9),
      decided_at: null,
      executed_at: null,
      provider: 'local',
      error: '',
      result: {},
      outcomes: [],
      requires_approval: true,
    },
    {
      id: 'act_01JWINBACK01',
      tool_name: 'send_winback_offer',
      status: 'executed',
      summary_hi: '10 ग्राहकों को 10% का ऑफ़र भेजा गया',
      summary_en: '10% win-back offer sent to 10 customers',
      params: { segment: 'dormant', discount_pct: 10, channel: 'whatsapp', customer_count: 10, template: 'winback_v2' },
      target_count: 10,
      estimated_impact: fixtureMoney(121_843),
      estimated_cost: fixtureMoney(780),
      net_expected: fixtureMoney(121_063),
      requested_at: istStamp(7 * 24 * 60 + 26),
      decided_at: istStamp(7 * 24 * 60 + 24),
      executed_at: istStamp(7 * 24 * 60 + 23),
      provider: 'local',
      error: '',
      result: { workflow: 'winback_offer_v2', run_id: 'run_local_8831', sent: 10, failed: 0 },
      outcomes: [
        { metric: 'messages_sent', value_num: 12, value: null, note: '12 bheje', observed_at: istStamp(7 * 24 * 60) },
        { metric: 'customers_returned', value_num: 4, value: null, note: '4 laut aaye', observed_at: istStamp(2 * 24 * 60) },
        {
          metric: 'revenue_recovered',
          value_num: null,
          value: fixtureMoney(234_000),
          note: '₹2,340 wapas aaye',
          observed_at: istStamp(2 * 24 * 60),
        },
      ],
      requires_approval: false,
    },
    {
      id: 'act_01JUDHAAR01',
      tool_name: 'send_udhaar_reminder',
      status: 'executed',
      summary_hi: '6 खातों को नरम लहज़े में याद दिलाया गया',
      summary_en: 'Gentle-tone reminder sent to 6 khata accounts',
      params: { bucket: '31_60', tone: 'gentle', entry_count: 6, channel: 'whatsapp' },
      target_count: 6,
      estimated_impact: fixtureMoney(310_000),
      estimated_cost: fixtureMoney(72),
      net_expected: fixtureMoney(309928),
      requested_at: istStamp(12 * 24 * 60 + 40),
      decided_at: istStamp(12 * 24 * 60 + 38),
      executed_at: istStamp(12 * 24 * 60 + 37),
      provider: 'local',
      error: '',
      result: { workflow: 'udhaar_reminder_v1', run_id: 'run_local_8620', sent: 6, failed: 0 },
      outcomes: [
        { metric: 'reminders_sent', value_num: 6, value: null, note: '6 yaad dilaye', observed_at: istStamp(12 * 24 * 60) },
        { metric: 'accounts_settled', value_num: 3, value: null, note: '3 ne chuka diya', observed_at: istStamp(5 * 24 * 60) },
        {
          metric: 'amount_recovered',
          value_num: null,
          value: fixtureMoney(185_000),
          note: '₹1,850 wasool hue',
          observed_at: istStamp(5 * 24 * 60),
        },
      ],
      requires_approval: false,
    },
    {
      id: 'act_01JPAYLINK01',
      tool_name: 'create_payment_link',
      status: 'rejected',
      summary_hi: 'गुप्ता जी को ₹1,200 का पेमेंट लिंक भेजें',
      summary_en: 'Send Gupta ji a ₹1,200 payment link',
      params: { customer: 'Rakesh Gupta', amount_paise: 120_000, expiry_hours: 48 },
      target_count: 1,
      estimated_impact: fixtureMoney(120_000),
      estimated_cost: fixtureMoney(12),
      net_expected: fixtureMoney(119988),
      requested_at: istStamp(3 * 24 * 60 + 55),
      decided_at: istStamp(3 * 24 * 60 + 52),
      executed_at: null,
      provider: 'local',
      error: '',
      result: { reason: 'Abhi nahi — dukaan pe aake de jaayenge' },
      outcomes: [],
      requires_approval: false,
    },
  ]

  return {
    actions,
    pending_count: actions.filter((action) => action.status === 'pending_approval').length,
    meta: meta('local', 27),
  }
}

/* ------------------------------------------------------------------------ memory */

interface NodeSeed {
  id: string
  kind: GraphNodeOut['kind']
  label: string
  text: string
  attrs?: GraphNodeOut['attrs']
}

const NODE_SEEDS: NodeSeed[] = [
  {
    id: 'mn_merchant',
    kind: 'merchant',
    label: 'Sharma General Store',
    text: 'Kirana in Lajpat Nagar II, Delhi. Owner Ramesh Sharma. Open 07:00–22:00 IST. Soundbox SB-DEL-88214.',
    attrs: { category: 'kirana', locality: 'Lajpat Nagar II' },
  },
  {
    id: 'mn_day_today',
    kind: 'day',
    label: 'Aaj ka din',
    text: 'Collection tracking 12% below the weekday baseline; robust z −2.14; projected close below median.',
    attrs: { delta_pct: -12.3 },
  },
  {
    id: 'mn_day_last_sat',
    kind: 'day',
    label: 'Pichla Saturday',
    text: 'Saturday peak day, 1.35x weekday. ₹24,970 collected across 101 transactions.',
    attrs: { collection_paise: 2_497_000 },
  },
  {
    id: 'mn_ins_dormant',
    kind: 'insight',
    label: 'Dormant regulars insight',
    text: '12 previously regular customers stopped visiting 4+ weeks ago. Recoverable value ₹8,400.',
    attrs: { severity: 'high', impact_paise: 433_322 },
  },
  {
    id: 'mn_ins_udhaar',
    kind: 'insight',
    label: 'Udhaar overdue insight',
    text: '₹11,300 open udhaar across 18 khata entries, 4 past 60 days holding ₹4,850.',
    attrs: { severity: 'critical', impact_paise: 485_000 },
  },
  {
    id: 'mn_ins_anomaly',
    kind: 'insight',
    label: 'Collection anomaly',
    text: 'Today is 12% below the weekday median of the trailing 8 weeks, measured with median + MAD.',
    attrs: { severity: 'high' },
  },
  {
    id: 'mn_act_winback1',
    kind: 'action',
    label: 'Win-back offer · bheja gaya',
    text: '10% win-back offer sent to 10 customers seven days ago via the local action runner.',
    attrs: { status: 'executed', target_count: 10 },
  },
  {
    id: 'mn_act_winback2',
    kind: 'action',
    label: 'Win-back offer · manzoori baaki',
    text: 'Second 10% win-back offer to 10 customers, waiting for the merchant to say haan.',
    attrs: { status: 'pending_approval', target_count: 10 },
  },
  {
    id: 'mn_out_recovered',
    kind: 'note',
    label: '₹2,340 recovered',
    text: 'Outcome of the first win-back offer: 12 sent, 4 customers returned, ₹2,340 recovered.',
    attrs: { value_paise: 234_000 },
  },
  {
    id: 'mn_conv_last',
    kind: 'conversation',
    label: 'Pichli baat-cheet',
    text: 'Seven days ago Ramesh ji approved the win-back offer and asked to be told the result later.',
    attrs: { turns: 6 },
  },
  {
    id: 'mn_cus_anita',
    kind: 'customer',
    label: 'Anita Verma',
    text: 'Loyal customer, visits every 8 days. Dormant for 31 days. Returned after the win-back offer.',
    attrs: { segment: 'loyal', returned: true },
  },
  {
    id: 'mn_cus_rakesh',
    kind: 'customer',
    label: 'Rakesh Gupta',
    text: 'Khata customer, ₹1,200 outstanding for 78 days. Good settle history, gentle tone.',
    attrs: { segment: 'regular', udhaar_paise: 120_000 },
  },
  {
    id: 'mn_cus_sunita',
    kind: 'customer',
    label: 'Sunita Devi',
    text: 'Regular, average ticket ₹310. Dormant 27 days. Came back with the offer and spent ₹640.',
    attrs: { segment: 'regular', returned: true },
  },
  {
    id: 'mn_cus_imran',
    kind: 'customer',
    label: 'Imran Khan',
    text: 'Occasional customer, dormant 35 days. Offer delivered, not yet redeemed.',
    attrs: { segment: 'occasional', returned: false },
  },
  {
    id: 'mn_cus_meena',
    kind: 'customer',
    label: 'Meena Joshi',
    text: 'Champion customer, visits twice a week, never on khata. Biggest UPI spender.',
    attrs: { segment: 'champion' },
  },
  {
    id: 'mn_cus_vikas',
    kind: 'customer',
    label: 'Vikas Chauhan',
    text: 'Dormant 29 days, used to buy atta and dairy weekly. Returned after the offer.',
    attrs: { segment: 'loyal', returned: true },
  },
  {
    id: 'mn_prd_atta',
    kind: 'product',
    label: 'Aashirvaad Atta 5kg',
    text: 'Fast mover. 1.8 days of cover left against a 2-day lead time; weekend uplift 1.35x.',
    attrs: { days_of_cover: 1.8 },
  },
  {
    id: 'mn_prd_oil',
    kind: 'product',
    label: 'Fortune Refined 1L',
    text: 'Fast mover with 2.1 days of cover. Restock before Saturday.',
    attrs: { days_of_cover: 2.1 },
  },
  {
    id: 'mn_prd_nivea',
    kind: 'product',
    label: 'Nivea Soft 200ml',
    text: 'Dead stock: no sale in 52 days, ₹1,860 of capital locked.',
    attrs: { locked_paise: 186_000 },
  },
  {
    id: 'mn_prd_masala',
    kind: 'product',
    label: 'Everest Garam Masala 500g',
    text: 'Dead stock: no sale in 47 days, ₹1,240 locked. Candidate for a Diwali combo.',
    attrs: { locked_paise: 124_000 },
  },
  {
    id: 'mn_prd_lays',
    kind: 'product',
    label: 'Lays Cream & Onion family',
    text: 'Dead stock: no sale in 45 days, ₹1,100 locked, close to its best-before date.',
    attrs: { locked_paise: 110_000 },
  },
  {
    id: 'mn_note_diwali',
    kind: 'note',
    label: 'Diwali prep note',
    text: 'Merchant note: order extra dry fruit and diyas three weeks before Diwali, like last year.',
    attrs: { source: 'merchant' },
  },
  {
    id: 'mn_note_tone',
    kind: 'note',
    label: 'Udhaar tone policy',
    text: 'Reminder tone never goes harsher than FIRM. Max one reminder per khata entry per 7 days.',
    attrs: { source: 'policy' },
  },
]

const EDGE_SEEDS: Array<[string, string, string, number]> = [
  ['mn_merchant', 'mn_day_today', 'has_day', 1],
  ['mn_merchant', 'mn_day_last_sat', 'has_day', 0.8],
  ['mn_day_today', 'mn_ins_anomaly', 'raised', 1],
  ['mn_merchant', 'mn_ins_dormant', 'raised', 0.9],
  ['mn_merchant', 'mn_ins_udhaar', 'raised', 0.9],
  ['mn_ins_dormant', 'mn_act_winback1', 'triggered', 1],
  ['mn_ins_dormant', 'mn_act_winback2', 'triggered', 1],
  ['mn_act_winback1', 'mn_out_recovered', 'recovered', 1],
  ['mn_conv_last', 'mn_act_winback1', 'approved_in', 1],
  ['mn_conv_last', 'mn_merchant', 'about', 0.6],
  ['mn_act_winback1', 'mn_cus_anita', 'targeted', 0.9],
  ['mn_act_winback1', 'mn_cus_sunita', 'targeted', 0.9],
  ['mn_act_winback1', 'mn_cus_imran', 'targeted', 0.7],
  ['mn_act_winback1', 'mn_cus_vikas', 'targeted', 0.9],
  ['mn_act_winback2', 'mn_cus_imran', 'targets', 0.7],
  ['mn_act_winback2', 'mn_cus_rakesh', 'targets', 0.6],
  ['mn_cus_anita', 'mn_out_recovered', 'contributed', 0.8],
  ['mn_cus_sunita', 'mn_out_recovered', 'contributed', 0.8],
  ['mn_cus_vikas', 'mn_out_recovered', 'contributed', 0.7],
  ['mn_ins_udhaar', 'mn_cus_rakesh', 'concerns', 0.9],
  ['mn_ins_udhaar', 'mn_note_tone', 'governed_by', 0.7],
  ['mn_merchant', 'mn_cus_meena', 'serves', 0.7],
  ['mn_merchant', 'mn_cus_anita', 'serves', 0.6],
  ['mn_cus_meena', 'mn_prd_atta', 'buys', 0.8],
  ['mn_cus_vikas', 'mn_prd_atta', 'buys', 0.7],
  ['mn_cus_anita', 'mn_prd_oil', 'buys', 0.6],
  ['mn_merchant', 'mn_prd_atta', 'stocks', 0.8],
  ['mn_merchant', 'mn_prd_oil', 'stocks', 0.8],
  ['mn_merchant', 'mn_prd_nivea', 'stocks', 0.5],
  ['mn_merchant', 'mn_prd_masala', 'stocks', 0.5],
  ['mn_merchant', 'mn_prd_lays', 'stocks', 0.5],
  ['mn_prd_nivea', 'mn_note_diwali', 'mentioned_in', 0.5],
  ['mn_prd_masala', 'mn_note_diwali', 'mentioned_in', 0.6],
  ['mn_day_last_sat', 'mn_prd_atta', 'sold', 0.7],
]

export function fixtureGraph(): GraphOut {
  const nodes: GraphNodeOut[] = NODE_SEEDS.map((seed) => ({
    id: seed.id,
    ref: `${seed.kind}:${seed.id}`,
    kind: seed.kind,
    label: seed.label,
    text: seed.text,
    attrs: seed.attrs ?? {},
  }))
  const edges: GraphEdgeOut[] = EDGE_SEEDS.map(([source, target, rel, weight]) => ({
    source,
    target,
    rel,
    weight,
  }))
  return { nodes, edges, truncated: false, meta: meta('local', 18) }
}

/* ------------------------------------------------------- seeded transcript (past) */

export interface SeedTurn {
  id: string
  role: 'merchant' | 'munshi'
  text: string
  at: string
  latency_ms: number
  provider: string
  tool_calls: ToolCallOut[]
  memory_used: string[]
}

/**
 * The tail of the conversation from seven days ago. It is shown above a divider so judges
 * can see that turn #1 of today's session already knows what session #0 decided.
 */
export function fixturePastTurns(): SeedTurn[] {
  const at = istStamp(7 * 24 * 60 + 25)
  return [
    {
      id: 'trn_past_1',
      role: 'merchant',
      text: 'Purane grahak kam aa rahe hain, kuch kar sakte ho?',
      at,
      latency_ms: 0,
      provider: 'local',
      tool_calls: [],
      memory_used: [],
    },
    {
      id: 'trn_past_2',
      role: 'munshi',
      text: 'Ji. 12 purane grahak 4 hafte se nahi aaye — inki value ₹8,400 hai. ₹50 ka win-back offer bhej dun?',
      at,
      latency_ms: 940,
      provider: 'local',
      tool_calls: [
        {
          name: 'find_dormant_customers',
          arguments: { window_days: 90, min_visits: 3 },
          ok: true,
          latency_ms: 61,
          summary: '14 dormant regulars · ₹4,333 recoverable · median gap 9.4d',
        },
      ],
      memory_used: ['insight:ins_01JDORMANT12'],
    },
    {
      id: 'trn_past_3',
      role: 'merchant',
      text: 'Haan bhej do.',
      at: istStamp(7 * 24 * 60 + 24),
      latency_ms: 0,
      provider: 'local',
      tool_calls: [],
      memory_used: [],
    },
    {
      id: 'trn_past_4',
      role: 'munshi',
      text: '12 grahakon ko offer bhej diya. Nateeja main yaad rakhunga aur agli baar khud bataunga.',
      at: istStamp(7 * 24 * 60 + 23),
      latency_ms: 1120,
      provider: 'local',
      tool_calls: [
        {
          name: 'send_winback_offer',
          arguments: { segment: 'dormant', offer_paise: 5000, customer_count: 12 },
          ok: true,
          latency_ms: 410,
          summary: 'approved → executed · 12 messages queued · run_local_8831',
        },
      ],
      memory_used: ['action:act_01JWINBACK01'],
    },
  ]
}

/**
 * The merchant-health signal, offline.
 *
 * Mirrors what `assess_health` produces for the seeded shop, including the shape that matters:
 * nothing pinned at 100, and the weakest dimension being the one MunshiJi then offers to work on.
 */
export function fixtureMerchantHealth(): MerchantHealthOut {
  return {
    merchant_id: FIXTURE_MERCHANT_ID,
    score: 84.4,
    band: 'strong',
    band_hi: 'मजबूत',
    previous_score: 86.4,
    delta: -2.0,
    weakest_dimension: 'revenue_trend',
    as_of: new Date().toISOString(),
    dimensions: [
      {
        key: 'revenue_trend',
        label_en: 'Revenue trend',
        label_hi: 'बिक्री का रुख',
        score: 64.9,
        weight: 0.28,
        contribution: 18.2,
        evidence: '₹5,57,734 vs ₹5,44,500 (+2.4%)',
        reason_en: 'Last 30 days ran +2.4% against the 30 before.',
        reason_hi: 'पिछले 30 दिन +2.4% रहे।',
        metrics: { change_pct: 2.4 },
      },
      {
        key: 'credit_discipline',
        label_en: 'Credit discipline',
        label_hi: 'उधार का अनुशासन',
        score: 90.7,
        weight: 0.26,
        contribution: 23.6,
        evidence: '₹82,808 open (15% of turnover), 7 past 60 days',
        reason_en: 'Credit book is 15% of monthly turnover; 7 of 34 entries are over 60 days.',
        reason_hi: 'उधार महीने की बिक्री का 15%।',
        metrics: { exposure_pct: 15.4, over_60_days: 7 },
      },
      {
        key: 'customer_retention',
        label_en: 'Customer retention',
        label_hi: 'ग्राहक टिकाव',
        score: 97.0,
        weight: 0.2,
        contribution: 19.4,
        evidence: '97% repeat, 0% lapsed',
        reason_en: '213 of 220 named customers have bought three times or more.',
        reason_hi: 'ज्यादातर ग्राहक बार-बार आते हैं।',
        metrics: { repeat_share_pct: 97 },
      },
      {
        key: 'inventory_efficiency',
        label_en: 'Inventory efficiency',
        label_hi: 'स्टॉक की चाल',
        score: 93.5,
        weight: 0.14,
        contribution: 13.1,
        evidence: '₹5,833 idle of ₹2,32,243',
        reason_en: '3% of stock value has not sold in 45 days.',
        reason_hi: '3% स्टॉक 45 दिन से नहीं बिका।',
        metrics: { dead_share_pct: 2.5 },
      },
      {
        key: 'digital_maturity',
        label_en: 'Digital maturity',
        label_hi: 'डिजिटल हिस्सा',
        score: 84.8,
        weight: 0.12,
        contribution: 10.2,
        evidence: '85% of takings are digital',
        reason_en: '85% of the last 30 days came through digital rails.',
        reason_hi: '85% वसूली डिजिटल थी।',
        metrics: { digital_share_pct: 84.8 },
      },
    ],
  }
}
