import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './context/AuthContext'
import { SelectedPageProvider } from './context/SelectedPageContext'
import './i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <SelectedPageProvider>
            <App />
          </SelectedPageProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>,
)
