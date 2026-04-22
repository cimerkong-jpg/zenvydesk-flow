import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'

type Toast = {
  id: number
  kind: ToastKind
  message: string
}

type ToastContextValue = {
  show: (kind: ToastKind, message: string) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, kind, message }])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  const value: ToastContextValue = {
    show,
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <span className="toast-icon">
              {t.kind === 'success' ? '✓' : t.kind === 'error' ? '✗' : 'ℹ'}
            </span>
            <span className="toast-message">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export function useAutoDismiss(open: boolean, onDismiss: () => void, ms = 4000) {
  useEffect(() => {
    if (!open) return
    const handle = window.setTimeout(onDismiss, ms)
    return () => window.clearTimeout(handle)
  }, [open, onDismiss, ms])
}
