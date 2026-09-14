import { useIstClock } from '../hooks/useIstClock'
import { useTheme } from '../hooks/useTheme'
import { useApp } from '../state/store'
import { MoonIcon, MuteIcon, SoundIcon, SunIcon } from './Icons'

/** The three sponsor platforms whose mode the judges are looking for. */
const SPONSORS: Array<{ key: string; label: string; role: string }> = [
  { key: 'sarvam', label: 'Sarvam', role: 'voice + LLM' },
  { key: 'cognee', label: 'Cognee', role: 'graph memory' },
  { key: 'n8n', label: 'n8n', role: 'actions' },
]

function averageLatency(latencies: number[]): number {
  if (!latencies.length) return 0
  return Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
}

export function Header(): JSX.Element {
  const {
    health,
    dashboard,
    merchantHealth,
    usingFixtures,
    fixtureReason,
    liveStatus,
    muted,
    toggleMute,
    reconnect,
  } = useApp()
  const clock = useIstClock()
  const { resolved, toggle } = useTheme()

  const shopName = dashboard?.merchant.shop_name ?? 'Sharma General Store'
  const locality = dashboard?.merchant.locality ?? 'Lajpat Nagar II'
  const city = dashboard?.merchant.city ?? 'New Delhi'
  const latency = averageLatency((health?.providers ?? []).map((provider) => provider.latency_ms))

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand__mark deva" aria-hidden="true">
          मु
        </div>
        <div className="brand__text">
          <div className="brand__name">{shopName}</div>
          <div className="brand__meta">
            <span>
              {locality}, {city}
            </span>
            <span aria-hidden="true">·</span>
            <b className="deva">मुंशीजी</b>
            {usingFixtures ? null : (
              <>
                <span aria-hidden="true">·</span>
                <span className="mono">{liveStatus === 'streaming' ? 'SSE live' : liveStatus}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="providers" role="group" aria-label="Provider status">
        {SPONSORS.map((sponsor) => {
          const mode = health?.sponsors?.[sponsor.key] ?? 'local'
          const live = mode === 'live'
          return (
            <div key={sponsor.key} className={`provider${live ? ' provider--live' : ''}`}>
              <span className="provider__dot" aria-hidden="true" />
              <span className="provider__name">{sponsor.label}</span>
              <span className="provider__mode">{mode}</span>
              <span className="sr-only">
                {sponsor.label} ({sponsor.role}) is running {mode}
              </span>
            </div>
          )
        })}
        <div className="providers__latency">
          <b className="tabular">{latency}ms</b>
          <span>avg</span>
        </div>
      </div>

      <div className="topbar__right">
        {usingFixtures ? (
          <span className="demochip" title={fixtureReason || 'VITE_USE_FIXTURES'}>
            demo data
            <button type="button" onClick={reconnect}>
              retry live
            </button>
          </span>
        ) : null}

        {/*
          The lender-facing read of the shop, kept permanently on screen. It is the answer to
          "why would Paytm care", and it belongs where a glance finds it rather than behind a
          question someone has to think to ask.
        */}
        {merchantHealth ? (
          <div
            className={`sehat sehat--${merchantHealth.band}`}
            title={
              merchantHealth.dimensions
                .map((d) => `${d.label_en}: ${d.score.toFixed(0)} — ${d.evidence}`)
                .join('\n') || undefined
            }
          >
            <div className="sehat__score tabular">{Math.round(merchantHealth.score)}</div>
            <div className="sehat__text">
              <span className="sehat__label">dukaan ki sehat</span>
              <span className="sehat__band deva">
                {merchantHealth.band_hi}
                {merchantHealth.delta ? (
                  <i className={merchantHealth.delta < 0 ? 'down' : 'up'}>
                    {merchantHealth.delta > 0 ? '+' : ''}
                    {merchantHealth.delta.toFixed(1)}
                  </i>
                ) : null}
              </span>
            </div>
          </div>
        ) : null}

        <div className="clock">
          <div className="clock__time tabular">{clock.time}</div>
          <div className="clock__date">{clock.date} IST</div>
        </div>

        <button
          type="button"
          className="iconbtn"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute MunshiJi' : 'Mute MunshiJi'}
          title={muted ? 'Unmute MunshiJi' : 'Mute MunshiJi'}
        >
          {muted ? <MuteIcon /> : <SoundIcon />}
        </button>

        <button
          type="button"
          className="iconbtn"
          onClick={toggle}
          aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
        >
          {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  )
}
