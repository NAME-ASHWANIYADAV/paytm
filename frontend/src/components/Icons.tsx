/** Hand-drawn 20px stroke icons — no icon package, no extra runtime dependency. */

interface IconProps {
  size?: number
}

function frame(size: number): { width: number; height: number; viewBox: string } {
  return { width: size, height: size, viewBox: '0 0 24 24' }
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function MicIcon({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
    </svg>
  )
}

export function StopIcon({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SendIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="M4 12 20 4l-3.4 8L20 20 4 12Z" />
    </svg>
  )
}

export function SoundIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="M5 9.5h3l4-3.5v12l-4-3.5H5z" />
      <path d="M16 9.2a4 4 0 0 1 0 5.6M18.6 6.7a7.5 7.5 0 0 1 0 10.6" />
    </svg>
  )
}

export function MuteIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="M5 9.5h3l4-3.5v12l-4-3.5H5z" />
      <path d="m16 10 4 4m0-4-4 4" />
    </svg>
  )
}

export function SunIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  )
}

export function MoonIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  )
}

export function RefreshIcon({ size = 16 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="M20 11a8 8 0 1 0-.6 4" />
      <path d="M20 4v7h-7" />
    </svg>
  )
}

export function CheckIcon({ size = 16 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  )
}

export function CrossIcon({ size = 16 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function SparkIcon({ size = 16 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.4 6.4 9 9M15 15l2.6 2.6M17.6 6.4 15 9M9 15l-2.6 2.6" />
    </svg>
  )
}

/** The dukaan tab: an awning over a doorway. */
export function StoreIcon({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="M4 9.5 5.2 4h13.6L20 9.5" />
      <path d="M4 9.5a2.6 2.6 0 0 0 5.3 0 2.65 2.65 0 0 0 5.4 0 2.6 2.6 0 0 0 5.3 0" />
      <path d="M5 12v8h14v-8" />
      <path d="M10 20v-5h4v5" />
    </svg>
  )
}

/** The khata tab: a bound ledger. */
export function LedgerIcon({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z" />
      <path d="M6 3.5A1.5 1.5 0 0 0 4.5 5v14A1.5 1.5 0 0 0 6 20.5" />
      <path d="M9.5 8.5h5.5M9.5 12h5.5M9.5 15.5h3" />
    </svg>
  )
}

/** Everything a chevron does. */
export function ChevronIcon({ size = 16 }: IconProps): JSX.Element {
  return (
    <svg {...frame(size)} aria-hidden="true" {...stroke}>
      <path d="m9 5.5 6.5 6.5L9 18.5" />
    </svg>
  )
}
