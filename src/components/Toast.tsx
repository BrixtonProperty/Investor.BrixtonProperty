import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ToastState {
  message: string
  kind: 'info' | 'error'
}
interface ToastApi {
  show: (message: string, kind?: 'info' | 'error') => void
}

const ToastContext = createContext<ToastApi | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const show = useCallback((message: string, kind: 'info' | 'error' = 'info') => {
    setToast({ message, kind })
    setTimeout(() => setToast(null), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && <div className={'toast' + (toast.kind === 'error' ? ' error' : '')}>{toast.message}</div>}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
