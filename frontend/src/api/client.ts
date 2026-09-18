/**
 * The only place in the app that talks HTTP.
 *
 * Fallback contract (the reason this file exists):
 *   VITE_USE_FIXTURES = 1 | true   → never touch the network, always fixtures
 *   VITE_USE_FIXTURES = 0 | false  → live only, errors propagate (backend debugging)
 *   anything else / unset          → `auto`: try live once; the first failure flips the whole
 *                                    session to fixtures so we make exactly one failing request,
 *                                    and the UI raises its "demo data" chip.
 *
 * `retryLive()` clears the offline latch, so the moment the backend comes up the same screen
 * goes live without a reload.
 */

import {
  demoActions,
  demoApprove,
  demoChat,
  demoDashboard,
  demoMerchantHealth as fixtureMerchantHealth,
  demoGraph,
  demoHealth,
  demoInsights,
  demoKhata,
  demoRefreshInsights,
  demoReject,
  demoSearch,
  demoSpeak,
  demoTranscribe,
} from './demoEngine'
import type {
  ActionListOut,
  ActionOut,
  ChatIn,
  DashboardOut,
  GraphOut,
  HealthOut,
  InsightListOut,
  KhataOut,
  MemorySearchIn,
  MemorySearchOut,
  LoginOut,
  ShopsOut,
  SpeakIn,
  SpeakOut,
  TranscribeOut,
  TurnResultOut,
  MerchantHealthOut,
} from './types'

export type DataSource = 'live' | 'fixture'
export type FixtureMode = 'auto' | 'always' | 'never'

export interface ApiResult<T> {
  data: T
  source: DataSource
}

export interface ClientStatus {
  mode: FixtureMode
  /** True once the session has settled on fixtures. */
  usingFixtures: boolean
  /** Why we fell back, for the tooltip on the demo-data chip. */
  reason: string
  checkedAt: number
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

/**
 * The API resolves `default` to the only merchant in a seeded database, so the screen works
 * against a fresh backend without being told an id. Using the fixture id here instead would 404
 * against every live route and silently latch the whole session to demo data.
 */
export const MERCHANT_ID = import.meta.env.VITE_MERCHANT_ID || 'default'

/**
 * The shop this session is signed into. `'default'` until a login succeeds, after which every
 * endpoint below addresses the real merchant id — that is what makes three seeded shops three
 * different apps rather than three names for the first one.
 */
let activeMerchantId: string = MERCHANT_ID

export function setActiveMerchant(id: string | null | undefined): void {
  activeMerchantId = id && id.trim() ? id : MERCHANT_ID
}

export function activeMerchant(): string {
  return activeMerchantId
}

function readMode(): FixtureMode {
  const raw = (import.meta.env.VITE_USE_FIXTURES ?? 'auto').toLowerCase().trim()
  if (raw === '1' || raw === 'true' || raw === 'always' || raw === 'on') return 'always'
  if (raw === '0' || raw === 'false' || raw === 'never' || raw === 'off') return 'never'
  return 'auto'
}

const MODE = readMode()

let status: ClientStatus = {
  mode: MODE,
  usingFixtures: MODE === 'always',
  reason: MODE === 'always' ? 'VITE_USE_FIXTURES=1' : '',
  checkedAt: Date.now(),
}

const listeners = new Set<(next: ClientStatus) => void>()

function publish(next: Partial<ClientStatus>): void {
  status = { ...status, ...next, checkedAt: Date.now() }
  listeners.forEach((listener) => listener(status))
}

export function getClientStatus(): ClientStatus {
  return status
}

export function subscribeClientStatus(listener: (next: ClientStatus) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Drop the offline latch so the next call tries the API again. */
export function retryLive(): void {
  if (MODE === 'always') return
  publish({ usingFixtures: false, reason: '' })
}

/*
 * The latch heals itself. Latching exists so a dead backend is not sprayed with doomed
 * requests — but a backend that was merely cold-starting comes back a minute later, and a
 * merchant should not have to find a Reconnect button to get their real shop back. While
 * latched, one quiet health probe runs every 15s; the first success lifts the latch, and the
 * store reloads everything the moment it sees the flip.
 */
let probeTimer: number | null = null

function ensureProbe(): void {
  if (MODE !== 'auto' || probeTimer !== null) return
  probeTimer = window.setInterval(() => {
    if (!status.usingFixtures) {
      if (probeTimer !== null) window.clearInterval(probeTimer)
      probeTimer = null
      return
    }
    void call<HealthOut>('/api/health', { timeoutMs: 30_000 })
      .then(() => publish({ usingFixtures: false, reason: '' }))
      .catch(() => {
        /* still down — probe again next tick */
      })
  }, 15_000)
}

/* ------------------------------------------------------------------- transport */

class ApiError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

interface CallOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  formData?: FormData
  timeoutMs?: number
}

async function call<T>(path: string, options: CallOptions = {}): Promise<T> {
  // Render's free tier cold-starts in 30-60s; a 4s default was one sleepy dyno away from
  // latching every fresh phone session onto demo data.
  const { method = 'GET', body, formData, timeoutMs = 25_000 } = options
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: formData ? undefined : body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
    })
    if (response.status === 204) {
      // The dev proxy answers 204 when FastAPI is not listening (see vite.config.ts).
      // Drain the empty body first so the network log shows a clean 204, not an abort.
      await response.arrayBuffer()
      throw new ApiError('backend offline', 204)
    }
    if (!response.ok) {
      throw new ApiError(`${method} ${path} → ${response.status}`, response.status)
    }
    return (await response.json()) as T
  } finally {
    window.clearTimeout(timer)
  }
}

function describe(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof DOMException && error.name === 'AbortError') return 'request timed out'
  if (error instanceof Error) return error.message
  return 'unknown error'
}

/**
 * Run `live`, fall back to `fixture`. The first failure latches the session to fixtures so we
 * never spray failing requests at a backend that is not there.
 */
async function resolve<T>(live: () => Promise<T>, fixture: () => T): Promise<ApiResult<T>> {
  if (MODE === 'always' || status.usingFixtures) {
    return { data: fixture(), source: 'fixture' }
  }
  try {
    const data = await live()
    if (status.reason) publish({ usingFixtures: false, reason: '' })
    return { data, source: 'live' }
  } catch (error) {
    if (MODE === 'never') throw error
    publish({ usingFixtures: true, reason: describe(error) })
    ensureProbe()
    return { data: fixture(), source: 'fixture' }
  }
}

/* ------------------------------------------------------------------- endpoints */

export function getHealth(): Promise<ApiResult<HealthOut>> {
  return resolve(() => call<HealthOut>('/api/health', { timeoutMs: 30_000 }), demoHealth)
}

export function getDashboard(merchantId = activeMerchantId): Promise<ApiResult<DashboardOut>> {
  return resolve(() => call<DashboardOut>(`/api/merchant/${merchantId}/dashboard`), demoDashboard)
}

export function getMerchantHealth(
  merchantId = activeMerchantId,
): Promise<ApiResult<MerchantHealthOut>> {
  return resolve(
    () => call<MerchantHealthOut>(`/api/merchant/${merchantId}/health`),
    fixtureMerchantHealth,
  )
}

export function getKhata(merchantId = activeMerchantId): Promise<ApiResult<KhataOut>> {
  return resolve(() => call<KhataOut>(`/api/khata/${merchantId}`), demoKhata)
}

export function getInsights(merchantId = activeMerchantId): Promise<ApiResult<InsightListOut>> {
  return resolve(() => call<InsightListOut>(`/api/insights/${merchantId}`), demoInsights)
}

export function refreshInsights(merchantId = activeMerchantId): Promise<ApiResult<InsightListOut>> {
  return resolve(
    () => call<InsightListOut>(`/api/insights/${merchantId}/refresh`, { method: 'POST', timeoutMs: 12_000 }),
    demoRefreshInsights,
  )
}

export function getActions(merchantId = activeMerchantId): Promise<ApiResult<ActionListOut>> {
  return resolve(() => call<ActionListOut>(`/api/actions/${merchantId}`), demoActions)
}

export function approveAction(actionId: string, approvedBy = 'merchant'): Promise<ApiResult<ActionOut>> {
  return resolve(
    () =>
      call<ActionOut>(`/api/actions/${actionId}/approve`, {
        method: 'POST',
        body: { approved_by: approvedBy },
        timeoutMs: 12_000,
      }),
    () => demoApprove(actionId),
  )
}

export function rejectAction(actionId: string, reason = ''): Promise<ApiResult<ActionOut>> {
  return resolve(
    () => call<ActionOut>(`/api/actions/${actionId}/reject`, { method: 'POST', body: { reason }, timeoutMs: 12_000 }),
    () => demoReject(actionId, reason),
  )
}

export function postChat(input: ChatIn): Promise<ApiResult<TurnResultOut>> {
  return resolve(
    // 90s: a shop's first turn after a cold boot pays for provider warm-up + a fresh memory
    // graph, and a slow true answer beats a fast fixture one that contradicts the live panels.
    () => call<TurnResultOut>('/api/chat', { method: 'POST', body: input, timeoutMs: 90_000 }),
    () => demoChat(input.text),
  )
}

export function transcribe(audio: Blob, merchantId = activeMerchantId): Promise<ApiResult<TranscribeOut>> {
  return resolve(
    () => {
      const formData = new FormData()
      formData.append('file', audio, 'turn.webm')
      formData.append('merchant_id', merchantId)
      return call<TranscribeOut>('/api/voice/transcribe', { method: 'POST', formData, timeoutMs: 45_000 })
    },
    demoTranscribe,
  )
}

export function speak(input: SpeakIn): Promise<ApiResult<SpeakOut>> {
  return resolve(
    () => call<SpeakOut>('/api/voice/speak', { method: 'POST', body: input, timeoutMs: 15_000 }),
    () => demoSpeak(input.text),
  )
}

export function getMemoryGraph(merchantId = activeMerchantId): Promise<ApiResult<GraphOut>> {
  return resolve(() => call<GraphOut>(`/api/memory/${merchantId}/graph`), demoGraph)
}

export function searchMemory(input: MemorySearchIn, merchantId = activeMerchantId): Promise<ApiResult<MemorySearchOut>> {
  return resolve(
    () => call<MemorySearchOut>(`/api/memory/${merchantId}/search`, { method: 'POST', body: input, timeoutMs: 8000 }),
    () => demoSearch(input.query, input.limit ?? 6),
  )
}

/** URL of the SSE stream; `null` when the session is running on fixtures. */
export function eventsUrl(merchantId = activeMerchantId): string | null {
  if (MODE === 'always' || status.usingFixtures) return null
  return `${API_BASE}/api/events/${merchantId}`
}

/* ------------------------------------------------------------------- auth */

/** The seeded shops, mirrored from `seed/profiles.py` for when the API is unreachable. */
const OFFLINE_SHOPS: ShopsOut = {
  shops: [
    {
      merchant_id: 'default',
      shop_name: 'Sharma General Store',
      owner_name: 'Rajesh Sharma',
      category: 'kirana',
      city: 'Delhi',
      locality: 'Lajpat Nagar',
      phone: '+919811034572',
    },
    {
      merchant_id: '',
      shop_name: 'Gupta Medical Store',
      owner_name: 'Anita Gupta',
      category: 'pharmacy',
      city: 'Delhi',
      locality: 'Malviya Nagar',
      phone: '+919873046521',
    },
    {
      merchant_id: '',
      shop_name: 'Khan Mobile Point',
      owner_name: 'Imran Khan',
      category: 'mobile',
      city: 'Delhi',
      locality: 'Karol Bagh',
      phone: '+919811207344',
    },
  ],
  demo_password: 'munshi123',
}

export function getShops(): Promise<ApiResult<ShopsOut>> {
  return resolve(
    () => call<ShopsOut>('/api/auth/shops', { timeoutMs: 12_000 }),
    () => OFFLINE_SHOPS,
  )
}

export type LoginResult =
  | { outcome: 'ok'; data: LoginOut }
  | { outcome: 'invalid' }
  | { outcome: 'offline' }

/**
 * Deliberately NOT routed through `resolve()`: a wrong password must never be papered over
 * with a fixture "success". 401 → invalid; anything else (cold start, no network) → offline,
 * and the caller decides whether to offer the demo-mode door.
 */
export async function loginApi(phone: string, password: string): Promise<LoginResult> {
  try {
    const data = await call<LoginOut>('/api/auth/login', {
      method: 'POST',
      body: { phone, password },
      timeoutMs: 30_000,
    })
    return { outcome: 'ok', data }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) return { outcome: 'invalid' }
    return { outcome: 'offline' }
  }
}
