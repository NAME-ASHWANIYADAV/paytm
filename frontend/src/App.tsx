import { ActionQueue } from './components/ActionQueue'
import { Header } from './components/Header'
import { InsightFeed } from './components/InsightFeed'
import { LiveCall } from './components/LiveCall'
import { MemoryGraph } from './components/MemoryGraph'
import { TodayNumbers } from './components/TodayNumbers'

/**
 * The merchant companion screen: one full-height dashboard, no routing.
 *   left   — the live call (the hero)
 *   middle — today's numbers over the action queue
 *   right  — the ranked insight feed over the memory graph
 */
export default function App(): JSX.Element {
  return (
    <div className="shell">
      <Header />
      <main className="deck">
        <div className="col col--call">
          <LiveCall />
        </div>
        <div className="col col--mid">
          <TodayNumbers />
          <ActionQueue />
        </div>
        <div className="col col--right">
          <InsightFeed />
          <MemoryGraph />
        </div>
      </main>
    </div>
  )
}
