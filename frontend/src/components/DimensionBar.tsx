import type { HealthDimensionOut } from '../api/types'

export interface DimensionBarProps {
  dimension: HealthDimensionOut
  /** The lowest-scoring dimension is marked, because it is what MunshiJi offers to work on. */
  weakest?: boolean
}

/**
 * One axis of the score, with the number behind it.
 *
 * The evidence line is not decoration: a score a credit officer cannot interrogate is one they
 * will not use, so every dimension shows what it measured and how much it counted for.
 */
export function DimensionBar({ dimension, weakest = false }: DimensionBarProps): JSX.Element {
  const width = Math.max(0, Math.min(100, dimension.score))
  return (
    <article className={weakest ? 'dim dim--weakest' : 'dim'}>
      <div className="dim__head">
        <h3 className="dim__label">
          {dimension.label_en}
          <span className="dim__hi deva" lang="hi">
            {dimension.label_hi}
          </span>
        </h3>
        <div className="dim__score tabular">{dimension.score.toFixed(1)}</div>
      </div>

      <div
        className="dim__track"
        role="img"
        aria-label={`${dimension.label_en}: ${dimension.score.toFixed(0)} out of 100`}
      >
        <div className="dim__fill" style={{ width: `${width}%` }} />
      </div>

      <p className="dim__evidence mono">{dimension.evidence}</p>
      <p className="dim__reason">{dimension.reason_en}</p>

      <div className="dim__weights">
        <span>
          weight <b className="tabular">{dimension.weight.toFixed(2)}</b>
        </span>
        <span>
          contributes <b className="tabular">{dimension.contribution.toFixed(1)}</b>
        </span>
        {weakest ? <span className="dim__flag">weakest</span> : null}
      </div>
    </article>
  )
}
