import { BottomNav } from './components/BottomNav'
import { Header } from './components/Header'
import { useLang } from './i18n'
import { DukaanPage } from './pages/DukaanPage'
import { KhataPage } from './pages/KhataPage'
import { LoginPage } from './pages/LoginPage'
import { MunshijiPage } from './pages/MunshijiPage'
import { YaadPage } from './pages/YaadPage'
import { useRoute } from './router'

/**
 * The shell. No session → the login screen, whatever the URL — the gate lives here, INSIDE
 * the providers, so the store and router never unmount and the conversation survives the
 * sign-in. An unrecognised path falls through to the dukaan rather than an error screen: a
 * mistyped URL during a demo should land somewhere useful.
 */
export default function App(): JSX.Element {
  const { session } = useLang()
  const { path } = useRoute()

  if (!session) return <LoginPage />

  const page =
    path === '/munshiji' ? (
      <MunshijiPage />
    ) : path === '/khata' ? (
      <KhataPage />
    ) : path === '/yaad' ? (
      <YaadPage />
    ) : (
      <DukaanPage />
    )

  return (
    <div className="app">
      <Header />
      <div className="app__page">{page}</div>
      <BottomNav />
    </div>
  )
}
