import { LiveCall } from './LiveCall'

/**
 * The conversation, kept present on every page that is not the call itself.
 *
 * This product's thesis is that it is a conversation; a page where the conversation disappears
 * quietly argues the opposite. Two turns and a mic is enough to keep the thread visible while the
 * presenter moves between rooms.
 */
export function CallStrip(): JSX.Element {
  return (
    <aside className="callstrip" aria-label="Live call">
      <LiveCall variant="strip" />
    </aside>
  )
}
