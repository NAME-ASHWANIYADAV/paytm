import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'munshiji.theme'

function readStored(): ThemeChoice {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    // Light unless the merchant explicitly chose otherwise. This brand's identity is a white
    // surface with navy ink; following the OS into dark by default handed first-time viewers
    // (and one screenshot review) a product that read as a different, worse app.
    return raw === 'light' || raw === 'dark' ? raw : 'light'
  } catch {
    return 'light'
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Theme is `system` until the merchant (or the person running the projector) picks one;
 * the choice is written to `data-theme` on <html>, which overrides the media query in both
 * directions, and persists across reloads.
 */
export function useTheme(): { choice: ThemeChoice; resolved: ResolvedTheme; toggle: () => void } {
  const [choice, setChoice] = useState<ThemeChoice>(readStored)
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => setSystem(query.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (choice === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', choice)
    try {
      if (choice === 'system') window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      /* storage blocked — the theme still applies for this session */
    }
  }, [choice])

  const resolved: ResolvedTheme = choice === 'system' ? system : choice
  const toggle = useCallback(() => {
    setChoice(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved])

  return { choice, resolved, toggle }
}
