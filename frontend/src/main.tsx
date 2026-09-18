import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { LangProvider } from './i18n'
import { RouterProvider } from './router'
import { AppProvider } from './state/store'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root missing from index.html')

createRoot(container).render(
  <StrictMode>
    <RouterProvider>
      <LangProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </LangProvider>
    </RouterProvider>
  </StrictMode>,
)

// Installability floor: a pass-through service worker (no caching — the offline story lives in
// the backend's local providers, not in a stale app shell). Registered only on real builds so
// dev servers never fight a worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* an uninstallable PWA still works as a site */
    })
  })
}
