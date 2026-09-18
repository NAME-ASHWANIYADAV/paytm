import { useEffect, useRef, useState } from 'react'

import type { SparkPoint } from '../api/types'
import { formatDay, useLang } from '../i18n'

interface SparklineProps {
  points: SparkPoint[]
  /** Sign of today's delta decides the colour of the "today" marker. */
  belowBaseline: boolean
}

const HEIGHT = 64
const PAD_X = 3
const PAD_TOP = 9
const PAD_BOTTOM = 7

function useElementWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(280)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0
      if (measured > 0) setWidth(measured)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

/**
 * 14-day collection sparkline, drawn by hand in SVG — no chart library.
 * Today's point is ringed and dropped to the axis so the eye lands on it first.
 */
export function Sparkline({ points, belowBaseline }: SparklineProps): JSX.Element {
  const { t, lang } = useLang()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  if (points.length < 2) {
    return (
      <div className="spark" ref={ref}>
        <div className="empty">{t('spark.loading')}</div>
      </div>
    )
  }

  const values = points.map((point) => point.collection.paise)
  const mid = median(values)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const low = min - (max - min) * 0.22 - 1
  const high = max + (max - min) * 0.12 + 1

  const innerWidth = Math.max(40, width - PAD_X * 2)
  const step = innerWidth / (points.length - 1)
  const yOf = (value: number): number =>
    PAD_TOP + (1 - (value - low) / (high - low)) * (HEIGHT - PAD_TOP - PAD_BOTTOM)
  const xOf = (index: number): number => PAD_X + index * step

  const line = values.map((value, index) => `${index ? 'L' : 'M'}${xOf(index).toFixed(1)},${yOf(value).toFixed(1)}`).join(' ')
  const area = `${line} L${xOf(values.length - 1).toFixed(1)},${HEIGHT - PAD_BOTTOM} L${xOf(0).toFixed(1)},${
    HEIGHT - PAD_BOTTOM
  } Z`

  const todayIndex = points.findIndex((point) => point.is_today)
  const markerIndex = todayIndex >= 0 ? todayIndex : points.length - 1
  const active = hover ?? markerIndex
  const activePoint = points[active]

  const onMove = (event: React.MouseEvent<SVGSVGElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const relative = event.clientX - bounds.left - PAD_X
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(relative / step))))
  }

  const todayValue = values[markerIndex] ?? 0
  const summary = `14-day collection sparkline. Today ${points[markerIndex]?.collection.display ?? ''}, ${
    belowBaseline ? 'below' : 'above'
  } the weekday baseline.`

  return (
    <div className="spark" ref={ref}>
      <svg
        viewBox={`0 0 ${Math.max(40, width)} ${HEIGHT}`}
        width={Math.max(40, width)}
        height={HEIGHT}
        role="img"
        aria-label={summary}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ink-2)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--ink-2)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 14-day median reference */}
        <line
          x1={PAD_X}
          x2={PAD_X + innerWidth}
          y1={yOf(mid)}
          y2={yOf(mid)}
          stroke="var(--rule-strong)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        <path d={area} fill="url(#sparkFill)" />
        <path d={line} fill="none" stroke="var(--ink-2)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />

        {/* today's drop line + ring */}
        <line
          x1={xOf(markerIndex)}
          x2={xOf(markerIndex)}
          y1={yOf(todayValue)}
          y2={HEIGHT - PAD_BOTTOM}
          stroke={belowBaseline ? 'var(--red)' : 'var(--green)'}
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <circle
          cx={xOf(markerIndex)}
          cy={yOf(todayValue)}
          r="4.5"
          fill="var(--panel)"
          stroke={belowBaseline ? 'var(--red)' : 'var(--green)'}
          strokeWidth="2"
        />

        {hover !== null && hover !== markerIndex ? (
          <circle cx={xOf(hover)} cy={yOf(values[hover] ?? 0)} r="3" fill="var(--ink-2)" />
        ) : null}

        {points.map((point, index) => (
          <rect
            key={point.day}
            x={xOf(index) - step / 2}
            y={0}
            width={step}
            height={HEIGHT}
            fill="transparent"
          >
            <title>{`${point.weekday} ${point.day} · ${point.collection.display} · ${point.transactions} txns`}</title>
          </rect>
        ))}
      </svg>

      {activePoint ? (
        <div className="spark__tip">
          <b>{activePoint.collection.display}</b>{' '}
          <span className="muted">
            {activePoint.is_today ? t('spark.today') : formatDay(activePoint.day, lang)} ·{' '}
            {activePoint.transactions} {t('spark.txn')}
          </span>
        </div>
      ) : null}

      <div className="spark__axis">
        <span>{formatDay(points[0]?.day ?? '', lang)}</span>
        <span className="muted">{t('spark.caption')}</span>
        <span>{t('spark.today')}</span>
      </div>
    </div>
  )
}
