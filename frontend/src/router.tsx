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

/**
 * A five-route app does not need a routing engine.
 *
 * The project keeps `react` and `react-dom` as its only runtime dependencies, which is a
 * deliberate property rather than an accident, and everything below fits in one screen of code.
 * Paths rather than hashes, because the URL is visible during a demo and `/#/sehat` reads as a
 * prototype — the cost is a rewrite rule on the host, which `vercel.json` carries.
 */

export interface RouteDef {
  path: string
  /** What the tab says. */
  nameHi: string
  /** The gloss underneath it, for anyone who does not read Devanagari. */
  nameEn: string
}

export const ROUTES: readonly RouteDef[] = [
  { path: '/', nameHi: 'बात-चीत', nameEn: 'the call' },
  { path: '/salah', nameHi: 'सलाह', nameEn: 'advice' },
  { path: '/kaam', nameHi: 'काम', nameEn: 'actions' },
  { path: '/yaaddasht', nameHi: 'याददाश्त', nameEn: 'memory' },
  { path: '/sehat', nameHi: 'सेहत', nameEn: 'health' },
]

interface RouterValue {
  path: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterValue | null>(null)

/** Trailing slashes are stripped so `/sehat/` and `/sehat` are the same page. */
function normalise(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path || '/'
}

export function RouterProvider({ children }: { children: ReactNode }): JSX.Element {
  const [path, setPath] = useState(() => normalise(window.location.pathname))

  useEffect(() => {
    const onPop = (): void => setPath(normalise(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: string) => {
    const next = normalise(to)
    if (next === normalise(window.location.pathname)) return
    window.history.pushState(null, '', next)
    setPath(next)
  }, [])

  const value = useMemo(() => ({ path, navigate }), [path, navigate])
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
