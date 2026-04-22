import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ToastProvider } from './components/Toast'
import { SelectedPageProvider } from './context/SelectedPageContext'
import './i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SelectedPageProvider>
          <App />
        </SelectedPageProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
