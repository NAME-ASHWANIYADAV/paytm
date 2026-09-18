import { trimPaise, useLang } from '../i18n'
import { useRoute } from '../router'
import { useApp } from '../state/store'

/**
 * Udhaar recovery — the merchant's number-one daily job, so it gets its own tab.
 *
 * A dense hairline list, not cards: forty debtors have to scan like a ledger, because that is
 * exactly what this is. "याद दिलाओ" goes through the SAME pipeline as asking MunshiJi by
 * voice — compliance screen, tone ceiling, approval gate, n8n dispatch — so the button cannot
 * do anything the conversation could not.
 */

const BUCKET_ORDER = ['0-15', '16-30', '31-60', '60+'] as const
const BUCKET_TONE: Record<string, string> = {
  '0-15': 'fresh',
  '16-30': 'aging',
  '31-60': 'old',
  '60+': 'overdue',
}

export function KhataPage(): JSX.Element {
  const { t, lang } = useLang()
  const { khata, send, busy } = useApp()
  const { navigate } = useRoute()

  if (!khata) {
    return (
      <main className="page">
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 'var(--r-lg)' }} />
      </main>
    )
  }

  const debtors = khata.top_debtors
  const total = khata.total_outstanding_paise

  const remind = (name: string): void => {
    // The conversation is the only door to an outbound message; this just knocks on it.
    void send(lang === 'hi' ? `${name} को उधार याद दिलाओ` : `Remind ${name} about their udhaar`)
    navigate('/munshiji')
  }

  return (
    <main className="page">
      <section className="card card--hero" aria-label={t('khata.total')}>
        <div className="hero__label">{t('khata.total')}</div>
        <div className="hero__row">
          <div className="hero__figure hero__figure--gold tabular">{trimPaise(khata.total_outstanding_display)}</div>
        </div>
        <div className="hero__sub">
          <span>
            <b className="tabular">{khata.entry_count}</b> {t('khata.entries')}
          </span>
        </div>
      </section>

      {total > 0 ? (
        <section className="card" aria-label={t('khata.aging')}>
          <div className="card__title">{t('khata.aging')}</div>
          <div className="agingbar" role="img" aria-label={t('khata.aging')}>
            {BUCKET_ORDER.map((label) => {
              const bucket = khata.buckets[label]
              if (!bucket || bucket.amount_paise <= 0) return null
              return (
                <div
                  key={label}
                  className={`agingbar__seg agingbar__seg--${BUCKET_TONE[label]}`}
                  style={{ width: `${(bucket.amount_paise / total) * 100}%` }}
                  title={`${label} ${t('khata.days')} · ${bucket.amount_display} · ${bucket.count}`}
                />
              )
            })}
          </div>
          <ul className="agingbar__legend">
            {BUCKET_ORDER.map((label) => {
              const bucket = khata.buckets[label]
              if (!bucket) return null
              return (
                <li key={label} className={bucket.count ? '' : 'agingbar__legend--empty'}>
                  <i className={`agingbar__swatch agingbar__seg--${BUCKET_TONE[label]}`} />
                  <span className="tabular">{label}</span> <b>{bucket.amount_display}</b>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section className="card card--list" aria-label={t('khata.title')}>
        {debtors.length ? (
          <ul className="debtors">
            {debtors.map((debtor) => (
              <li key={debtor.khata_entry_id} className={debtor.bucket === '60+' ? 'debtor debtor--overdue' : 'debtor'}>
                <div className="debtor__who">
                  <b>{debtor.name}</b>
                  <small className="tabular">
                    {debtor.days_overdue} {t('khata.days')}
                    {debtor.reminders_sent ? ` · ${debtor.reminders_sent} ${t('khata.reminders')}` : ''}
                  </small>
                </div>
                <div className="debtor__amount tabular">{debtor.amount_display}</div>
                <button
                  type="button"
                  className={`btn btn--sm btn--ghost${lang === 'hi' ? ' deva' : ''}`}
                  onClick={() => remind(debtor.name)}
                  disabled={busy.chat}
                >
                  {t('khata.remind')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={`empty${lang === 'hi' ? ' deva' : ''}`}>{t('khata.empty')}</div>
        )}
      </section>
    </main>
  )
}
