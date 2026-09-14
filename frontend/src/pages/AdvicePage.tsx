import { InsightFeed } from '../components/InsightFeed'

/**
 * Every finding, with the arithmetic that produced it.
 *
 * The rail could only show a headline and a rupee figure. Here each finding carries the numbers
 * the engine actually worked from, which is the difference between advice and an assertion.
 */
export function AdvicePage(): JSX.Element {
  return (
    <main className="page">
      <header className="page__head">
        <h1 className="page__title deva" lang="hi">
          सलाह
        </h1>
        <p className="page__lede">
          Ranked by what it is worth and how sure the engine is. Each finding shows the figures it
          was computed from — nothing here is a guess dressed up as a number.
        </p>
      </header>
      <div className="page__body">
        <InsightFeed variant="page" />
      </div>
    </main>
  )
}
