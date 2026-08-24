'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: string
  message: string
  action?: ToastAction
}

interface ToastContextValue {
  /** Raises a toast, optionally with one action button (e.g. "Undo"). */
  pushToast: (message: string, action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DURATION_MS = 6000

/**
 * One row, owning its own dismiss timer rather than the provider owning a
 * shared one — a second toast landing while the first is still up must not
 * reset the first one's clock.
 */
function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(() => {
    timer.current = setTimeout(() => onDismiss(toast.id), DURATION_MS)
  }, [toast.id, onDismiss])

  useEffect(() => {
    start()
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [start])

  function pause() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }
  function resume() {
    if (!timer.current) start()
  }

  return (
    <div
      // Dark regardless of the page underneath — same reasoning as the
      // account dropdown's shadow-pop pairing: a toast has to read as an
      // overlay, not as one more card on the page.
      className="pointer-events-auto flex items-center gap-4 pl-4 pr-2.5 py-3 rounded-[var(--r-md)]
                 bg-[var(--dark)] text-[var(--dark-ink)] shadow-[var(--shadow-pop)]
                 animate-[panelIn_200ms_var(--ease)] max-w-[calc(100vw-2rem)] sm:max-w-md"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <p className="text-[13.5px] leading-[1.4]">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick()
            onDismiss(toast.id)
          }}
          className="flex-shrink-0 px-2.5 py-1.5 rounded-[var(--r-sm)] text-[13px] font-semibold
                     text-[var(--accent-lift)] hover:bg-[rgba(247,241,230,.09)] transition-colors
                     duration-[var(--dur-fast)]"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}

/**
 * Scoped to the quote form rather than mounted sitewide — the funnel is
 * currently the only place with an action worth undoing rather than
 * confirming. See MealsStep: removing a meal used to be silent and
 * irreversible; this replaces that with an undo window instead of a confirm
 * dialog, which protects the rare mistake without taxing every correct
 * removal.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const pushToast = useCallback((message: string, action?: ToastAction) => {
    setToasts(prev => [...prev, { id: crypto.randomUUID(), message, action }])
  }, [])

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      {/* aria-live announces the removal even without the visible toast —
          the same "spoken equivalent" pattern as isPending on the catalogue
          grid. Fixed at the very bottom of the viewport; z-40 keeps it below
          the sticky header's dropdowns but above ordinary page content. */}
      <div
        aria-live="polite"
        className="fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {toasts.map(t => (
          <ToastRow key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
