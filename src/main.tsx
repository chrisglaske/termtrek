import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import './theme/tokens.css'
import './theme/base.css'
import App from './ui/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
