/**
 * Offline demo engine.
 *
 * When the API is unreachable the screen must still *behave*, not just render: approving an
 * action has to change its state, asking a question has to produce a reply with a tool trace,
 * clicking a memory node has to run a retrieval. This module is that behaviour — it holds the
 * fixture payloads as mutable state and answers the same DTOs the backend will.
 *
 * Every number it speaks is read out of `fixtures.ts`, the same numbers the panels are showing.
 * Nothing here is a hardcoded demo sentence pretending to be a computation (SPEC §2.2, in spirit).
 */

import {
  fixtureActions,
  fixtureDashboard,
  fixtureGraph,
  fixtureHealth,
  fixtureInsights,
  fixtureMoney,
  todayFigures,
  fixtureMerchantHealth,
} from './fixtures'
import type {
  ActionListOut,
  ActionOut,
  DashboardOut,
  GraphOut,
  HealthOut,
  InsightListOut,
  MemoryHitOut,
  MemoryKind,
  MemorySearchOut,
  Meta,
  SpeakOut,
  ToolCallOut,
  TranscribeOut,
  TurnResultOut,
  MerchantHealthOut,
} from './types'

interface DemoState {
  dashboard: DashboardOut
  insights: InsightListOut
  actions: ActionListOut
  graph: GraphOut
  conversationId: string
  seq: number
}

const state: DemoState = {
  dashboard: fixtureDashboard(),
  insights: fixtureInsights(),
  actions: fixtureActions(),
  graph: fixtureGraph(),
  conversationId: 'cnv_01JDEMOLIVE',
  seq: 0,
}

function nowIso(): string {
  const istMillis = Date.now() + 5.5 * 3600_000
  return `${new Date(istMillis).toISOString().slice(0, 23)}+05:30`
}

function meta(latencyMs: number): Meta {
  return { provider: 'local', latency_ms: latencyMs, as_of: nowIso(), extra: { mode: 'fixtures' } }
}

function syncPendingCount(): void {
  const pending = state.actions.actions.filter((action) => action.status === 'pending_approval')
  state.actions = { ...state.actions, pending_count: pending.length }
  state.dashboard = { ...state.dashboard, pending_action_count: pending.length }
}

/* ------------------------------------------------------------------------ reads */

export function demoHealth(): HealthOut {
  return fixtureHealth()
}

export function demoDashboard(): DashboardOut {
  // Re-derive today's figures so the screen keeps moving through the business day.
  const fresh = fixtureDashboard()
  state.dashboard = { ...fresh, pending_action_count: state.dashboard.pending_action_count }
  return state.dashboard
}

export function demoMerchantHealth(): MerchantHealthOut {
  return fixtureMerchantHealth()
}

export function demoInsights(): InsightListOut {
  return state.insights
}

export function demoRefreshInsights(): InsightListOut {
  state.insights = fixtureInsights()
  return { ...state.insights, meta: meta(212) }
}

export function demoActions(): ActionListOut {
  return state.actions
}

export function demoGraph(): GraphOut {
  return state.graph
}

/* -------------------------------------------------------------------- approvals */

function transitionAction(id: string, next: 'executed' | 'rejected', reason: string): ActionOut {
  let updated: ActionOut | null = null
  state.actions = {
    ...state.actions,
    actions: state.actions.actions.map((action) => {
      if (action.id !== id) return action
      const decidedAt = nowIso()
      updated =
        next === 'executed'
          ? {
              ...action,
              status: 'executed',
              decided_at: decidedAt,
              executed_at: decidedAt,
              requires_approval: false,
              result: {
                workflow: action.tool_name,
                run_id: `run_local_${Math.floor(Date.now() / 1000) % 100000}`,
                sent: action.target_count,
                failed: 0,
              },
              outcomes: [
                {
                  metric: 'messages_sent',
                  value_num: action.target_count,
                  value: null,
                  note: `${action.target_count} bheje`,
                  observed_at: decidedAt,
                },
              ],
            }
          : {
              ...action,
              status: 'rejected',
              decided_at: decidedAt,
              requires_approval: false,
              result: { reason: reason || 'merchant ne mana kiya' },
            }
      return updated
    }),
  }
  syncPendingCount()
  if (updated) return updated
  throw new Error(`unknown action ${id}`)
}

export function demoApprove(id: string): ActionOut {
  return transitionAction(id, 'executed', '')
}

export function demoReject(id: string, reason: string): ActionOut {
  return transitionAction(id, 'rejected', reason)
}

function firstPending(): ActionOut | null {
  return state.actions.actions.find((action) => action.status === 'pending_approval') ?? null
}

/* -------------------------------------------------------------------------- chat */

function tool(name: string, args: Record<string, string | number | boolean>, summary: string, latency: number): ToolCallOut {
  return { name, arguments: args, ok: true, latency_ms: latency, summary }
}

const APPROVAL_RE = /\b(haan|haa+n|ha+n|bhej\s*do|bhejo|kar\s*do|theek\s*hai|thik\s*hai|yes|approve|ok\s*karo)\b|हाँ|हां|भेज\s*दो|कर\s*दो|ठीक\s*है/i
const RECALL_RE = /pichl|pichhl|last\s*time|kya\s*hua|nateeja|natija|result|outcome|offer\s*ka|पिछल|क्या\s*हुआ|नतीजा/i
const DORMANT_RE = /dormant|purane\s*grahak|grahak|customer|win\s*back|winback|ग्राहक|पुराने/i
const UDHAAR_RE = /udhaar|udhar|khata|credit|baaki|बकाया|उधार|खाता/i
const STOCK_RE = /stock|saman|inventory|atta|tel|oil|khatam|स्टॉक|सामान|आटा/i
const SALES_RE = /collection|kitna|kitni|bikri|sales|aaj|today|vasooli|कितना|बिक्री|वसूली|आज/i

function reply(
  text: string,
  intent: string,
  confidence: number,
  toolCalls: ToolCallOut[],
  memoryUsed: string[],
  extra: Partial<TurnResultOut> = {},
): TurnResultOut {
  state.seq += 1
  const latency = 620 + toolCalls.reduce((sum, call) => sum + call.latency_ms, 0)
  return {
    conversation_id: state.conversationId,
    reply: text,
    reply_display: text,
    language: 'hi-IN',
    intent,
    intent_confidence: confidence,
    tool_calls: toolCalls,
    pending_action: null,
    executed_action: null,
    memory_used: memoryUsed,
    audio_data_uri: null,
    client_should_synthesise: true,
    meta: meta(latency),
    ...extra,
  }
}

export function demoChat(text: string): TurnResultOut {
  const figures = todayFigures()
  const collected = fixtureMoney(figures.collectedPaise).display
  const baseline = fixtureMoney(figures.baselinePaise).display
  const projected = fixtureMoney(figures.projectedPaise).display
  const weekday = state.dashboard.today.weekday_en
  const pending = firstPending()

  if (APPROVAL_RE.test(text) && pending) {
    const executed = demoApprove(pending.id)
    return reply(
      `Ji, bhej diya — ${executed.target_count} grahakon ko offer chala gaya. Nateeja main yaad rakhunga aur agli baat-cheet me khud bataunga.`,
      'approve_action',
      0.94,
      [
        tool(
          executed.tool_name,
          { segment: 'dormant', target_count: executed.target_count },
          `approved → executed · ${executed.target_count} messages queued · ${String(executed.result.run_id ?? 'run_local')}`,
          380,
        ),
      ],
      ['action:' + executed.id],
      { executed_action: executed },
    )
  }

  if (RECALL_RE.test(text)) {
    const earlier = state.actions.actions.find(
      (action) => action.status === 'executed' && action.tool_name === 'send_winback_offer',
    )
    const sent = earlier?.outcomes.find((outcome) => outcome.metric === 'messages_sent')?.value_num ?? 12
    const returned = earlier?.outcomes.find((outcome) => outcome.metric === 'customers_returned')?.value_num ?? 4
    const recovered =
      earlier?.outcomes.find((outcome) => outcome.metric === 'revenue_recovered')?.value?.display ?? '₹2,340'
    return reply(
      `Pichle hafte jo ₹50 ka offer bheja tha — ${sent} bheje the, ${returned} laut aaye, aur ${recovered} wapas aaya. Anita Verma, Sunita Devi aur Vikas Chauhan dobara aaye. Baaki 8 ke liye ek aur offer taiyaar hai.`,
      'recall_outcome',
      0.91,
      [
        tool('recall_memory', { query: 'pichla winback offer ka nateeja' }, '3 hits · action → outcome → 3 customers · 1 hop', 44),
        tool('get_insights', { kind: 'dormant_customers' }, '12 dormant · ₹8,400 recoverable', 38),
      ],
      ['action:act_01JWINBACK01', 'note:mn_out_recovered', 'conversation:mn_conv_last'],
    )
  }

  if (DORMANT_RE.test(text)) {
    return reply(
      `12 purane grahak 4 hafte se nahi aaye — inki 90 din ki kharidari ₹28,600 thi, wapasi ki ummeed ₹8,400. ₹50 ka win-back offer taiyaar hai, bhej dun?`,
      'find_dormant_customers',
      0.89,
      [
        tool('find_dormant_customers', { window_days: 90, min_visits: 3 }, '12 dormant · median gap 9.4d · ₹8,400 recoverable', 58),
        tool('recall_memory', { query: 'winback offer history' }, 'previous offer recovered ₹2,340 from 4 customers', 31),
      ],
      ['insight:ins_01JDORMANT12', 'action:act_01JWINBACK01'],
      { pending_action: pending },
    )
  }

  if (UDHAAR_RE.test(text)) {
    return reply(
      `Kul udhaar ₹11,300 hai, 18 khaton me. Char khate 60 din se upar hain — unme ₹4,850 fansa hai, sabse purana 78 din ka. Tone standard rakhi hai, sakht nahi.`,
      'get_udhaar_summary',
      0.92,
      [
        tool('get_udhaar_summary', { buckets: '0-15,16-30,31-60,60+' }, '₹11,300 open · 18 entries · 4 past 60d = ₹4,850', 47),
      ],
      ['insight:ins_01JUDHAAR60', 'customer:mn_cus_rakesh'],
    )
  }

  if (STOCK_RE.test(text)) {
    return reply(
      `Do cheezein weekend se pehle khatam ho jayengi — Aashirvaad atta 5kg (1.8 din ka cover) aur Fortune tel 1L (2.1 din). Supplier ka lead time 2 din hai, order aaj dena hoga. Saath hi 3 SKU me ₹4,200 bina bike pade hain.`,
      'get_inventory_alerts',
      0.88,
      [
        tool('get_inventory_alerts', { horizon_days: 7 }, '2 stockout risks · 3 dead SKUs · ₹4,200 locked', 52),
      ],
      ['insight:ins_01JSTOCKOUT', 'insight:ins_01JDEADSTOCK'],
    )
  }

  if (SALES_RE.test(text)) {
    return reply(
      `Abhi tak ${collected} aaya hai. ${weekday} ka median ${baseline} hai, to hum 12% neeche chal rahe hain. Is raftaar se din ${projected} par band hoga. Sabse badi wajah: purane grahak kam aa rahe hain.`,
      'get_sales_summary',
      0.93,
      [
        tool('get_sales_summary', { period: 'today' }, `${collected} · ${figures.transactions} txns · avg ₹${Math.round(figures.averageTicketPaise / 100)}`, 49),
        tool('compare_sales', { against: 'weekday_baseline', weeks: 8 }, `baseline ${baseline} · delta −12.3% · robust z −2.14`, 63),
      ],
      ['day:mn_day_today', 'insight:ins_01JANOMALY'],
    )
  }

  return reply(
    `Aaj ${collected} aaya hai, ${weekday} ke ${baseline} se 12% kam. Do cheezein dhyan maangti hain: 12 purane grahak gayab hain (₹8,400) aur ₹4,850 ka udhaar 60 din se upar hai. Pehle kis par kaam karein?`,
    'daily_briefing',
    0.72,
    [
      tool('get_sales_summary', { period: 'today' }, `${collected} · ${figures.transactions} txns`, 44),
      tool('get_insights', { limit: 3 }, '7 open insights · ₹19,470 total impact', 39),
    ],
    ['day:mn_day_today', 'insight:ins_01JDORMANT12', 'insight:ins_01JUDHAAR60'],
    { pending_action: pending },
  )
}

export function demoTranscribe(): TranscribeOut {
  // Offline STT is not available in the browser; we say so honestly instead of faking a
  // transcript. The text box is the reliable path when the backend is not up.
  return {
    text: '',
    language: 'hi-IN',
    confidence: 0,
    meta: { provider: 'local', latency_ms: 0, as_of: nowIso(), extra: { reason: 'stt_unavailable_offline' } },
  }
}

export function demoSpeak(text: string): SpeakOut {
  return {
    audio_data_uri: null,
    mime_type: 'audio/wav',
    duration_ms: 0,
    client_should_synthesise: true,
    text,
    meta: meta(4),
  }
}

/* ------------------------------------------------------------------ memory search */

const MEMORY_KINDS: MemoryKind[] = [
  'merchant',
  'customer',
  'product',
  'day',
  'action',
  'insight',
  'note',
  'conversation',
]

function asMemoryKind(kind: string): MemoryKind {
  return MEMORY_KINDS.includes(kind as MemoryKind) ? (kind as MemoryKind) : 'note'
}

function tokenize(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
}

/**
 * A small, real BM25 over the graph's node text — the same retrieval shape the backend's
 * `memory/retrieval.py` implements, so the offline panel ranks rather than pretends.
 */
export function demoSearch(query: string, limit = 6): MemorySearchOut {
  const started = performance.now()
  const graph = state.graph
  const docs = graph.nodes.map((node) => ({ node, terms: tokenize(`${node.label} ${node.text} ${node.kind}`) }))
  const avgLength = docs.reduce((sum, doc) => sum + doc.terms.length, 0) / Math.max(1, docs.length)
  const queryTerms = tokenize(query)
  const k1 = 1.2
  const b = 0.75

  const scored = docs
    .map(({ node, terms }) => {
      let score = 0
      for (const term of queryTerms) {
        const frequency = terms.filter((candidate) => candidate === term || candidate.startsWith(term)).length
        if (!frequency) continue
        const documentFrequency = docs.filter((doc) =>
          doc.terms.some((candidate) => candidate === term || candidate.startsWith(term)),
        ).length
        const idf = Math.log(1 + (docs.length - documentFrequency + 0.5) / (documentFrequency + 0.5))
        score += idf * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + (b * terms.length) / avgLength)))
      }
      return { node, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)

  const seen = new Set(scored.map((entry) => entry.node.id))
  const hits: MemoryHitOut[] = scored.map((entry) => ({
    ref: entry.node.ref,
    kind: asMemoryKind(entry.node.kind),
    label: entry.node.label,
    text: entry.node.text,
    score: Number(entry.score.toFixed(3)),
    hops: 0,
    path: [entry.node.ref],
    occurred_at: null,
    attrs: entry.node.attrs,
  }))

  // One-hop expansion with edge-weight decay, mirroring the backend's GraphRAG-lite step.
  for (const entry of scored.slice(0, 3)) {
    for (const edge of graph.edges) {
      const neighbourId =
        edge.source === entry.node.id ? edge.target : edge.target === entry.node.id ? edge.source : null
      if (!neighbourId || seen.has(neighbourId)) continue
      const neighbour = graph.nodes.find((node) => node.id === neighbourId)
      if (!neighbour) continue
      seen.add(neighbourId)
      hits.push({
        ref: neighbour.ref,
        kind: asMemoryKind(neighbour.kind),
        label: neighbour.label,
        text: neighbour.text,
        score: Number((entry.score * edge.weight * 0.45).toFixed(3)),
        hops: 1,
        path: [entry.node.ref, edge.rel, neighbour.ref],
        occurred_at: null,
        attrs: neighbour.attrs,
      })
      if (hits.length >= limit * 2) break
    }
    if (hits.length >= limit * 2) break
  }

  hits.sort((left, right) => right.score - left.score)
  const trimmed = hits.slice(0, limit * 2)
  return {
    query,
    hits: trimmed,
    rendered: trimmed.map((hit) => `- [${hit.kind}] ${hit.label}: ${hit.text}`).join('\n'),
    meta: meta(Math.max(1, Math.round(performance.now() - started))),
  }
}
