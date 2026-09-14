/**
 * One store for the whole screen. No routing, no global state library — a single context
 * that owns the API calls, the live-event wiring and the conversation transcript.
 */

import { useRoute } from '../router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  approveAction,
  getActions,
  getClientStatus,
  getDashboard,
  getMerchantHealth,
  getHealth,
  getInsights,
  getMemoryGraph,
  MERCHANT_ID,
  postChat,
  refreshInsights,
  rejectAction,
  retryLive,
  searchMemory,
  subscribeClientStatus,
  transcribe,
} from '../api/client'
import { startLiveUpdates, type LiveStatus } from '../api/events'
import { fixturePastTurns } from '../api/fixtures'
import type {
  ActionListOut,
  ActionOut,
  DashboardOut,
  GraphOut,
  HealthOut,
  InsightListOut,
  JsonValue,
  MemorySearchOut,
  ToolCallOut,
  TurnResultOut,
  MerchantHealthOut,
} from '../api/types'
import { playDataUri, primeVoices, speakText, stopSpeaking } from '../lib/speech'

export interface TranscriptEntry {
  id: string
  role: 'merchant' | 'munshi'
  text: string
  at: string
  latency_ms: number
  provider: string
  tool_calls: ToolCallOut[]
  memory_used: string[]
  intent: string
  /** `past` turns came from an earlier session and sit above the divider. */
  session: 'past' | 'live'
  failed: boolean
}

interface Busy {
  chat: boolean
  insights: boolean
  transcribing: boolean
  actionId: string | null
  memory: boolean
}

export interface AppValue {
  merchantId: string
  health: HealthOut | null
  dashboard: DashboardOut | null
  /** The lender-facing read of the same engines. */
  merchantHealth: MerchantHealthOut | null
  insights: InsightListOut | null
  actions: ActionListOut | null
  graph: GraphOut | null
  memory: MemorySearchOut | null
  transcript: TranscriptEntry[]
  conversationId: string | null
  usingFixtures: boolean
  fixtureReason: string
  liveStatus: LiveStatus
  busy: Busy
  muted: boolean
  lastError: string
  toggleMute: () => void
  send: (text: string) => Promise<void>
  sendAudio: (audio: Blob) => Promise<void>
  approve: (actionId: string) => Promise<void>
  reject: (actionId: string, reason?: string) => Promise<void>
  refreshInsightFeed: () => Promise<void>
  runMemorySearch: (query: string) => Promise<void>
  reconnect: () => void
}

const AppContext = createContext<AppValue | null>(null)

function istStamp(): string {
  return `${new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 23)}+05:30`
}

let entrySeq = 0
function nextId(prefix: string): string {
  entrySeq += 1
  return `${prefix}_${entrySeq}`
}

function isRecord(value: JsonValue | null): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const MUTE_KEY = 'munshiji.muted'

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Which page a tool's answer belongs on.
 *
 * The product's claim is that MunshiJi does things, not that it describes them — so when it runs
 * a tool, the screen goes where the result lives. Asking who has gone quiet lands you on सलाह with
 * the finding open; approving an offer lands you on काम beside it. Tools that answer a question
 * about today are absent on purpose: those figures are already beside the conversation, and
 * moving the screen for them would be motion without meaning.
 */
const PAGE_FOR_TOOL: Record<string, string> = {
  get_insights: '/salah',
  find_dormant_customers: '/salah',
  get_inventory_alerts: '/salah',
  get_product_performance: '/salah',
  send_winback_offer: '/kaam',
  send_udhaar_reminder: '/kaam',
  draft_restock_order: '/kaam',
  create_payment_link: '/kaam',
  recall_memory: '/yaaddasht',
  get_merchant_health: '/sehat',
}

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const [health, setHealth] = useState<HealthOut | null>(null)
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null)
  const [merchantHealth, setMerchantHealth] = useState<MerchantHealthOut | null>(null)
  const [insights, setInsights] = useState<InsightListOut | null>(null)
  const [actions, setActions] = useState<ActionListOut | null>(null)
  const [graph, setGraph] = useState<GraphOut | null>(null)
  const [memory, setMemory] = useState<MemorySearchOut | null>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(() =>
    fixturePastTurns().map((turn) => ({
      id: turn.id,
      role: turn.role,
      text: turn.text,
      at: turn.at,
      latency_ms: turn.latency_ms,
      provider: turn.provider,
      tool_calls: turn.tool_calls,
      memory_used: turn.memory_used,
      intent: '',
      session: 'past' as const,
      failed: false,
    })),
  )
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [clientStatus, setClientStatus] = useState(getClientStatus)
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('connecting')
  const [muted, setMuted] = useState(readMuted)
  const [lastError, setLastError] = useState('')
  const [busy, setBusy] = useState<Busy>({
    chat: false,
    insights: false,
    transcribing: false,
    actionId: null,
    memory: false,
  })

  const mutedRef = useRef(muted)
  mutedRef.current = muted

  /* ---------------------------------------------------------------- loaders */

  const loadHealth = useCallback(async () => {
    const { data } = await getHealth()
    setHealth(data)
  }, [])

  const loadDashboard = useCallback(async () => {
    const { data } = await getDashboard()
    setDashboard(data)
  }, [])

  const { path, navigate } = useRoute()

  /** Follow the first tool that has a home page, unless the reader is already there. */
  const followTools = useCallback(
    (calls: ToolCallOut[]) => {
      const target = calls.map((call) => PAGE_FOR_TOOL[call.name]).find(Boolean)
      if (target && target !== path) navigate(target)
    },
    [navigate, path],
  )

  const loadMerchantHealth = useCallback(async () => {
    const { data } = await getMerchantHealth()
    setMerchantHealth(data)
  }, [])

  const loadInsights = useCallback(async () => {
    const { data } = await getInsights()
    setInsights(data)
  }, [])

  const loadActions = useCallback(async () => {
    const { data } = await getActions()
    setActions(data)
  }, [])

  const loadGraph = useCallback(async () => {
    const { data } = await getMemoryGraph()
    setGraph(data)
  }, [])

  const loadAll = useCallback(async () => {
    await loadHealth()
    await Promise.all([
      loadDashboard(),
      loadMerchantHealth(),
      loadInsights(),
      loadActions(),
      loadGraph(),
    ])
  }, [loadActions, loadDashboard, loadGraph, loadHealth, loadInsights, loadMerchantHealth])

  useEffect(() => {
    void loadAll()
    return primeVoices()
  }, [loadAll])

  useEffect(() => subscribeClientStatus(setClientStatus), [])

  /* ----------------------------------------------------------- live updates */

  const handleEvent = useCallback(
    (name: string, payload: JsonValue | null) => {
      switch (name) {
        case 'dashboard':
          if (isRecord(payload) && 'today' in payload) setDashboard(payload as unknown as DashboardOut)
          else void loadDashboard()
          break
        case 'insights.refreshed':
        case 'insights':
        case 'insight':
          if (isRecord(payload) && 'insights' in payload) setInsights(payload as unknown as InsightListOut)
          else void loadInsights()
          break
        case 'action.proposed':
        case 'action.decided':
        case 'action.executed':
        case 'actions':
        case 'action':
          if (isRecord(payload) && 'actions' in payload) {
            setActions(payload as unknown as ActionListOut)
          } else if (isRecord(payload) && 'id' in payload && 'status' in payload) {
            const updated = payload as unknown as ActionOut
            setActions((current) =>
              current
                ? {
                    ...current,
                    actions: current.actions.map((action) => (action.id === updated.id ? updated : action)),
                    pending_count: current.actions.filter((action) =>
                      action.id === updated.id
                        ? updated.status === 'pending_approval'
                        : action.status === 'pending_approval',
                    ).length,
                  }
                : current,
            )
          } else {
            void loadActions()
          }
          void loadDashboard()
          break
        case 'provider.changed':
        case 'health':
          if (isRecord(payload) && 'providers' in payload) setHealth(payload as unknown as HealthOut)
          else void loadHealth()
          break
        case 'memory.updated':
        case 'memory':
          void loadGraph()
          break
        case 'heartbeat':
        case 'ping':
        case 'turn':
          break
        default:
          void loadAll()
      }
    },
    [loadActions, loadAll, loadDashboard, loadGraph, loadHealth, loadInsights],
  )

  useEffect(() => {
    if (clientStatus.usingFixtures) {
      setLiveStatus('offline')
      return
    }
    return startLiveUpdates({
      merchantId: MERCHANT_ID,
      onEvent: handleEvent,
      onStatus: setLiveStatus,
    })
  }, [clientStatus.usingFixtures, handleEvent])

  /* ------------------------------------------------------------------ chat */

  const appendEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript((current) => [...current, entry])
  }, [])

  const voice = useCallback((result: TurnResultOut) => {
    if (mutedRef.current) return
    if (result.client_should_synthesise || !result.audio_data_uri) {
      speakText(result.reply_display || result.reply, result.language)
    } else {
      playDataUri(result.audio_data_uri)
    }
  }, [])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy.chat) return
      setLastError('')
      appendEntry({
        id: nextId('merchant'),
        role: 'merchant',
        text: trimmed,
        at: istStamp(),
        latency_ms: 0,
        provider: '',
        tool_calls: [],
        memory_used: [],
        intent: '',
        session: 'live',
        failed: false,
      })
      setBusy((current) => ({ ...current, chat: true }))
      try {
        const { data } = await postChat({
          merchant_id: MERCHANT_ID,
          text: trimmed,
          conversation_id: conversationId,
          speak: true,
        })
        setConversationId(data.conversation_id)
        appendEntry({
          id: nextId('munshi'),
          role: 'munshi',
          text: data.reply_display || data.reply,
          at: data.meta.as_of,
          latency_ms: data.meta.latency_ms,
          provider: data.meta.provider,
          tool_calls: data.tool_calls,
          memory_used: data.memory_used,
          intent: data.intent,
          session: 'live',
          failed: false,
        })
        voice(data)
        followTools(data.tool_calls)
        if (data.pending_action || data.executed_action) {
          await Promise.all([loadActions(), loadDashboard()])
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'chat failed'
        setLastError(message)
        appendEntry({
          id: nextId('munshi'),
          role: 'munshi',
          text: 'Maaf kijiye — abhi jawab nahi aa paya. Dobara poochhiye.',
          at: istStamp(),
          latency_ms: 0,
          provider: 'error',
          tool_calls: [],
          memory_used: [],
          intent: 'error',
          session: 'live',
          failed: true,
        })
      } finally {
        setBusy((current) => ({ ...current, chat: false }))
      }
    },
    [appendEntry, busy.chat, conversationId, followTools, loadActions, loadDashboard, voice],
  )

  const sendAudio = useCallback(
    async (audio: Blob) => {
      setBusy((current) => ({ ...current, transcribing: true }))
      try {
        const { data } = await transcribe(audio)
        if (data.text.trim()) {
          await send(data.text)
        } else {
          setLastError('Awaaz samajh nahi aayi — neeche type karke poochhiye.')
        }
      } catch (error) {
        setLastError(error instanceof Error ? error.message : 'transcription failed')
      } finally {
        setBusy((current) => ({ ...current, transcribing: false }))
      }
    },
    [send],
  )

  /* --------------------------------------------------------------- actions */

  const applyAction = useCallback((updated: ActionOut) => {
    setActions((current) => {
      if (!current) return current
      const next = current.actions.map((action) => (action.id === updated.id ? updated : action))
      return {
        ...current,
        actions: next,
        pending_count: next.filter((action) => action.status === 'pending_approval').length,
      }
    })
  }, [])

  const approve = useCallback(
    async (actionId: string) => {
      setBusy((current) => ({ ...current, actionId }))
      try {
        const { data } = await approveAction(actionId, 'merchant')
        applyAction(data)
        await Promise.all([loadDashboard(), loadInsights()])
      } catch (error) {
        setLastError(error instanceof Error ? error.message : 'approve failed')
      } finally {
        setBusy((current) => ({ ...current, actionId: null }))
      }
    },
    [applyAction, loadDashboard, loadInsights],
  )

  const reject = useCallback(
    async (actionId: string, reason = '') => {
      setBusy((current) => ({ ...current, actionId }))
      try {
        const { data } = await rejectAction(actionId, reason)
        applyAction(data)
        await loadDashboard()
      } catch (error) {
        setLastError(error instanceof Error ? error.message : 'reject failed')
      } finally {
        setBusy((current) => ({ ...current, actionId: null }))
      }
    },
    [applyAction, loadDashboard],
  )

  const refreshInsightFeed = useCallback(async () => {
    setBusy((current) => ({ ...current, insights: true }))
    try {
      const { data } = await refreshInsights()
      setInsights(data)
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'insight refresh failed')
    } finally {
      setBusy((current) => ({ ...current, insights: false }))
    }
  }, [])

  const runMemorySearch = useCallback(async (query: string) => {
    if (!query.trim()) return
    setBusy((current) => ({ ...current, memory: true }))
    try {
      const { data } = await searchMemory({ query, limit: 6, hops: 1 })
      setMemory(data)
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'memory search failed')
    } finally {
      setBusy((current) => ({ ...current, memory: false }))
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current
      if (next) stopSpeaking()
      try {
        window.localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      } catch {
        /* private mode — the toggle just won't persist */
      }
      return next
    })
  }, [])

  const reconnect = useCallback(() => {
    retryLive()
    void loadAll()
  }, [loadAll])

  const value = useMemo<AppValue>(
    () => ({
      merchantId: MERCHANT_ID,
      health,
      dashboard,
      merchantHealth,
      insights,
      actions,
      graph,
      memory,
      transcript,
      conversationId,
      usingFixtures: clientStatus.usingFixtures,
      fixtureReason: clientStatus.reason,
      liveStatus,
      busy,
      muted,
      lastError,
      toggleMute,
      send,
      sendAudio,
      approve,
      reject,
      refreshInsightFeed,
      runMemorySearch,
      reconnect,
    }),
    [
      actions,
      approve,
      busy,
      clientStatus.reason,
      clientStatus.usingFixtures,
      conversationId,
      dashboard,
      graph,
      health,
      insights,
      lastError,
      liveStatus,
      memory,
      muted,
      reconnect,
      refreshInsightFeed,
      reject,
      runMemorySearch,
      send,
      sendAudio,
      toggleMute,
      transcript,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside <AppProvider>')
  return value
}
