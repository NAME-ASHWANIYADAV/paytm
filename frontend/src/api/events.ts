/**
 * Live updates for the dashboard.
 *
 * Primary path: `GET /api/events/{merchant_id}` as an SSE stream. The route is still being
 * written, so we accept both frame styles a FastAPI SSE endpoint normally produces:
 *
 *   event: actions\ndata: {...}              → named event, payload is the DTO
 *   data: {"event": "actions", "data": {...}} → unnamed `message`, envelope inside
 *
 * Fallback: if the stream errors or never opens, we close it and poll every 10s instead.
 * In fixtures mode there is nothing to stream, so neither runs.
 */

import { eventsUrl } from './client'
import type { JsonValue } from './types'

export type LiveStatus = 'connecting' | 'streaming' | 'polling' | 'offline'

export interface LiveOptions {
  merchantId: string
  /** `payload` is null when the event carried nothing useful — treat it as "refetch". */
  onEvent: (name: string, payload: JsonValue | null) => void
  onStatus: (status: LiveStatus) => void
  pollMs?: number
}

/**
 * The names the API actually emits (munshiji/events.py :: EventName), plus the shorter aliases
 * kept so a stream from an older build still lands on a handler instead of a blind refetch.
 */
const NAMED_EVENTS = [
  'turn',
  'action.proposed',
  'action.decided',
  'action.executed',
  'insights.refreshed',
  'dashboard',
  'memory.updated',
  'provider.changed',
  'heartbeat',
  // Aliases.
  'insights',
  'insight',
  'actions',
  'action',
  'health',
  'memory',
  'ping',
]

function parse(raw: string): JsonValue | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as JsonValue
  } catch {
    return null
  }
}

export function startLiveUpdates(options: LiveOptions): () => void {
  const { merchantId, onEvent, onStatus, pollMs = 10_000 } = options
  const url = eventsUrl(merchantId)

  let source: EventSource | null = null
  let pollTimer: number | null = null
  let stopped = false

  const startPolling = (): void => {
    if (stopped || pollTimer !== null) return
    onStatus('polling')
    pollTimer = window.setInterval(() => onEvent('poll', null), pollMs)
  }

  if (!url) {
    onStatus('offline')
    return () => {
      stopped = true
    }
  }

  onStatus('connecting')
  source = new EventSource(url)

  source.onopen = () => {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer)
      pollTimer = null
    }
    onStatus('streaming')
  }

  source.onmessage = (event: MessageEvent<string>) => {
    const payload = parse(event.data)
    if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'event' in payload) {
      const name = String((payload as Record<string, JsonValue>).event)
      const inner = (payload as Record<string, JsonValue>).data ?? null
      onEvent(name, inner)
      return
    }
    onEvent('message', payload)
  }

  for (const name of NAMED_EVENTS) {
    source.addEventListener(name, (event: Event) => {
      const message = event as MessageEvent<string>
      onEvent(name, parse(message.data))
    })
  }

  source.onerror = () => {
    // EventSource retries on its own; we do not want a demo-day reconnect storm, so we take
    // the stream down on the first failure and switch to the 10s poll.
    source?.close()
    source = null
    startPolling()
  }

  return () => {
    stopped = true
    source?.close()
    source = null
    if (pollTimer !== null) {
      window.clearInterval(pollTimer)
      pollTimer = null
    }
  }
}
