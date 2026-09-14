import { CallStrip } from './components/CallStrip'
import { Header } from './components/Header'
import { LedgerTabs } from './components/LedgerTabs'
import { ActionsPage } from './pages/ActionsPage'
import { AdvicePage } from './pages/AdvicePage'
import { CallPage } from './pages/CallPage'
import { HealthPage } from './pages/HealthPage'
import { MemoryPage } from './pages/MemoryPage'
import { useRoute } from './router'

/**
 * The shell: the shop's header, the ledger tabs, and whichever page they select.
 *
 * An unrecognised path falls through to the call page rather than an error screen — a mistyped
 * URL during a demo should land somewhere useful.
 */
export default function App(): JSX.Element {
  const { path } = useRoute()

  const page =
    path === '/salah' ? (
      <AdvicePage />
    ) : path === '/kaam' ? (
      <ActionsPage />
    ) : path === '/yaaddasht' ? (
      <MemoryPage />
    ) : path === '/sehat' ? (
      <HealthPage />
    ) : (
      <CallPage />
    )

  return (
    <div className="shell shell--paged">
      <Header />
      <LedgerTabs />
      {page}
      {path === '/' ? null : <CallStrip />}
    </div>
  )
}
