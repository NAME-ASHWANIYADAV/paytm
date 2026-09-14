import { useEffect, useRef, useState, type FormEvent } from 'react'

import { useRecorder } from '../hooks/useRecorder'
import { voiceLabel } from '../lib/speech'
import { useApp, type TranscriptEntry } from '../state/store'
import { MicIcon, SendIcon, StopIcon } from './Icons'
import { Waveform } from './Waveform'

const TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const SUGGESTIONS = [
  'Aaj ka collection kitna hai?',
  'Pichle offer ka kya hua?',
  'Purane grahak kahan gaye?',
  'Udhaar ka kya scene hai?',
  'Stock me kya khatam ho raha hai?',
]

function clockOf(iso: string): string {
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? '' : TIME.format(at)
}

/** "Microsoft Heera - English (India)" is too long for a chip; keep the name and the tag. */
function shortVoice(): string {
  const label = voiceLabel()
  const [name = '', lang = ''] = label.split(' · ')
  const trimmed = name.replace(/^(Microsoft|Google|Apple)\s+/, '').split(/\s*[-–(]/)[0] ?? name
  return lang ? `${trimmed.trim()} · ${lang}` : trimmed.trim()
}

function Trace({ entry }: { entry: TranscriptEntry }): JSX.Element | null {
  if (!entry.tool_calls.length && !entry.memory_used.length) return null
  return (
    <div className="trace">
      {entry.tool_calls.length ? (
        <>
          <div className="trace__head">
            <span>tools chalaye</span>
            <span aria-hidden="true">·</span>
            <span>{entry.tool_calls.length}</span>
          </div>
          {entry.tool_calls.map((call, index) => (
            <div
              key={`${entry.id}-${call.name}-${index}`}
              className={`trace__row${call.ok ? '' : ' trace__fail'}`}
            >
              <code className="trace__name">{call.name}</code>
              <span className="trace__summary">{call.summary || (call.ok ? 'ok' : 'failed')}</span>
              <span className="trace__ms">{call.latency_ms}ms</span>
            </div>
          ))}
        </>
      ) : null}
      {entry.memory_used.length ? (
        <div className="trace__row" style={{ gridTemplateColumns: 'auto 1fr' }}>
          <code className="trace__name">memory</code>
          <span className="memrefs">
            {entry.memory_used.map((ref) => (
              <span className="memref" key={ref}>
                {ref}
              </span>
            ))}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function Turn({ entry }: { entry: TranscriptEntry }): JSX.Element {
  const merchant = entry.role === 'merchant'
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
        <span>{merchant ? 'Ramesh ji' : 'MunshiJi'}</span>
        <span aria-hidden="true">·</span>
        <span className="mono">{clockOf(entry.at)}</span>
        {!merchant && entry.latency_ms ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="mono">{entry.latency_ms}ms</span>
          </>
        ) : null}
        {!merchant && entry.provider ? (
          <span className={`chip chip--${entry.provider === 'live' ? 'live' : 'local'}`}>
            {entry.provider}
          </span>
        ) : null}
      </div>
      <p className="turn__bubble deva">{entry.text}</p>
      {merchant ? null : <Trace entry={entry} />}
    </article>
  )
}

export interface LiveCallProps {
  /**
   * `full` is the call page: scrollback, tool trace and suggestion chips.
   * `strip` is every other page: the last two turns and the mic, nothing else.
   */
  variant?: 'full' | 'strip'
}

export function LiveCall({ variant = 'full' }: LiveCallProps): JSX.Element {
  const { transcript, send, sendAudio, busy, lastError } = useApp()
  const recorder = useRecorder()
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
    if (recorder.recording) {
      const blob = await recorder.stop()
      if (blob) await sendAudio(blob)
      return
    }
    await recorder.start()
  }

  const pastCount = transcript.filter((entry) => entry.session === 'past').length
  const busyVoice = busy.transcribing
  const micLabel = recorder.recording ? 'Recording bandh karein' : 'Bolkar poochhein'
  const compact = variant === 'strip'
  // The strip carries the last thing said, not a transcript. Two turns needed more height than
  // a strip has, and what a viewer needs while moving between pages is the thread, not the log.
  const shown = compact ? transcript.slice(-1) : transcript

  return (
    <section
      className={
        compact
          ? 'panel area-call livecall livecall--strip'
          : 'panel panel--marked area-call livecall'
      }
      aria-label="Live call with MunshiJi"
    >
      {compact ? null : (
      <div className="panel__head">
        <h2 className="panel__title">
          Live call <small className="deva">बात-चीत</small>
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {recorder.recording ? (
            <span className="chip chip--alert">
              <span className="dot" aria-hidden="true" /> sun raha hoon
            </span>
          ) : null}
          {busyVoice ? <span className="chip">transcribing…</span> : null}
          <span className="chip" title={`speechSynthesis voice: ${voiceLabel()}`}>
            {shortVoice()}
          </span>
        </div>
      </div>
      )}

      <div className="call__body">
        <div
          className="transcript scroll"
          ref={scrollRef}
          onScroll={onScroll}
          role="log"
          aria-live="polite"
          aria-label="Conversation transcript"
        >
          {pastCount ? <div className="divider">pichli baat-cheet · 7 din pehle</div> : null}
          {shown.map((entry, index) => (
            <div key={entry.id} style={{ display: 'contents' }}>
              {index === pastCount && pastCount ? <div className="divider">aaj ki baat-cheet</div> : null}
              <Turn entry={entry} />
            </div>
          ))}
          {busy.chat ? (
            <div className="turn turn--munshi">
              <div className="turn__who">
                <span>MunshiJi</span>
                <span aria-hidden="true">·</span>
                <span className="mono">soch raha hai</span>
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
          <Waveform analyserRef={recorder.analyserRef} active={recorder.recording} />
          <div className="composer__row">
            <button
              type="button"
              className="mic"
              onClick={() => void onMic()}
              aria-pressed={recorder.recording}
              aria-label={micLabel}
              title={recorder.supported ? micLabel : 'Mic is not available in this browser'}
              disabled={!recorder.supported || busy.chat || busyVoice}
            >
              {recorder.recording ? <StopIcon /> : <MicIcon />}
            </button>
            <input
              className="composer__input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type karke poochhiye — जैसे: आज कितना आया?"
              aria-label="MunshiJi se poochhiye"
              disabled={busy.chat}
            />
            <button type="submit" className="btn" disabled={busy.chat || !draft.trim()}>
              <SendIcon /> Bhejo
            </button>
          </div>

          <div className="prompts" hidden={compact}>
            {SUGGESTIONS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => void send(prompt)} disabled={busy.chat}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="composer__hint" hidden={compact}>
            <span>
              {recorder.error ? (
                <strong>{recorder.error}</strong>
              ) : (
                'Mic dabaiye ya Enter se bhejiye — dono ek hi jagah pahunchte hain.'
              )}
            </span>
            {lastError ? <span className="mono">{lastError}</span> : null}
          </div>
        </form>
      </div>
    </section>
  )
}
