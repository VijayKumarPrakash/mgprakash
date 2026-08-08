'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Reveal-on-scroll.
 *
 * The observer is wired up in a *callback ref* rather than an effect. That
 * matters for two reasons: it runs the moment the node is attached (so an
 * element already in view never flashes), and it keeps the synchronous
 * setState out of an effect body, which would otherwise trigger a cascading
 * re-render on mount for every revealed element on the page.
 *
 * Each observer unobserves itself on first intersection, so there is no
 * lingering scroll work once a section has been seen. The animation itself is
 * pure opacity + transform, which the compositor runs off the main thread — it
 * cannot stutter no matter what React is doing.
 *
 * If IntersectionObserver is missing or the user prefers reduced motion, the
 * content is simply visible. It never depends on JS to be readable.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const [shown, setShown] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)

  const attach = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node) return

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true)
      return
    }

    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true)
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(node)
    observer.current = io
  }, [])

  return (
    <Tag
      ref={attach}
      className={`reveal ${shown ? 'reveal-in' : ''} ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  )
}
