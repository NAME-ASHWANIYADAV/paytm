/**
 * The MunshiJi mark: a speech bubble holding a rupee — "बोलो, हिसाब हो जाएगा" in one glyph.
 *
 * Pure paths on the Paytm palette (navy tile, cyan bubble, white ₹), so it renders identically
 * everywhere: login header, app bar, favicon, and any future splash. No <text> elements — a
 * favicon must not depend on which Devanagari font a device ships.
 */

const TILE = '#002E6E'
const BUBBLE = '#00B9F1'

export function LogoMark({ size = 56, title = 'MunshiJi' }: { size?: number; title?: string }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      style={{ display: 'block', flex: 'none' }}
    >
      <rect x="2" y="2" width="60" height="60" rx="15" fill={TILE} />
      <path
        d="M22 11h20c5 0 9 4 9 9v14c0 5-4 9-9 9H30.5l-8.3 7.1c-1.2 1-3 .2-3-1.4V43c-3.5-1.4-6.2-4.7-6.2-9V20c0-5 4-9 9-9z"
        fill={BUBBLE}
      />
      <path
        d="M26 19h12.5M26 24.6h12.5M31.8 19c4.6 0 6.7 1.9 6.5 5.6M36.2 24.6 27.6 38.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
