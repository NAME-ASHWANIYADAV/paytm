import { useEffect, useRef, useState } from 'react'

import { useLang } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { useApp } from '../state/store'
import { CrossIcon, MoonIcon, MuteIcon, SoundIcon, SunIcon } from './Icons'

/**
 * A slim app bar: the shop, and one quiet status dot.
 *
 * Everything an engineer finds interesting — provider modes, reconnects, the theme, the
 * language — lives behind the dot, in one sheet. The merchant's screen shows the shop; the
 * plumbing shows itself only when asked, which is also exactly where a presenter taps when a
 * judge asks "what is actually live right now?".
 */

const SPONSORS: Array<{ key: string; label: string; role: string }> = [
  { key: 'sarvam', label: 'Sarvam', role: 'voice + LLM' },
  { key: 'cognee', label: 'Cognee', role: 'graph memory' },
  { key: 'n8n', label: 'n8n', role: 'actions' },
]

export function Header(): JSX.Element {
  const { t, lang, signOut } = useLang()
  const { health, dashboard, usingFixtures, liveStatus, muted, toggleMute, reconnect } = useApp()
  const { resolved, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const shopName = dashboard?.merchant.shop_name ?? 'Sharma General Store'
  const locality = dashboard?.merchant.locality ?? ''

  const anyLive = (health?.providers ?? []).some((provider) => provider.mode === 'live' && provider.ok)
  const streaming = liveStatus === 'streaming'

  return (
    <header className="appbar">
      <div className="appbar__brand">
        <span className="appbar__mark deva" aria-hidden="true">
          मु
        </span>
        <span className="appbar__text">
          <b>{shopName}</b>
          {locality ? <small>{locality}</small> : null}
        </span>
      </div>

      <button
        type="button"
        className="appbar__status"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t('sheet.title')}
      >
        <span
          className={`statusdot ${anyLive ? 'statusdot--live' : ''} ${usingFixtures ? 'statusdot--demo' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          className="sheetveil"
          onClick={(event) => {
            if (!sheetRef.current?.contains(event.target as Node)) setOpen(false)
          }}
        >
          <div className="sheet" role="dialog" aria-label={t('sheet.title')} ref={sheetRef}>
            <div className="sheet__head">
              <b>{t('sheet.title')}</b>
              <button type="button" className="iconbtn" onClick={() => setOpen(false)} aria-label={t('sheet.close')}>
                <CrossIcon />
              </button>
            </div>

            <div className="sheet__section">
              <div className="sheet__label">{t('sheet.providers')}</div>
              {SPONSORS.map((sponsor) => {
                const mode = health?.sponsors?.[sponsor.key] ?? 'local'
                const live = mode === 'live'
                return (
                  <div key={sponsor.key} className="sheet__row">
                    <span className={`statusdot ${live ? 'statusdot--live' : ''}`} aria-hidden="true" />
                    <span className="sheet__name">{sponsor.label}</span>
                    <span className="sheet__role">{sponsor.role}</span>
                    <span className={`sheet__mode ${live ? 'sheet__mode--live' : ''}`}>
                      {live ? t('sheet.live') : t('sheet.local')}
                    </span>
                  </div>
                )
              })}
              {usingFixtures ? (
                <div className="sheet__row">
                  <span className="statusdot statusdot--demo" aria-hidden="true" />
                  <span className="sheet__name">{t('sheet.demo')}</span>
                  <button type="button" className="btn btn--sm btn--ghost" onClick={reconnect}>
                    {t('sheet.retry')}
                  </button>
                </div>
              ) : (
                <div className="sheet__row">
                  <span className={`statusdot ${streaming ? 'statusdot--live' : ''}`} aria-hidden="true" />
                  <span className="sheet__name">SSE</span>
                  <span className="sheet__role">{liveStatus}</span>
                </div>
              )}
            </div>

            <div className="sheet__section">
              <button type="button" className="sheet__action" onClick={toggleMute}>
                {muted ? <MuteIcon /> : <SoundIcon />}
                <span>{muted ? t('sheet.sound.off') : t('sheet.sound.on')}</span>
              </button>
              <button type="button" className="sheet__action" onClick={toggle}>
                {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
                <span>{resolved === 'dark' ? t('sheet.theme.dark') : t('sheet.theme.light')}</span>
              </button>
              <button type="button" className="sheet__action" onClick={signOut}>
                <span className="sheet__lang" aria-hidden="true">
                  {lang === 'hi' ? 'अ' : 'A'}
                </span>
                <span>{t('sheet.language')}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
