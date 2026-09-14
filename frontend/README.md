# MunshiJi — merchant companion screen

The screen that is projected beside the phone during the live demo, so the judges can watch the
system think while the merchant talks to it.

React 18 + TypeScript + Vite. **No UI library, no CSS framework** — hand-authored CSS with custom
properties. The only runtime dependencies are `react` and `react-dom`; the sparkline, the stacked
payment bar, the waveform and the force-directed memory graph are all drawn by hand.

---

## Run it

```powershell
cd frontend
npm install
npm run dev            # http://localhost:5173
```

You do **not** need the backend running. If the API is not up, the screen falls back to fixtures and
raises a small `demo data` chip in the header — every panel is populated and interactive.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server, proxying `/api` → `http://localhost:8000`, fixture fallback on |
| `npm run dev:fixtures` | Same, but pinned to fixtures — zero network calls (`vite --mode fixtures`) |
| `npm run build` | `tsc --noEmit` then `vite build` → `dist/` |
| `npm run typecheck` | Types only |
| `npm run preview` | Serve the production build |

---

## Fixture mode

`VITE_USE_FIXTURES` (see `.env`) has three settings:

| Value | Behaviour |
|---|---|
| `auto` *(default)* | Try the API. The **first** failure latches the whole session to fixtures, so exactly one request is made against a backend that is not there. The `demo data` chip appears with a `retry live` button. |
| `1` / `true` | Never touch the network. Guaranteed-offline demo. |
| `0` / `false` | Live only — errors propagate instead of falling back. Use this when debugging the API. |

How the fallback is wired:

* **`src/api/client.ts`** is the only module that speaks HTTP. Every endpoint is a typed function
  that returns `{ data, source: 'live' | 'fixture' }`. A private `resolve(live, fixture)` helper runs
  the real request and, on any failure (non-2xx, timeout, parse error, offline), publishes the
  offline latch and returns the fixture instead.
* **`vite.config.ts`** answers `204 No Content` from the dev proxy when FastAPI is not listening,
  instead of letting a socket error reach the browser. That is the one status that means "nothing
  here" without Chrome logging a failed request — which is why `npm run dev` with no backend has a
  completely clean console. `client.ts` treats a 204 as "backend offline".
* **`src/api/fixtures.ts`** holds the payloads, in the exact shape of the Pydantic DTOs.
* **`src/api/demoEngine.ts`** makes fixture mode *behave*: approving an action really changes its
  state, a question really produces a reply with a tool trace, and clicking a memory node really
  runs a small BM25 retrieval over the graph. Every number it speaks is read from the same fixtures
  the panels are rendering.
* `retryLive()` (the chip's button) drops the latch, so the screen goes live the moment the API
  comes up — no reload.

Live updates use `GET /api/events/{merchant_id}` (SSE). It accepts both frame styles
(`event: actions` + `data: {...}`, or an unnamed `message` carrying `{"event": …, "data": …}`), and
falls back to a 10-second poll if the stream errors. In fixture mode neither runs.

---

## What is where

```
src/
  api/
    types.ts        TypeScript mirrors of backend/munshiji/schemas/*.py (no `any`)
    client.ts       every HTTP call + the fixture-fallback latch
    fixtures.ts     demo payloads, DTO-exact
    demoEngine.ts   offline behaviour (approve, chat, memory search)
    events.ts       SSE subscription + 10s poll fallback
  state/store.tsx   one context: loaders, transcript, live-event wiring
  hooks/            useRecorder (MediaRecorder + AnalyserNode), useTheme, useIstClock
  lib/speech.ts     speechSynthesis (Hindi voice preferred) / audio_data_uri playback
  components/       Header, LiveCall, Waveform, TodayNumbers, Sparkline,
                    InsightFeed, ActionQueue, MemoryGraph, Icons
  styles/           tokens.css (all custom properties), base.css, panels.css
```

### Money

Every money field arrives from the backend as `{ paise, display, short }` and the UI renders
`display` / `short`. **No component formats currency.** The only `₹` formatting in the repo lives
inside `fixtures.ts`, where it stands in for the server while synthesising sample payloads.

---

## Design notes

* **Subject world: the *bahi khata*.** Warm paper ground with a ruled-line texture, ink text, a red
  margin rule down the panels that need attention, and one warm gold reserved for approvals and
  money that came back. Not Paytm blue, no Paytm marks — this is a hackathon entry, not a costume.
* **Type**: Fraunces (display, ledger-serif) + IBM Plex Sans (text) + **IBM Plex Sans Devanagari**
  for Hindi + IBM Plex Mono for tool traces and latencies. Figures use tabular numerals. If the
  venue Wi-Fi eats Google Fonts, the stacks fall back to Nirmala UI / Noto Sans Devanagari, which
  are present on the demo machine — Devanagari never renders in a fallback serif.
* **Themes**: every token is defined in the base `:root`; `@media (prefers-color-scheme: dark)`
  (guarded with `:root:not([data-theme='light'])`) and `:root[data-theme='dark']` redefine the same
  names. The header toggle writes `data-theme` and persists it.
* **Motion**: the live waveform, a gentle enter for new turns, and a stamp on approve. Everything is
  disabled under `prefers-reduced-motion`.
* **Accessibility**: real focus rings, labelled controls, `aria-pressed` on the mic and mute
  toggles, an `aria-live` transcript, and severity encoded as stripe + pill + glyph, never colour
  alone. The mic flow is fully keyboard-operable.

### Layout

Three column stacks, sized to fit 1280×800 without scrolling the page:

| Column | Panels |
|---|---|
| left | live call — waveform, transcript, tool-call trace, composer |
| middle | today's numbers (natural height) over the action queue (takes the rest, min 228px) |
| right | insight feed (takes the rest) over the memory graph (fixed 232px) |

Below 1180px the deck becomes two columns and the page scrolls; below 880px it is a single stack.
The action queue never drops below its minimum — the pending-approval card, with its Approve /
Reject buttons directly under the ask, is the one thing on this screen that must always be visible.
