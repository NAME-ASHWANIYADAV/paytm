/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `auto` (default) | `1`/`true` fixtures-only | `0`/`false` live-only. */
  readonly VITE_USE_FIXTURES?: string
  /** Merchant whose companion screen this is. */
  readonly VITE_MERCHANT_ID?: string
  /** Absolute API origin. Empty string means "use the Vite dev proxy". */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
