/**
 * TypeScript mirrors of the backend Pydantic DTOs.
 *
 * Source of truth: `backend/munshiji/schemas/*.py` and `backend/munshiji/db/enums.py`.
 * Keep the field names byte-identical to the JSON the API emits — nothing here is renamed
 * or camel-cased on the way in.
 *
 * Money rule (SPEC.md §2.3 / §5): every monetary value arrives as a `Money` object that is
 * *already formatted* by the backend. The UI renders `display` / `short` and never does
 * currency maths or formatting of its own.
 *
 * `datetime` / `date` fields arrive as ISO-8601 strings (IST-offset aware).
 */

/* ------------------------------------------------------------------ enums */

export type PaymentMethod = 'upi' | 'card' | 'cash' | 'soundbox' | 'wallet'
export type Channel = 'shop' | 'online' | 'phone'
export type ConversationChannel = 'voice' | 'text' | 'whatsapp'
export type KhataStatus = 'open' | 'partial' | 'settled' | 'written_off'

export type InsightKind =
  | 'collection_anomaly'
  | 'dormant_customers'
  | 'dead_stock'
  | 'stockout_risk'
  | 'expiry_risk'
  | 'udhaar_overdue'
  | 'festival_prep'
  | 'peak_hour'
  | 'margin_leak'
  | 'payment_mix'
  | 'new_customer_drop'

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type ActionStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'executed'
  | 'failed'
  | 'expired'

export type TurnRole = 'merchant' | 'munshi' | 'tool' | 'system'
export type Tone = 'gentle' | 'standard' | 'firm'

export type MemoryKind =
  | 'merchant'
  | 'customer'
  | 'product'
  | 'day'
  | 'action'
  | 'insight'
  | 'note'
  | 'conversation'

/** `provider` fields are plain strings server-side; `live` / `local` are the values we style. */
export type ProviderTag = 'live' | 'local'

/** JSON blobs (`metrics`, `params`, `attrs`, `result`) — unknown, never `any`. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = Record<string, JsonValue>

/* ----------------------------------------------------------------- common */

/** schemas/common.py :: Money */
export interface Money {
  paise: number
  display: string
  short: string
}

/** schemas/common.py :: Meta */
export interface Meta {
  provider: string
  latency_ms: number
  as_of: string
  extra: JsonObject
}

/* ----------------------------------------------------------------- health */

/** schemas/health.py :: ProviderStatusOut */
export interface ProviderStatusOut {
  name: string
  kind: string
  mode: string
  ok: boolean
  detail: string
  latency_ms: number
}

/** schemas/health.py :: HealthOut */
export interface HealthOut {
  status: string
  version: string
  env: string
  provider_mode: string
  providers: ProviderStatusOut[]
  /** `{ sarvam: 'live' | 'local', cognee: …, n8n: … }` */
  sponsors: Record<string, string>
  database_ready: boolean
  merchant_id: string | null
  checked_at: string
}

/* --------------------------------------------------------------- merchant */

/** schemas/merchant.py :: MerchantOut */
export interface MerchantOut {
  id: string
  owner_name: string
  shop_name: string
  category: string
  city: string
  locality: string
  language: string
  phone: string
  soundbox_id: string
  business_hours_start: number
  business_hours_end: number
}

/** schemas/merchant.py :: SparkPoint */
export interface SparkPoint {
  /** ISO date, `YYYY-MM-DD`. */
  day: string
  weekday: string
  collection: Money
  transactions: number
  is_today: boolean
}

/** schemas/merchant.py :: PaymentMixSlice */
export interface PaymentMixSlice {
  method: string
  share_pct: number
  amount: Money
}

/** schemas/merchant.py :: TodaySnapshot */
export interface TodaySnapshot {
  day: string
  weekday_en: string
  weekday_hi: string
  collected: Money
  transactions: number
  unique_customers: number
  average_ticket: Money
  projected_close: Money | null
  projection_confidence: number
  baseline: Money | null
  delta_pct: number | null
  robust_z: number | null
  day_progress: number
  is_too_early_to_project: boolean
}

/** schemas/merchant.py :: DashboardOut */
export interface DashboardOut {
  merchant: MerchantOut
  today: TodaySnapshot
  sparkline: SparkPoint[]
  payment_mix: PaymentMixSlice[]
  open_udhaar: Money
  open_udhaar_count: number
  low_stock_count: number
  dormant_customer_count: number
  pending_action_count: number
  generated_at: string
  meta: Meta
}

/* ---------------------------------------------------------------- insight */

/** schemas/insight.py :: InsightOut */
export interface InsightOut {
  id: string
  kind: InsightKind
  severity: Severity
  title_en: string
  title_hi: string
  body_en: string
  body_hi: string
  metrics: JsonObject
  suggested_tool: string | null
  suggested_params: JsonObject
  impact: Money
  confidence: number
  score: number
  status: string
  created_at: string
}

/** schemas/insight.py :: InsightListOut */
export interface InsightListOut {
  insights: InsightOut[]
  total_impact: Money
  meta: Meta
}

/* ----------------------------------------------------------------- action */

/** schemas/action.py :: OutcomeOut */
export interface OutcomeOut {
  metric: string
  value_num: number | null
  value: Money | null
  note: string
  observed_at: string
}

/** schemas/action.py :: ActionOut */
export interface ActionOut {
  id: string
  tool_name: string
  status: ActionStatus
  summary_en: string
  summary_hi: string
  params: JsonObject
  target_count: number
  estimated_impact: Money
  /** What sending this costs (munshiji/economics.py). */
  estimated_cost: Money
  /** Expected return less that cost. Negative means do not do it. */
  net_expected: Money
  requested_at: string
  decided_at: string | null
  executed_at: string | null
  provider: string
  error: string
  result: JsonObject
  outcomes: OutcomeOut[]
  requires_approval: boolean
}

/** schemas/action.py :: ActionListOut */
export interface ActionListOut {
  actions: ActionOut[]
  pending_count: number
  meta: Meta
}

/** schemas/action.py :: ApproveIn */
export interface ApproveIn {
  approved_by: string
}

/** schemas/action.py :: RejectIn */
export interface RejectIn {
  reason: string
}

/* ----------------------------------------------------------- conversation */

/** schemas/conversation.py :: ChatIn */
export interface ChatIn {
  merchant_id: string
  text: string
  conversation_id?: string | null
  language?: string | null
  speak?: boolean
}

/** schemas/conversation.py :: ToolCallOut */
export interface ToolCallOut {
  name: string
  arguments: JsonObject
  ok: boolean
  latency_ms: number
  /** Compact human-readable summary of what the tool returned — the judge-facing trace. */
  summary: string
}

/** schemas/conversation.py :: TurnOut */
export interface TurnOut {
  id: string
  seq: number
  role: TurnRole
  text: string
  text_display: string
  created_at: string
  latency_ms: number
  provider: string
}

/** schemas/conversation.py :: TurnResultOut */
export interface TurnResultOut {
  conversation_id: string
  reply: string
  reply_display: string
  language: string
  intent: string
  intent_confidence: number
  tool_calls: ToolCallOut[]
  pending_action: ActionOut | null
  executed_action: ActionOut | null
  memory_used: string[]
  audio_data_uri: string | null
  client_should_synthesise: boolean
  meta: Meta
}

/** schemas/conversation.py :: ConversationOut */
export interface ConversationOut {
  id: string
  merchant_id: string
  channel: string
  language: string
  started_at: string
  ended_at: string | null
  summary: string
  turns: TurnOut[]
}

/** schemas/conversation.py :: TranscribeOut */
export interface TranscribeOut {
  text: string
  language: string
  confidence: number
  meta: Meta
}

/** schemas/conversation.py :: SpeakIn */
export interface SpeakIn {
  text: string
  language: string
  speaker?: string | null
  pace?: number
}

/** schemas/conversation.py :: SpeakOut */
export interface SpeakOut {
  audio_data_uri: string | null
  mime_type: string
  duration_ms: number
  client_should_synthesise: boolean
  text: string
  meta: Meta
}

/* ----------------------------------------------------------------- memory */

/** schemas/memory.py :: MemorySearchIn */
export interface MemorySearchIn {
  query: string
  limit?: number
  hops?: number
  kinds?: MemoryKind[] | null
}

/** schemas/memory.py :: MemoryHitOut */
export interface MemoryHitOut {
  ref: string
  kind: MemoryKind
  label: string
  text: string
  score: number
  hops: number
  path: string[]
  occurred_at: string | null
  attrs: JsonObject
}

/** schemas/memory.py :: MemorySearchOut */
export interface MemorySearchOut {
  query: string
  hits: MemoryHitOut[]
  rendered: string
  meta: Meta
}

/** schemas/memory.py :: GraphNodeOut */
export interface GraphNodeOut {
  id: string
  ref: string
  kind: string
  label: string
  text: string
  attrs: JsonObject
}

/** schemas/memory.py :: GraphEdgeOut */
export interface GraphEdgeOut {
  source: string
  target: string
  rel: string
  weight: number
}

/** schemas/memory.py :: GraphOut */
export interface GraphOut {
  nodes: GraphNodeOut[]
  edges: GraphEdgeOut[]
  truncated: boolean
  meta: Meta
}

/* ------------------------------------------------------------------- SSE */

/**
 * Frames from `GET /api/events/{merchant_id}`.
 *
 * The route is not written yet, so the client accepts both shapes a FastAPI SSE endpoint
 * typically emits: a named SSE event whose `data` is the payload, or an unnamed `message`
 * whose data is `{"event": "...", "data": {...}}`.
 */
export type LiveEventName =
  | 'dashboard'
  | 'insights'
  | 'actions'
  | 'action'
  | 'turn'
  | 'health'
  | 'memory'
  | 'heartbeat'

export interface LiveEventFrame {
  event: string
  data: JsonValue
}

/** schemas/merchant.py :: HealthDimensionOut */
export interface HealthDimensionOut {
  key: string
  label_en: string
  label_hi: string
  score: number
  weight: number
  contribution: number
  evidence: string
  reason_en: string
  reason_hi: string
  metrics: Record<string, number | string>
}

/**
 * schemas/merchant.py :: HealthScoreOut
 *
 * The lender-facing read of the same engines that advise the merchant. Named for the merchant,
 * not the provider stack — `HealthOut` is already taken by provider health.
 */
export interface MerchantHealthOut {
  merchant_id: string
  score: number
  band: string
  band_hi: string
  previous_score: number | null
  delta: number | null
  weakest_dimension: string | null
  dimensions: HealthDimensionOut[]
  as_of: string
}
