import type { ActionOut, InsightOut, PaymentMixSlice } from '../api/types'
import { CheckIcon, ChevronIcon, CrossIcon, RefreshIcon } from '../components/Icons'
import { Sparkline } from '../components/Sparkline'
import { trimPaise, useLang, type Lang } from '../i18n'
import { Link } from '../router'
import { useApp } from '../state/store'

/**
 * The home screen: what a merchant checks with morning chai.
 *
 * Order is priority order — today's money, then who it came from, then the trend, then what
 * MunshiJi wants a yes on. Nothing here explains itself twice and nothing shows a number the
 * shopkeeper would not instinctively verify.
 */

const MIX_LABEL: Record<Lang, Record<string, string>> = {
  hi: { upi: 'UPI', cash: 'नकद', soundbox: 'साउंडबॉक्स', card: 'कार्ड', wallet: 'वॉलेट' },
  en: { upi: 'UPI', cash: 'Cash', soundbox: 'Soundbox', card: 'Card', wallet: 'Wallet' },
}

function firstName(owner: string): string {
  return owner.split(/\s+/)[0] || owner
}

function PaymentMix({ slices, lang }: { slices: PaymentMixSlice[]; lang: Lang }): JSX.Element | null {
  if (!slices.length) return null
  const total = slices.reduce((sum, slice) => sum + slice.share_pct, 0) || 100
  const labels = MIX_LABEL[lang]
  return (
    <div className="mix">
      <div
        className="mix__bar"
        role="img"
        aria-label={slices
          .map((slice) => `${labels[slice.method] ?? slice.method} ${slice.share_pct.toFixed(0)}%`)
          .join(', ')}
      >
        {slices.map((slice, index) => (
          <div
            key={slice.method}
            className="mix__seg"
            style={{
              width: `${(slice.share_pct / total) * 100}%`,
              background: `var(--mix-${Math.min(5, index + 1)})`,
            }}
            title={`${labels[slice.method] ?? slice.method} · ${slice.share_pct.toFixed(1)}% · ${slice.amount.display}`}
          />
        ))}
      </div>
      <ul className="mix__legend">
        {slices.slice(0, 4).map((slice, index) => (
          <li key={slice.method}>
            <i className="mix__swatch" style={{ background: `var(--mix-${Math.min(5, index + 1)})` }} />
            {labels[slice.method] ?? slice.method} <b className="tabular">{slice.share_pct.toFixed(0)}%</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SuggestionCard({ action }: { action: ActionOut }): JSX.Element {
  const { t, lang } = useLang()
  const { approve, reject, busy } = useApp()

  const pending = action.status === 'pending_approval'
  const working = busy.actionId === action.id
  const summary =
    lang === 'hi' ? action.summary_hi || action.summary_en : action.summary_en || action.summary_hi
  const delivered =
    typeof action.result.delivered_count === 'number' ? action.result.delivered_count : null
  // The one outcome a merchant cares about: what the offer actually brought back.
  const recovered = action.outcomes.find(
    (outcome) => outcome.metric === 'revenue_recovered' && outcome.value,
  )

  return (
    <article className={`suggest${pending ? ' suggest--pending' : ''}`}>
      <p className={`suggest__text${lang === 'hi' ? ' deva' : ''}`}>{summary}</p>

      <div className="suggest__facts">
        <span>
          <b className="tabular">{action.target_count}</b> {t('action.target')}
        </span>
        {action.estimated_impact.paise > 0 ? (
          <span>
            <b>{action.estimated_impact.display}</b> {t('action.impact')}
          </span>
        ) : null}
        {action.estimated_cost.paise > 0 ? (
          <span className="suggest__cost">
            <b>{action.estimated_cost.display}</b> {t('action.cost')}
          </span>
        ) : null}
      </div>

      {pending ? (
        <div className="suggest__buttons">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void approve(action.id)}
            disabled={working}
          >
            <CheckIcon /> {working ? t('action.approveBusy') : t('action.approve')}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void reject(action.id, 'abhi nahi')}
            disabled={working}
          >
            <CrossIcon /> {t('action.reject')}
          </button>
        </div>
      ) : (
        <div className="suggest__done">
          <span className={`status status--${action.status}`}>{action.status.replace(/_/g, ' ')}</span>
          {action.status === 'executed' && action.provider === 'live' ? (
            <span className="viachip">
              n8n → WhatsApp{delivered !== null ? ` · ${delivered}` : ''}
            </span>
          ) : null}
          {recovered?.value ? (
            <span className="suggest__outcome">
              ↩ {trimPaise(recovered.value.display)} {t('action.recovered')}
            </span>
          ) : null}
        </div>
      )}
    </article>
  )
}

function FindingCard({ insight }: { insight: InsightOut }): JSX.Element {
  const { lang } = useLang()
  const title = lang === 'hi' ? insight.title_hi : insight.title_en
  const body = lang === 'hi' ? insight.body_hi : insight.body_en
  return (
    <article className={`finding finding--${insight.severity}`}>
      <div className="finding__row">
        <h3 className={lang === 'hi' ? 'deva' : ''}>{title}</h3>
        {insight.impact.paise > 0 ? <span className="finding__impact">{insight.impact.display}</span> : null}
      </div>
      <p className={lang === 'hi' ? 'deva' : ''}>{body}</p>
    </article>
  )
}

export function DukaanPage(): JSX.Element {
  const { t, lang } = useLang()
  const { dashboard, insights, actions, refreshInsightFeed, busy } = useApp()

  if (!dashboard) {
    return (
      <main className="page">
        <div className="skeleton" style={{ height: 148, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 84, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--r-lg)' }} />
      </main>
    )
  }

  const today = dashboard.today
  const delta = today.delta_pct
  const below = (delta ?? 0) < 0
  const weekday = lang === 'hi' ? today.weekday_hi : today.weekday_en

  const list = actions?.actions ?? []
  const pendingActions = list.filter((action) => action.status === 'pending_approval')
  const recentDone = list
    .filter((action) => action.status === 'executed')
    .slice(0, pendingActions.length ? 1 : 2)
  const findings = (insights?.insights ?? []).slice(0, 2)

  return (
    <main className="page">
      <div className="greeting">
        <h1 className={lang === 'hi' ? 'deva' : ''}>
          {lang === 'hi'
            ? `नमस्ते, ${firstName(dashboard.merchant.owner_name)} जी`
            : `Namaste, ${firstName(dashboard.merchant.owner_name)} ji`}
        </h1>
        <span className={`greeting__day${lang === 'hi' ? ' deva' : ''}`}>{weekday}</span>
      </div>

      {/* hero: today's money */}
      <section className="card card--hero" aria-label={t('dukaan.today')}>
        <div className="hero__label">{t('dukaan.today')}</div>
        <div className="hero__row">
          <div className="hero__figure tabular">{trimPaise(today.collected.display)}</div>
          {delta !== null ? (
            <span className={`delta ${below ? 'delta--down' : 'delta--up'}`}>
              {below ? '▼' : '▲'} {Math.abs(delta).toFixed(0)}%
            </span>
          ) : null}
        </div>
        <div className="hero__sub">
          {today.projected_close && !today.is_too_early_to_project ? (
            <span>
              {t('dukaan.projection')} <b>≈ {trimPaise(today.projected_close.display)}</b>
            </span>
          ) : (
            <span>{t('dukaan.tooEarly')}</span>
          )}
          {delta !== null ? <span className="hero__vs">{t('dukaan.baseline')}</span> : null}
        </div>
      </section>

      {/* the three numbers a merchant checks next */}
      <section className="statrow" aria-label={t('dukaan.transactions')}>
        <div className="stat">
          <b className="tabular">{today.transactions}</b>
          <span>{t('dukaan.transactions')}</span>
        </div>
        <div className="stat">
          <b>{trimPaise(today.average_ticket.display)}</b>
          <span>{t('dukaan.avgTicket')}</span>
        </div>
        <div className="stat">
          <b className="tabular">{today.unique_customers}</b>
          <span>
            {t('dukaan.customers')}
            <em className="stat__split tabular">
              {today.repeat_customers} {t('dukaan.repeat')} · {today.new_customers} {t('dukaan.new')}
            </em>
          </span>
        </div>
      </section>

      {/* udhaar strip → khata */}
      <Link to="/khata" className="udhaarstrip">
        <span>
          {t('dukaan.udhaar')} <b>{trimPaise(dashboard.open_udhaar.display)}</b>
          <small>
            {' '}
            · {dashboard.open_udhaar_count} {t('dukaan.khaate')}
          </small>
        </span>
        <ChevronIcon />
      </Link>

      {/* trend */}
      <section className="card" aria-label={t('dukaan.trend')}>
        <div className="card__title">{t('dukaan.trend')}</div>
        <Sparkline points={dashboard.sparkline} belowBaseline={below} />
        <div className="card__title" style={{ marginTop: 'var(--s-4)' }}>
          {t('dukaan.paymentMix')}
        </div>
        <PaymentMix slices={dashboard.payment_mix} lang={lang} />
      </section>

      {/* MunshiJi's suggestions — the approval queue, where the n8n beat lands */}
      <section className="card" aria-label={t('dukaan.sujhav')}>
        <div className="card__title">{t('dukaan.sujhav')}</div>
        {pendingActions.length || recentDone.length ? (
          <>
            {pendingActions.map((action) => (
              <SuggestionCard key={action.id} action={action} />
            ))}
            {recentDone.map((action) => (
              <SuggestionCard key={action.id} action={action} />
            ))}
          </>
        ) : (
          <div className={`empty${lang === 'hi' ? ' deva' : ''}`}>{t('dukaan.sujhavEmpty')}</div>
        )}
      </section>

      {/* top findings */}
      <section className="card" aria-label={t('dukaan.findings')}>
        <div className="card__title card__title--split">
          {t('dukaan.findings')}
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => void refreshInsightFeed()}
            disabled={busy.insights}
          >
            <RefreshIcon size={14} /> {busy.insights ? t('dukaan.refreshing') : t('dukaan.refresh')}
          </button>
        </div>
        {findings.length ? (
          findings.map((insight) => <FindingCard key={insight.id} insight={insight} />)
        ) : (
          <div className="empty">{busy.insights ? t('dukaan.refreshing') : '—'}</div>
        )}
      </section>
    </main>
  )
}
