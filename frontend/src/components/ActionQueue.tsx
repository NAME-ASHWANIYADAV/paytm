import { useEffect, useRef, useState } from 'react'

import type { ActionOut, OutcomeOut } from '../api/types'
import { useApp } from '../state/store'
import { CheckIcon, CrossIcon } from './Icons'

const TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function stamp(iso: string | null): string {
  if (!iso) return ''
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? '' : TIME.format(at)
}

/** "12 bheje · 4 laut aaye · ₹2,340" — the note the backend authored, else metric + value. */
function outcomeText(outcome: OutcomeOut): string {
  if (outcome.note) return outcome.note
  const value = outcome.value ? outcome.value.display : outcome.value_num?.toString() ?? ''
  return `${value} ${outcome.metric.replace(/_/g, ' ')}`.trim()
}

function Outcomes({ outcomes }: { outcomes: OutcomeOut[] }): JSX.Element | null {
  if (!outcomes.length) return null
  return (
    <div className="outcomes">
      <CheckIcon size={15} />
      {outcomes.map((outcome, index) => (
        <span key={`${outcome.metric}-${index}`}>
          {index ? <span className="outcomes__sep"> · </span> : null}
          <b>{outcomeText(outcome)}</b>
        </span>
      ))}
    </div>
  )
}

function ActionCard({ action }: { action: ActionOut }): JSX.Element {
  const { approve, reject, busy } = useApp()
  const [justDone, setJustDone] = useState(false)
  const previousStatus = useRef(action.status)

  useEffect(() => {
    const was = previousStatus.current
    previousStatus.current = action.status
    if (was === 'pending_approval' && action.status !== 'pending_approval') {
      setJustDone(true)
      const timer = window.setTimeout(() => setJustDone(false), 1400)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [action.status])

  const pending = action.status === 'pending_approval'
  const working = busy.actionId === action.id
  const rejected = action.status === 'rejected'
  const reason = typeof action.result.reason === 'string' ? action.result.reason : ''

  return (
    <article
      className={[
        'action',
        pending ? 'action--pending' : '',
        rejected ? 'action--rejected' : '',
        justDone ? 'action--justdone' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {pending ? (
        <div className="action__strap">
          <span>
            manzoori chahiye · <code>{action.tool_name}</code>
          </span>
          <span className="deva">मंज़ूरी बाकी</span>
        </div>
      ) : null}

      <div className="action__body">
        {pending ? null : (
          <div className="action__tool">
            <code>{action.tool_name}</code>
            <span aria-hidden="true">·</span>
            <span className={`status status--${action.status}`}>{action.status.replace(/_/g, ' ')}</span>
            <span aria-hidden="true">·</span>
            <span>{stamp(action.executed_at ?? action.decided_at ?? action.requested_at)}</span>
          </div>
        )}

        <h3 className="action__hi deva" lang="hi">
          {action.summary_hi || action.summary_en}
        </h3>
        {action.summary_en ? <div className="action__en">{action.summary_en}</div> : null}

        {/* The decision sits directly under the ask, above the supporting detail. */}
        {pending ? (
          <div className="action__buttons">
            <button
              type="button"
              className="btn btn--approve"
              onClick={() => void approve(action.id)}
              disabled={working}
              aria-label={`Approve: ${action.summary_en || action.tool_name}`}
            >
              <CheckIcon /> {working ? 'bhej raha hoon…' : 'Haan, bhej do'}
            </button>
            <button
              type="button"
              className="btn btn--reject"
              onClick={() => void reject(action.id, 'abhi nahi')}
              disabled={working}
              aria-label={`Reject: ${action.summary_en || action.tool_name}`}
            >
              <CrossIcon /> Abhi nahi
            </button>
          </div>
        ) : null}

        <div className="action__facts">
          <span className="metric">
            <b>{action.target_count}</b>
            <span>target</span>
          </span>
          {action.estimated_impact.paise > 0 ? (
            <span className="metric">
              <b>{action.estimated_impact.display}</b>
              <span>anumaanit asar</span>
            </span>
          ) : null}
          {/*
            What it costs to send, next to what it might bring back. A shopkeeper is being asked
            to spend money here, and showing only the upside would be the sales pitch, not the
            trade.
          */}
          {action.estimated_cost.paise > 0 ? (
            <span className="metric metric--cost">
              <b>{action.estimated_cost.display}</b>
              <span>bhejne ka kharch</span>
            </span>
          ) : null}
          <span className={`chip chip--${action.provider === 'live' ? 'live' : 'local'}`}>{action.provider}</span>
          {pending ? (
            <span className="metric">
              <b>{stamp(action.requested_at)}</b>
              <span>poochha</span>
            </span>
          ) : null}
          {typeof action.result.run_id === 'string' ? (
            <span className="metric">
              <b>{action.result.run_id}</b>
              <span>run</span>
            </span>
          ) : null}
        </div>

        {rejected && reason ? (
          <div className="action__en" style={{ marginTop: 8 }}>
            wajah: {reason}
          </div>
        ) : null}

        <Outcomes outcomes={action.outcomes} />
      </div>
    </article>
  )
}

export function ActionQueue(): JSX.Element {
  const { actions } = useApp()
  const list = actions?.actions ?? []
  const pending = list.filter((action) => action.status === 'pending_approval')
  const done = list.filter((action) => action.status !== 'pending_approval')

  return (
    <section className="panel area-actions" aria-label="Action queue">
      <div className="panel__head">
        <h2 className="panel__title">
          Kar deta hai <small className="deva">काम की कतार</small>
        </h2>
        {pending.length ? (
          <span className="chip chip--alert">
            <span className="dot" aria-hidden="true" /> {pending.length} manzoori baaki
          </span>
        ) : (
          <span className="chip chip--good">sab clear</span>
        )}
      </div>

      <div className="actions scroll">
        {list.length ? (
          <>
            {pending.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
            {done.length ? <div className="eyebrow">ho chuka</div> : null}
            {done.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </>
        ) : (
          <div className="empty">Abhi koi kaam kataar me nahi hai.</div>
        )}
      </div>
    </section>
  )
}
