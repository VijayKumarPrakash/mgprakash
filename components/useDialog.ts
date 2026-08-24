'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Focus trap, Escape-to-close, scroll lock with scrollbar-width compensation,
 * and restore-focus-on-close — the four behaviours DishModal already had.
 * Extracted once the dish-step selection tray needed exactly the same four;
 * copying them a second time would have meant two chances for the trap or
 * the lock to drift apart.
 *
 * Call only from a component that is itself conditionally mounted (as
 * DishModal is, and the tray is) — the effect runs for the dialog's whole
 * mounted lifetime, so an always-mounted caller would lock scroll permanently.
 */
export function useDialog(onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }, [])

  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      trapFocus(e)
    }
    document.addEventListener('keydown', onKey)

    // Locking overflow alone shifts the whole page left by the scrollbar
    // width the instant the dialog opens. Compensating with padding keeps
    // it still.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    const { overflow, paddingRight } = document.body.style
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`

    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      restoreFocus.current?.focus?.()
    }
  }, [onClose, trapFocus])

  return panelRef
}
