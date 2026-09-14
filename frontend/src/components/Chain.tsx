import { Link } from '../router'

export interface ChainLinkProps {
  /** Which way the reader is being sent: back to a cause, or on to a consequence. */
  direction: 'from' | 'to'
  to: string
  /** What the other end is — "salah", "kaam", "yaad". Sets the label. */
  kind: string
  children: React.ReactNode
}

/**
 * One step of the chain the product actually runs on.
 *
 * MunshiJi notices something, proposes an action, the merchant approves it, and an outcome comes
 * back that moves the shop's standing. Split across pages, that loop became five drawers with
 * nothing joining them — a proposal that cannot point at why it exists reads as a demand, and an
 * outcome with nothing behind it reads as a claim. Every link here is a real foreign key the API
 * already carried; none of it is decoration.
 */
export function ChainLink({ direction, to, kind, children }: ChainLinkProps): JSX.Element {
  return (
    <Link to={to} className={`chain chain--${direction}`}>
      <span className="chain__arrow" aria-hidden="true">
        {direction === 'from' ? '←' : '→'}
      </span>
      <span className="chain__kind">{kind}</span>
      <span className="chain__what">{children}</span>
    </Link>
  )
}
