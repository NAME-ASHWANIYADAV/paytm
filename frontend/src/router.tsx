import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react'

import type { StringKey } from './i18n'

/**
 * A four-route app does not need a routing engine.
 *
 * The project keeps `react` and `react-dom` as its only runtime dependencies, which is a
 * deliberate property rather than an accident, and everything below fits in one screen of code.
 * Paths rather than hashes, because the URL is visible during a demo and `/#/khata` reads as a
 * prototype — the cost is a rewrite rule on the host, which `vercel.json` carries.
 */

export interface RouteDef {
  path: string
  /** i18n key for the tab label — the picked language decides what the tab says. */
  nameKey: StringKey
}

/** The bottom navigation. `/yaad` is deliberately absent: it is reached from memory chips in
 * the conversation, not browsed to — the graph is an explanation, not a daily page. */
export const NAV_TABS: readonly RouteDef[] = [
  { path: '/', nameKey: 'nav.dukaan' },
  { path: '/munshiji', nameKey: 'nav.munshiji' },
  { path: '/khata', nameKey: 'nav.khata' },
]

interface RouterValue {
  path: string
  /** Current query string, no leading `?`. Deep links like /yaad?focus=… read from here. */
  search: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterValue | null>(null)

/** Trailing slashes are stripped so `/khata/` and `/khata` are the same page. */
function normalise(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path || '/'
}

function readLocation(): { path: string; search: string } {
  return {
    path: normalise(window.location.pathname),
    search: window.location.search.replace(/^\?/, ''),
  }
}

export function RouterProvider({ children }: { children: ReactNode }): JSX.Element {
  const [location, setLocation] = useState(readLocation)

  useEffect(() => {
    const onPop = (): void => setLocation(readLocation())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: string) => {
    const url = new URL(to, window.location.origin)
    const next = { path: normalise(url.pathname), search: url.search.replace(/^\?/, '') }
    const current = readLocation()
    if (next.path === current.path && next.search === current.search) return
    window.history.pushState(null, '', url.pathname + url.search)
    setLocation(next)
  }, [])

  const value = useMemo(
    () => ({ path: location.path, search: location.search, navigate }),
    [location, navigate],
  )
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRoute(): RouterValue {
  const value = useContext(RouterContext)
  if (value === null) throw new Error('useRoute must be used inside <RouterProvider>')
  return value
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }

/**
 * Intercepts a plain left-click and lets every modified click through, so middle-click and
 * ctrl-click still open a page in a new tab — a judge poking around should not be trapped.
 */
export function Link({ to, onClick, children, ...rest }: LinkProps): JSX.Element {
  const { navigate } = useRoute()
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return
        }
        event.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
