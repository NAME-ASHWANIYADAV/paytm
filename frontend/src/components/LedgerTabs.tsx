import { Link, ROUTES, useRoute } from '../router'

/**
 * The index tabs down the edge of a bahi khata.
 *
 * The active tab joins the page surface with no dividing border, the way a real register's
 * section tab does. This is the one bold structural element in the design, and it earns its
 * place twice: it is true to the subject, and reading the tabs tells a visitor what the product
 * does before they click anything.
 */
export function LedgerTabs(): JSX.Element {
  const { path } = useRoute()
  return (
    <nav className="tabs" aria-label="Sections">
      {ROUTES.map((route) => {
        const active = route.path === path
        return (
          <Link
            key={route.path}
            to={route.path}
            className={active ? 'tab tab--on' : 'tab'}
            aria-current={active ? 'page' : undefined}
          >
            <span className="tab__hi deva" lang="hi">
              {route.nameHi}
            </span>
            <span className="tab__en">{route.nameEn}</span>
          </Link>
        )
      })}
    </nav>
  )
}
