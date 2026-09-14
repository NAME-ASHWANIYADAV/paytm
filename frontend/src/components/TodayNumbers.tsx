import type { PaymentMixSlice } from '../api/types'
import { useApp } from '../state/store'
import { Sparkline } from './Sparkline'

const MIX_LABEL: Record<string, string> = {
  upi: 'UPI',
  cash: 'Cash',
  soundbox: 'Soundbox',
  card: 'Card',
  wallet: 'Wallet',
}

function PaymentMix({ slices }: { slices: PaymentMixSlice[] }): JSX.Element {
  const total = slices.reduce((sum, slice) => sum + slice.share_pct, 0) || 100
  return (
    <div className="mix">
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        payment mix
      </div>
      <div
        className="mix__bar"
        role="img"
        aria-label={slices
          .map((slice) => `${MIX_LABEL[slice.method] ?? slice.method} ${slice.share_pct.toFixed(1)}%`)
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
            title={`${MIX_LABEL[slice.method] ?? slice.method} · ${slice.share_pct.toFixed(1)}% · ${slice.amount.display}`}
          />
        ))}
      </div>
      <ul className="mix__legend">
        {slices.map((slice, index) => (
          <li key={slice.method}>
            <i className="mix__swatch" style={{ background: `var(--mix-${Math.min(5, index + 1)})` }} />
            {MIX_LABEL[slice.method] ?? slice.method} <b>{slice.share_pct.toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TodayNumbers(): JSX.Element {
  const { dashboard } = useApp()

  if (!dashboard) {
    return (
      <section className="panel area-today" aria-label="Today's numbers">
        <div className="panel__head">
          <h2 className="panel__title">
            Aaj ke number <small className="deva">आज का हिसाब</small>
          </h2>
        </div>
        <div className="panel__body" style={{ display: 'grid', gap: 10 }}>
          <div className="skeleton" style={{ height: 34 }} />
          <div className="skeleton" />
          <div className="skeleton" style={{ width: '70%' }} />
        </div>
      </section>
    )
  }

  const today = dashboard.today
  const delta = today.delta_pct
  const below = (delta ?? 0) < 0
  const progressPct = Math.round(today.day_progress * 100)
  const confidencePct = Math.round(today.projection_confidence * 100)

  return (
    <section className="panel area-today" aria-label="Today's numbers">
      <div className="panel__head">
        <h2 className="panel__title">
          Aaj ke number <small className="deva">आज का हिसाब</small>
        </h2>
        <span className="chip">
          {today.weekday_en} · din ka {progressPct}%
        </span>
      </div>

      <div className="today__body scroll">
        <div className="hero">
          <div>
            <div className="hero__label">ab tak aaya</div>
            <div className="hero__figure">{today.collected.display}</div>
          </div>
          {delta === null ? null : (
            <div className={`delta ${below ? 'delta--down' : 'delta--up'}`}>
              {below ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}%
              <small>vs {today.weekday_en.slice(0, 3)} baseline</small>
            </div>
          )}
        </div>

        {today.projected_close && !today.is_too_early_to_project ? (
          <div className="projection">
            <div>
              <div className="hero__label">din band hoga</div>
              <div className="projection__figure">≈ {today.projected_close.display}</div>
            </div>
            <div className="projection__band">
              <div
                className="band"
                role="img"
                aria-label={`Projection confidence ${confidencePct} percent`}
                title={`intraday curve se projection · ${confidencePct}% confidence`}
              >
                <div className="band__fill" style={{ width: `${confidencePct}%` }} />
              </div>
              <div className="mono muted" style={{ marginTop: 3 }}>
                {confidencePct}% confidence
                {today.baseline ? ` · baseline ${today.baseline.display}` : ''}
                {today.robust_z !== null ? ` · z ${today.robust_z.toFixed(2)}` : ''}
              </div>
            </div>
          </div>
        ) : (
          <div className="projection">
            <span className="muted">Projection ke liye abhi bahut jaldi hai.</span>
          </div>
        )}

        <div className="statgrid">
          <div className="stat">
            <div className="stat__k">transactions</div>
            <div className="stat__v tabular">{dashboard.today.transactions}</div>
          </div>
          <div className="stat">
            <div className="stat__k">average ticket</div>
            <div className="stat__v">{today.average_ticket.display}</div>
          </div>
          <div className="stat">
            <div className="stat__k">unique grahak</div>
            <div className="stat__v tabular">{today.unique_customers}</div>
          </div>
        </div>

        <div className="ledgerline">
          <span>
            udhaar <b>{dashboard.open_udhaar.display}</b>
            <span className="muted"> · {dashboard.open_udhaar_count} khaate</span>
          </span>
          <span>
            sust grahak <b className="tabular">{dashboard.dormant_customer_count}</b>
          </span>
          <span>
            stock alert <b className="tabular">{dashboard.low_stock_count}</b>
          </span>
        </div>

        <Sparkline points={dashboard.sparkline} belowBaseline={below} />

        <PaymentMix slices={dashboard.payment_mix} />
      </div>
    </section>
  )
}
