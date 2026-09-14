import { useState, type FormEvent } from 'react'

import { useRecorder } from '../hooks/useRecorder'
import { Link } from '../router'
import { useApp } from '../state/store'
import { MicIcon, SendIcon, StopIcon } from './Icons'

/**
 * The conversation, kept within reach on every page that is not the call itself.
 *
 * This product's thesis is that it is a conversation; a page where the conversation disappears
 * quietly argues the opposite. But squeezing the full call panel into a strip did not work — it
 * carries a header, a scrollback, a tool trace and suggestion chips, none of which fit or belong
 * here. So this is its own thing: the last thing MunshiJi said, and somewhere to answer it.
 */
export function CallStrip(): JSX.Element {
  const { transcript, send, sendAudio, busy } = useApp()
  const recorder = useRecorder()
  const [draft, setDraft] = useState('')

  const last = [...transcript].reverse().find((entry) => entry.role === 'munshi')

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

  return (
    <aside className="callstrip" aria-label="Live call">
      <Link to="/" className="callstrip__said" title={last?.text ?? ''}>
        <span className="callstrip__who">MunshiJi</span>
        <span className="callstrip__text deva" lang="hi">
          {busy.chat ? 'soch raha hoon…' : (last?.text ?? 'Kuch bhi poochhiye.')}
        </span>
      </Link>

      <form className="callstrip__ask" onSubmit={onSubmit}>
        <button
          type="button"
          className={recorder.recording ? 'iconbtn iconbtn--on' : 'iconbtn'}
          onClick={() => void onMic()}
          aria-label={recorder.recording ? 'Recording bandh karein' : 'Bolkar poochhein'}
          disabled={busy.transcribing}
        >
          {recorder.recording ? <StopIcon /> : <MicIcon />}
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Yahin se poochh lijiye…"
          aria-label="MunshiJi se poochhiye"
        />
        <button type="submit" className="btn btn--sm" disabled={busy.chat || !draft.trim()}>
          <SendIcon /> Bhejo
        </button>
      </form>
    </aside>
  )
}
