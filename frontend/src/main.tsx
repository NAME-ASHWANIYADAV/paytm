import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { RouterProvider } from './router'
import { AppProvider } from './state/store'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root missing from index.html')

createRoot(container).render(
  <StrictMode>
    <RouterProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </RouterProvider>
  </StrictMode>,
)
