import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'

import type { GraphNodeOut } from '../api/types'
import { useApp } from '../state/store'

interface Body {
  id: string
  ref: string
  label: string
  kind: string
  text: string
  x: number
  y: number
  vx: number
  vy: number
  degree: number
}

/**
 * A merchant's graph runs to hundreds of nodes, and drawing all of them in a panel this size
 * produced confetti - visually loud, and it told you nothing. So the panel shows the graph's
 * *skeleton*: everything structural, plus the best-connected remainder up to a cap.
 */
const MAX_BODIES: Record<'panel' | 'page', number> = { panel: 26, page: 90 }

/** How many nodes may carry a label. The rail cannot fit more than a handful legibly. */
const MAX_LABELS: Record<'panel' | 'page', number> = { panel: 6, page: 20 }

/** Kinds that carry the story and are never culled, however sparse their edges. */
const STRUCTURAL = new Set(['merchant', 'action', 'insight'])


function colourOf(kind: string, style: CSSStyleDeclaration): string {
  const token = style.getPropertyValue(`--node-${kind}`).trim()
  return token || style.getPropertyValue('--ink-2').trim() || '#666'
}

function radiusOf(body: Body, lit: boolean): number {
  return (lit ? 7 : 5) + Math.min(6, body.degree * 0.9)
}

/** Rank by degree, keeping the structural kinds whatever their degree. */
function chooseBodies<T extends { id: string; kind: string }>(
  nodes: readonly T[],
  degrees: Map<string, number>,
  cap: number,
): T[] {
  if (nodes.length <= cap) return [...nodes]
  const structural = nodes.filter((node) => STRUCTURAL.has(node.kind))
  const rest = nodes
    .filter((node) => !STRUCTURAL.has(node.kind))
    .sort((a, b) => (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0))
  return [...structural, ...rest].slice(0, cap)
}

export interface MemoryGraphProps {
  /** `page` has room for the graph's actual shape; `panel` is the rail's short box. */
  variant?: 'panel' | 'page'
}

export function MemoryGraph({ variant = 'panel' }: MemoryGraphProps): JSX.Element {
  const { graph, memory, runMemorySearch, busy } = useApp()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const bodiesRef = useRef<Body[]>([])
  const hoverRef = useRef<Body | null>(null)
  /** Refs returned by the last recall. Non-empty means "answer mode": dim everything else. */
  const litRef = useRef<Set<string>>(new Set())
  const redrawRef = useRef<() => void>(() => {})
  const [hoverLabel, setHoverLabel] = useState<GraphNodeOut | null>(null)
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(0)

  const select = useCallback(
    (label: string) => {
      setQuery(label)
      void runMemorySearch(label)
    },
    [runMemorySearch],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box || !graph) return
    const context = canvas.getContext('2d')
    if (!context) return

    const rootStyle = window.getComputedStyle(document.documentElement)
    const degrees = new Map<string, number>()
    graph.edges.forEach((edge) => {
      degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1)
      degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1)
    })

    let width = box.clientWidth
    let height = box.clientHeight

    const chosen = chooseBodies(graph.nodes, degrees, MAX_BODIES[variant])
    setShown(chosen.length)

    // Deterministic golden-angle seeding: the graph settles the same way at every demo.
    bodiesRef.current = chosen.map((node, index) => {
      const angle = index * 2.399963
      const radius = 14 + 11 * Math.sqrt(index)
      return {
        id: node.id,
        ref: node.ref,
        label: node.label,
        kind: node.kind,
        text: node.text,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        degree: degrees.get(node.id) ?? 0,
      }
    })
    const index = new Map(bodiesRef.current.map((body) => [body.id, body]))
    const links = graph.edges
      .map((edge) => ({ a: index.get(edge.source), b: index.get(edge.target), w: edge.weight, rel: edge.rel }))
      .filter((link): link is { a: Body; b: Body; w: number; rel: string } => Boolean(link.a && link.b))

    let alpha = 1
    let dirty = true
    let frame = 0

    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1
      width = box.clientWidth
      height = box.clientHeight
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      alpha = Math.max(alpha, 0.55)
      dirty = true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(box)
    resize()

    /* ------------------------------------------------- velocity-Verlet force sim */
    const step = (): void => {
      const bodies = bodiesRef.current
      const dt = 0.55
      const repulsion = 900
      const spring = 0.045
      const rest = 62
      const centring = 0.0016
      const damping = 0.86

      for (let i = 0; i < bodies.length; i += 1) {
        const a = bodies[i]
        if (!a) continue
        let fx = (width / 2 - a.x) * centring
        let fy = (height / 2 - a.y) * centring
        for (let j = 0; j < bodies.length; j += 1) {
          if (i === j) continue
          const b = bodies[j]
          if (!b) continue
          const dx = a.x - b.x
          const dy = a.y - b.y
          const distanceSq = Math.max(36, dx * dx + dy * dy)
          const force = repulsion / distanceSq
          const distance = Math.sqrt(distanceSq)
          fx += (dx / distance) * force
          fy += (dy / distance) * force
        }
        a.vx = (a.vx + fx * dt) * damping
        a.vy = (a.vy + fy * dt) * damping
      }

      for (const link of links) {
        const dx = link.b.x - link.a.x
        const dy = link.b.y - link.a.y
        const distance = Math.max(1, Math.hypot(dx, dy))
        const force = spring * (distance - rest) * (0.5 + link.w * 0.5)
        const ux = (dx / distance) * force
        const uy = (dy / distance) * force
        link.a.vx += ux
        link.a.vy += uy
        link.b.vx -= ux
        link.b.vy -= uy
      }

      let motion = 0
      for (const body of bodies) {
        body.x += body.vx * alpha
        body.y += body.vy * alpha
        const margin = 16
        body.x = Math.min(width - margin, Math.max(margin, body.x))
        body.y = Math.min(height - margin, Math.max(margin, body.y))
        motion += Math.abs(body.vx) + Math.abs(body.vy)
      }
      alpha *= 0.985
      if (alpha < 0.02 || motion < 0.4) alpha = 0
    }

    /* ------------------------------------------------------------------ render */
    /*
     * Two states, deliberately.
     *
     * At rest the graph is monochrome: one ink tone, size carrying degree. It is a texture that
     * says "there is a structure here", and it stays out of the way.
     *
     * After a recall it *answers*: the nodes that came back take their kind colour, the edges
     * between them carry the traversal, and everything else drops away. That transition is the
     * whole point of the panel - it makes the cross-session recall visible instead of asking the
     * room to take our word for it.
     */
    const draw = (): void => {
      const bodies = bodiesRef.current
      const lit = litRef.current
      const answering = lit.size > 0
      const inkFaint = rootStyle.getPropertyValue('--ink-3').trim() || '#888'
      const ink = rootStyle.getPropertyValue('--ink').trim() || '#111'
      const panel = rootStyle.getPropertyValue('--panel').trim() || '#fff'
      context.clearRect(0, 0, width, height)

      for (const link of links) {
        const hovered = hoverRef.current === link.a || hoverRef.current === link.b
        const traversed = answering && lit.has(link.a.ref) && lit.has(link.b.ref)
        if (traversed) {
          context.strokeStyle = colourOf(link.a.kind, rootStyle)
          context.globalAlpha = 0.95
          context.lineWidth = 2
        } else if (hovered) {
          context.strokeStyle = inkFaint
          context.globalAlpha = 0.75
          context.lineWidth = 1.25
        } else {
          context.strokeStyle = inkFaint
          context.globalAlpha = answering ? 0.12 : 0.35
          context.lineWidth = 1
        }
        context.beginPath()
        context.moveTo(link.a.x, link.a.y)
        context.lineTo(link.b.x, link.b.y)
        context.stroke()
      }
      context.globalAlpha = 1

      for (const body of bodies) {
        const isLit = lit.has(body.ref)
        const radius = radiusOf(body, isLit)
        context.beginPath()
        context.arc(body.x, body.y, radius, 0, Math.PI * 2)
        if (isLit) {
          context.fillStyle = colourOf(body.kind, rootStyle)
          context.globalAlpha = 1
        } else {
          context.fillStyle = inkFaint
          context.globalAlpha = answering ? 0.16 : hoverRef.current === body ? 0.9 : 0.55
        }
        context.fill()
        context.lineWidth = isLit ? 2 : 1.5
        context.strokeStyle = panel
        context.globalAlpha = isLit ? 1 : 0.6
        context.stroke()
      }
      context.globalAlpha = 1

      // Label only what is being pointed at, or what the recall just returned.
      const labelled = bodies.filter((body) => body === hoverRef.current || lit.has(body.ref))
      context.font = '600 11px "IBM Plex Sans", system-ui, sans-serif'
      context.textAlign = 'center'
      for (const body of labelled.slice(0, MAX_LABELS[variant])) {
        const text = body.label.length > 22 ? `${body.label.slice(0, 21)}…` : body.label
        const metrics = context.measureText(text)
        const padding = 5
        const boxWidth = metrics.width + padding * 2
        const y = Math.max(2, body.y - radiusOf(body, lit.has(body.ref)) - 16)
        context.fillStyle = panel
        context.globalAlpha = 0.94
        context.fillRect(body.x - boxWidth / 2, y, boxWidth, 16)
        context.globalAlpha = 1
        context.strokeStyle = inkFaint
        context.lineWidth = 1
        context.strokeRect(body.x - boxWidth / 2, y, boxWidth, 16)
        context.fillStyle = ink
        context.fillText(text, body.x, y + 11.5)
      }
    }

    // Reduced motion: settle the layout before the first paint so nothing visibly moves.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let pass = 0; pass < 220 && alpha > 0; pass += 1) step()
      alpha = 0
    }

    const tick = (): void => {
      if (alpha > 0) {
        step()
        dirty = true
      }
      if (dirty) {
        draw()
        dirty = false
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)

    // Lets the recall effect repaint without re-seeding the layout - the constellation must not
    // jump every time the merchant asks a question.
    redrawRef.current = () => {
      dirty = true
    }

    /* ---------------------------------------------------------------- pointer */
    const bodyAt = (event: MouseEvent): Body | null => {
      const bounds = canvas.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      let found: Body | null = null
      for (const body of bodiesRef.current) {
        // Lit nodes are drawn larger, so their hit area has to grow with them.
        const reach = radiusOf(body, litRef.current.has(body.ref)) + 5
        if (Math.hypot(body.x - x, body.y - y) <= reach) found = body
      }
      return found
    }

    const onMove = (event: MouseEvent): void => {
      const body = bodyAt(event)
      if (body !== hoverRef.current) {
        hoverRef.current = body
        dirty = true
        setHoverLabel(
          body
            ? { id: body.id, ref: `${body.kind}:${body.id}`, kind: body.kind, label: body.label, text: body.text, attrs: {} }
            : null,
        )
      }
      canvas.style.cursor = body ? 'pointer' : 'crosshair'
    }

    const onClick = (event: MouseEvent): void => {
      const body = bodyAt(event)
      if (body) select(body.label)
    }

    const onLeave = (): void => {
      hoverRef.current = null
      setHoverLabel(null)
      dirty = true
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('mouseleave', onLeave)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [graph, select, variant])

  // Whatever the last recall returned is what the graph lights up.
  useEffect(() => {
    litRef.current = new Set(memory?.hits.map((hit) => hit.ref) ?? [])
    redrawRef.current()
  }, [memory])

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault()
    void runMemorySearch(query)
  }

  const litCount = memory?.hits.length ?? 0
  const total = graph?.nodes.length ?? 0

  return (
    <section className="panel area-memory" aria-label="Memory graph">
      <div className="panel__head">
        <h2 className="panel__title">
          Jaanta hai <small className="deva">याददाश्त</small>
        </h2>
        <span className={litCount ? 'chip chip--lit' : 'chip'}>
          {!graph
            ? 'loading…'
            : litCount
              ? `${litCount} yaad aaye`
              : `${shown} of ${total} nodes`}
        </span>
      </div>

      <div className="memory__body">
        <div className="memory__canvas" ref={boxRef}>
          <canvas ref={canvasRef} />
          {/* One line instead of eight colour swatches: the swatches were legible only up close,
              and by then the colours are on screen explaining themselves. */}
          <div className="memory__caption" aria-hidden="true">
            {litCount ? 'recall ne inhe chuna' : 'kuch poochhiye — jo yaad aayega, wo yahan jalega'}
          </div>
          {hoverLabel ? (
            <div className="memory__hover">
              <b>{hoverLabel.label}</b> <span className="muted">· {hoverLabel.kind}</span>
              <div className="muted">{hoverLabel.text}</div>
            </div>
          ) : null}
        </div>

        <div className="memory__side">
          <form className="memory__search" onSubmit={onSubmit}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="yaad se dhoondein…"
              aria-label="Memory search"
            />
            <button type="submit" className="btn btn--sm" disabled={busy.memory || !query.trim()}>
              {busy.memory ? '…' : 'khojo'}
            </button>
          </form>
          <div className="hits scroll">
            {memory?.hits.length ? (
              memory.hits.map((hit) => (
                <div className="hit" key={`${hit.ref}-${hit.hops}`} style={{ borderLeftColor: `var(--node-${hit.kind})` }}>
                  <div className="hit__label">
                    <span>{hit.label}</span>
                    <span className="hit__score">
                      {hit.score.toFixed(2)} · {hit.hops}h
                    </span>
                  </div>
                  <div className="hit__text">{hit.text}</div>
                  {hit.path.length > 1 ? <div className="hit__path">{hit.path.join(' → ')}</div> : null}
                </div>
              ))
            ) : (
              <div className="empty">
                Node par click kijiye — ya kuch likhkar yaaddasht me khojiye.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
