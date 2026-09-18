import { useEffect, useRef, useState, type FormEvent } from 'react'

import { MicIcon, SendIcon, StopIcon } from '../components/Icons'
import { Waveform } from '../components/Waveform'
import { useRecorder } from '../hooks/useRecorder'
import { useSpeechInput } from '../hooks/useSpeechInput'
import { speechTag, SUGGESTIONS, useLang } from '../i18n'
import { Link } from '../router'
import { useApp, type TranscriptEntry } from '../state/store'

/**
 * The copilot, full screen. The centre tab of the app because it IS the app — the pages are
 * what MunshiJi's answers look like when they need more room than a sentence.
 *
 * The tool trace ships collapsed: one muted line ("3 steps · 812ms · memory"), the full log a
 * tap away. A merchant never needs it; a judge always asks for it; both get what they came for.
 */

/** Where a reply's subject lives, for the inline "देखें →" link. Never auto-navigates. */
const TOOL_HOME: Record<string, string> = {
  get_udhaar_summary: '/khata',
  recall_memory: '/yaad',
  get_sales_summary: '/',
  compare_sales: '/',
  get_insights: '/',
}

function Trace({ entry }: { entry: TranscriptEntry }): JSX.Element | null {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  if (!entry.tool_calls.length && !entry.memory_used.length) return null

  const totalMs = entry.tool_calls.reduce((sum, call) => sum + call.latency_ms, 0)

  return (
    <div className="trace">
      <button type="button" className="trace__toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {entry.tool_calls.length} {t('chat.tools')} · {totalMs || entry.latency_ms}ms
        {entry.memory_used.length ? ` · ${t('chat.memory')} ✓` : ''}
      </button>
      {open ? (
        <div className="trace__body">
          {entry.tool_calls.map((call, index) => (
            <div key={`${entry.id}-${call.name}-${index}`} className={`trace__row${call.ok ? '' : ' trace__fail'}`}>
              <code className="trace__name">{call.name}</code>
              <span className="trace__summary">{call.summary || (call.ok ? 'ok' : 'failed')}</span>
              <span className="trace__ms tabular">{call.latency_ms}ms</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Turn({ entry }: { entry: TranscriptEntry }): JSX.Element {
  const { t, lang } = useLang()
  const merchant = entry.role === 'merchant'
  const home = merchant ? undefined : entry.tool_calls.map((call) => TOOL_HOME[call.name]).find(Boolean)

  return (
    <article
      className={[
        'turn',
        merchant ? 'turn--merchant' : 'turn--munshi',
        entry.session === 'past' ? 'turn--past' : '',
        entry.failed ? 'turn--failed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="turn__who">
        <span>{merchant ? t('chat.you') : t('chat.munshi')}</span>
        {!merchant && entry.provider ? (
          <span className={`chip chip--${entry.provider === 'live' ? 'live' : 'local'}`}>{entry.provider}</span>
        ) : null}
      </div>
      <p className={`turn__bubble${lang === 'hi' ? ' deva' : ''}`}>{entry.text}</p>

      {merchant ? null : (
        <>
          {entry.memory_used.length ? (
            <div className="memrefs">
              {entry.memory_used.slice(0, 4).map((ref) => (
                <Link className="memref" key={ref} to="/yaad">
                  {t('chat.memory')} · {ref.split(':')[0]}
                </Link>
              ))}
            </div>
          ) : null}
          <Trace entry={entry} />
          {home ? (
            <Link className="turn__go" to={home}>
              {t('chat.view')} →
            </Link>
          ) : null}
        </>
      )}
    </article>
  )
}

export function MunshijiPage(): JSX.Element {
  const { t, lang } = useLang()
  const { transcript, send, sendAudio, busy, lastError } = useApp()
  const recorder = useRecorder()
  const speech = useSpeechInput()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const stickRef = useRef(true)

  useEffect(() => {
    const node = scrollRef.current
    if (!node || !stickRef.current) return
    node.scrollTop = node.scrollHeight
  }, [transcript, busy.chat])

  const onScroll = (): void => {
    const node = scrollRef.current
    if (!node) return
    stickRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48
  }

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault()
    const text = draft
    setDraft('')
    void send(text)
  }

  const onMic = async (): Promise<void> => {
    // Browser-native recognition first: it is the only path that hears real speech without a
    // Sarvam key (Chrome / installed PWA). The recorder pipeline stays for everything else
    // and starts winning again the moment the backend's STT goes live.
    if (speech.supported) {
      if (speech.listening) {
        speech.stop()
        return
      }
      speech.start(speechTag(lang), (text) => void send(text))
      return
    }
    if (recorder.recording) {
      const blob = await recorder.stop()
      if (blob) await sendAudio(blob)
      return
    }
    await recorder.start()
  }

  const pastCount = transcript.filter((entry) => entry.session === 'past').length
  const busyVoice = busy.transcribing
  const micActive = speech.supported ? speech.listening : recorder.recording
  const micReady = speech.supported || recorder.supported
  const micLabel = micActive ? t('chat.micStop') : t('chat.micStart')

  return (
    <main className="copilot" aria-label={t('nav.munshiji')}>
      <div
        className="transcript scroll"
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
      >
        {pastCount ? <div className={`divider${lang === 'hi' ? ' deva' : ''}`}>{t('chat.pastSession')}</div> : null}
        {transcript.map((entry, index) => (
          <div key={entry.id} style={{ display: 'contents' }}>
            {index === pastCount && pastCount ? (
              <div className={`divider${lang === 'hi' ? ' deva' : ''}`}>{t('chat.todaySession')}</div>
            ) : null}
            <Turn entry={entry} />
          </div>
        ))}
        {busy.chat ? (
          <div className="turn turn--munshi">
            <div className="turn__who">
              <span>{t('chat.munshi')}</span>
              <span aria-hidden="true">·</span>
              <span>{t('chat.thinking')}</span>
            </div>
            <p className="turn__bubble">
              <span className="thinking" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <form className="composer" onSubmit={onSubmit}>
        {speech.supported ? null : (
          <Waveform analyserRef={recorder.analyserRef} active={recorder.recording} />
        )}

        <div className="prompts">
          {SUGGESTIONS[lang].map((prompt) => (
            <button
              key={prompt}
              type="button"
              className={lang === 'hi' ? 'deva' : ''}
              onClick={() => void send(prompt)}
              disabled={busy.chat}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="composer__row">
          <button
            type="button"
            className={`mic${micActive ? ' mic--on' : ''}`}
            onClick={() => void onMic()}
            aria-pressed={micActive}
            aria-label={micLabel}
            title={micReady ? micLabel : t('chat.micMissing')}
            disabled={!micReady || busy.chat || busyVoice}
          >
            {micActive ? <StopIcon /> : <MicIcon />}
          </button>
          <input
            className={`composer__input${lang === 'hi' ? ' deva' : ''}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.placeholder')}
            disabled={busy.chat}
          />
          <button type="submit" className="btn btn--primary" disabled={busy.chat || !draft.trim()}>
            <SendIcon /> {t('chat.send')}
          </button>
        </div>

        <div className="composer__hint" role="status">
          {micActive ? (
            <span className="listening">
              <span className="dot" aria-hidden="true" /> {t('chat.listening')}
            </span>
          ) : busyVoice ? (
            <span>{t('chat.transcribing')}</span>
          ) : null}
          {recorder.error ? <strong>{recorder.error}</strong> : null}
          {speech.error ? <strong>{speech.error}</strong> : null}
          {lastError ? <span className="mono">{lastError}</span> : null}
        </div>
      </form>
    </main>
  )
}
