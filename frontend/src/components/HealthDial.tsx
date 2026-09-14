import type { MerchantHealthOut } from '../api/types'

/** The composite, its band, and which way it has moved since last month. */
export function HealthDial({ health }: { health: MerchantHealthOut }): JSX.Element {
  const delta = health.delta ?? 0
  return (
    <div className={`dial dial--${health.band}`}>
      <div className="dial__score tabular">{health.score.toFixed(1)}</div>
      <div className="dial__of">out of 100</div>

      <div className="dial__band deva" lang="hi">
        {health.band_hi}
        <span className="dial__band-en">{health.band}</span>
      </div>

      {health.previous_score === null ? null : (
        <div
          className={delta < 0 ? 'dial__delta dial__delta--down' : 'dial__delta dial__delta--up'}
        >
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1)} <span>since last month</span>
        </div>
      )}

      <p className="dial__note">
        A signal, not a credit decision. Nothing here approves or prices anything — it is the same
        evidence a lender would otherwise have to go and find.
      </p>
    </div>
  )
}
