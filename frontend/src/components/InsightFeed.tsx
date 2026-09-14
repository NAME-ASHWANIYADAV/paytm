import type { InsightOut, JsonValue } from '../api/types'
import { useApp } from '../state/store'
import { RefreshIcon, SparkIcon } from './Icons'

/** What to say to MunshiJi when the merchant taps "Ask MunshiJi" on a card. */
const TOOL_PROMPT: Record<string, string> = {
  send_winback_offer: 'Sust grahakon ko win-back offer bhejne ka plan batao',
  send_udhaar_reminder: '60 din se upar wale udhaar khaton ka kya karein?',
  compare_sales: 'Aaj ka collection baseline se kaise compare kar raha hai?',
  draft_restock_order: 'Kaunsa stock khatam hone wala hai, order kya karein?',
  get_product_performance: 'In SKU ka performance batao',
  get_inventory_alerts: 'Stock me kya khatam ho raha hai?',
  get_udhaar_summary: 'Udhaar ka kya scene hai?',
  find_dormant_customers: 'Purane grahak kahan gaye?',
}

const SEVERITY_GLYPH: Record<string, string> = {
  critical: '▲',
  high: '▲',
  medium: '●',
  low: '●',
  info: '·',
}

/** Metric chips. Money never gets formatted here — `impact.display` carries the rupees. */
function metricChips(metrics: Record<string, JsonValue>): Array<{ key: string; label: string; value: string }> {
  return Object.entries(metrics)
    .filter((entry): entry is [string, number | string] => {
      const [key, value] = entry
      return !key.endsWith('_paise') && (typeof value === 'number' || typeof value === 'string')
    })
    .slice(0, 3)
    .map(([key, value]) => {
      let text: string
      if (typeof value === 'number') {
        const rounded = Number.isInteger(value) ? String(value) : value.toFixed(value < 10 ? 2 : 1)
        text = key.endsWith('_pct') ? `${rounded}%` : key.endsWith('_days') ? `${rounded}d` : rounded
      } else {
        text = value
      }
      return { key, label: key.replace(/_/g, ' ').replace(/ paise$/, ''), value: text }
    })
}

function InsightCard({
  insight,
  onPage = false,
}: {
  insight: InsightOut
  onPage?: boolean
}): JSX.Element {
  const { send, busy } = useApp()
  const chips = metricChips(insight.metrics)
  const prompt = insight.suggested_tool
    ? TOOL_PROMPT[insight.suggested_tool] ?? `${insight.title_en} — iska kya karein?`
    : null

  return (
    <article
      className={`insight insight--${insight.severity}${onPage ? ' insight--page' : ''}`}
    >
      <div className="insight__head">
        <span className="sev">
          <span aria-hidden="true">{SEVERITY_GLYPH[insight.severity] ?? '·'}</span>
          {insight.severity}
        </span>
        <div className="insight__impact">
          {insight.impact.paise > 0 ? insight.impact.display : '—'}
          <small>asar</small>
        </div>
      </div>

      <h3 className="insight__hi deva" lang="hi">
        {insight.title_hi}
      </h3>
      <div className="insight__en">{insight.title_en}</div>
      <p className="insight__body deva" lang="hi">
        {insight.body_hi}
      </p>

      {chips.length ? (
        <div className="insight__metrics">
          {chips.map((chip) => (
            <span className="metric" key={chip.key}>
              <b>{chip.value}</b>
              <span>{chip.label}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="insight__foot">
        <span className="scorebar" title={`score ${insight.score.toFixed(1)} · confidence ${Math.round(insight.confidence * 100)}%`}>
          <i style={{ ['--score' as string]: `${Math.min(100, insight.score)}%` }} />
          {insight.score.toFixed(0)} · {Math.round(insight.confidence * 100)}% sure
        </span>
        {prompt ? (
          <button type="button" className="btn btn--sm" disabled={busy.chat} onClick={() => void send(prompt)}>
            <SparkIcon size={14} /> Ask MunshiJi
          </button>
        ) : null}
      </div>
    </article>
  )
}

export interface InsightFeedProps {
  /** `rail` keeps the panel chrome; `page` drops it and opens each card up. */
  variant?: 'rail' | 'page'
}

export function InsightFeed({ variant = 'rail' }: InsightFeedProps): JSX.Element {
  const { insights, refreshInsightFeed, busy } = useApp()
  const list = insights?.insights ?? []

  const onPage = variant === 'page'

  return (
    <section
      className={onPage ? 'area-insights area-insights--page' : 'panel area-insights'}
      aria-label="Insight feed"
    >
      {onPage ? (
        <div className="feedbar">
          {insights ? (
            <span className="chip chip--alert">{insights.total_impact.display} par asar</span>
          ) : null}
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => void refreshInsightFeed()}
            disabled={busy.insights}
          >
            <RefreshIcon size={14} />
            {busy.insights ? 'chal raha hai…' : 'refresh'}
          </button>
        </div>
      ) : (
      <div className="panel__head">
        <h2 className="panel__title">
          Batata hai <small className="deva">सलाह</small>
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {insights ? (
            <span className="chip chip--alert" title="Total estimated impact across open insights">
              {insights.total_impact.display} par asar
            </span>
          ) : null}
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => void refreshInsightFeed()}
            disabled={busy.insights}
            aria-label="Insights dobara nikaalein"
          >
            <RefreshIcon size={14} />
            {busy.insights ? 'chal raha hai…' : 'refresh'}
          </button>
        </div>
      </div>
      )}

      <div className={onPage ? 'insights' : 'insights scroll'}>
        {list.length ? (
          list.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onPage={onPage} />
          ))
        ) : (
          <div className="empty">
            <p>Abhi koi salah nahi nikli.</p>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => void refreshInsightFeed()}
              disabled={busy.insights}
            >
              <RefreshIcon size={14} />
              {busy.insights ? 'nikaal raha hoon…' : 'dobara nikaalo'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
