import { LiveCall } from '../components/LiveCall'
import { TodayNumbers } from '../components/TodayNumbers'

/** The conversation and today's figures, side by side, both with room. */
export function CallPage(): JSX.Element {
  return (
    <main className="page">
      <header className="page__head">
        <h1 className="page__title deva" lang="hi">
          बात-चीत
        </h1>
        <p className="page__lede">
          Ask in Hindi, Hinglish or English. Every figure spoken here was computed from the shop's
          own ledger.
        </p>
      </header>
      <div className="page__body page__body--call">
        <LiveCall variant="full" />
        <TodayNumbers />
      </div>
    </main>
  )
}
