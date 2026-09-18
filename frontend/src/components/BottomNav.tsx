import { useLang } from '../i18n'
import { Link, useRoute } from '../router'
import { useApp } from '../state/store'
import { LedgerIcon, MicIcon, StoreIcon } from './Icons'

/**
 * Three tabs, one raised centre. The centre button is MunshiJi itself — the same placement a
 * merchant's thumb already knows from Paytm's scan button, because the copilot is not a
 * feature of this app, it is the app. The khata tab carries a quiet amber dot while any
 * udhaar is open: money outside the drawer should never be entirely out of sight.
 */
export function BottomNav(): JSX.Element {
  const { t } = useLang()
  const { path } = useRoute()
  const { dashboard } = useApp()

  const udhaarOpen = (dashboard?.open_udhaar_count ?? 0) > 0

  return (
    <nav className="tabbar" aria-label="Main">
      <Link to="/" className={`tabbar__item${path === '/' ? ' tabbar__item--active' : ''}`}>
        <StoreIcon />
        <span>{t('nav.dukaan')}</span>
      </Link>

      <Link
        to="/munshiji"
        className={`tabbar__center${path === '/munshiji' ? ' tabbar__center--active' : ''}`}
        aria-label={t('nav.munshiji')}
      >
        <span className="tabbar__disc">
          <MicIcon size={24} />
        </span>
        <span className="tabbar__centerlabel">{t('nav.munshiji')}</span>
      </Link>

      <Link to="/khata" className={`tabbar__item${path === '/khata' ? ' tabbar__item--active' : ''}`}>
        <span className="tabbar__iconwrap">
          <LedgerIcon />
          {udhaarOpen ? <i className="tabbar__badge" aria-hidden="true" /> : null}
        </span>
        <span>{t('nav.khata')}</span>
      </Link>
    </nav>
  )
}
