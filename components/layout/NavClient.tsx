'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface User { name?: string; email?: string; picture?: string }

export function NavClient({ user }: { user: User | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const isOrderFlow = pathname.startsWith('/order/new')

  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // The header is transparent over the dark hero and only grows a border and
  // backdrop once the page scrolls, so it never cuts a line across the hero.
  const overHero = pathname === '/'

  useEffect(() => {
    // Passive listener + rAF coalescing: scroll never blocks the compositor,
    // and setState fires at most once per frame instead of per scroll event.
    let frame = 0
    function onScroll() {
      if (frame) return
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 12)
        frame = 0
      })
    }
    // Deliberately scheduled rather than called inline: reading scrollY and
    // setting state synchronously in the effect body would force a second
    // render pass on every mount, and on a restored scroll position it would
    // also thrash layout before paint.
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  const dark = overHero && !scrolled
  const initial = (user?.name ?? user?.email ?? '?')[0].toUpperCase()

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-[var(--dur-base)] ${
        dark
          ? 'bg-transparent border-b border-transparent on-dark'
          : 'bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] backdrop-blur-md border-b border-[var(--line)]'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">
        <Link
          href="/"
          className={`font-display text-[19px] leading-none transition-colors duration-[var(--dur-base)] ${
            dark ? 'text-[var(--dark-ink)]' : 'text-[var(--ink)]'
          }`}
          style={{ fontWeight: 500 }}
        >
          M G Prakash <span className="opacity-60">Catering</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-5">
          {/* Menu, Services and Areas are the three indexable hub pages. Linking
              them from every page is what gives them internal weight — a page
              reachable only from the sitemap is crawled, but ranks like an
              orphan. Hidden below sm, where the quote button has to win. */}
          {[
            { href: '/menu', label: 'Menu' },
            { href: '/services', label: 'Services' },
            { href: '/areas', label: 'Areas' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`hidden sm:inline-block text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
                dark
                  ? 'text-[var(--dark-ink-2)] hover:text-[var(--dark-ink)]'
                  : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {user && (
            <Link
              href="/account/orders"
              className={`hidden sm:inline-block text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
                dark
                  ? 'text-[var(--dark-ink-2)] hover:text-[var(--dark-ink)]'
                  : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
            >
              My Orders
            </Link>
          )}

          {!isOrderFlow && (
            <Link href="/order/new" className="btn btn-primary btn-sm">
              Get a Quote
            </Link>
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-label="Account menu"
                aria-expanded={open}
                className="block w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-[var(--line-strong)] transition-[box-shadow,transform] duration-[var(--dur-fast)] active:scale-95"
              >
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-full h-full grid place-items-center text-[13px] font-bold text-white bg-[var(--accent)]">
                    {initial}
                  </span>
                )}
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-md)] shadow-[var(--shadow-lift)] py-1.5 animate-[panelIn_160ms_var(--ease)] origin-top-right">
                  <div className="px-4 py-2.5">
                    {user.name && (
                      <p className="text-[13px] font-semibold text-[var(--ink)] truncate">{user.name}</p>
                    )}
                    <p className="text-[11px] text-[var(--ink-3)] truncate mt-0.5">{user.email}</p>
                  </div>
                  <div className="border-t border-[var(--line)] my-1" />
                  <Link
                    href="/account/orders"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-[13px] text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors"
                  >
                    My Orders
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full text-left px-4 py-2 text-[13px] text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className={`text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
                dark
                  ? 'text-[var(--dark-ink-2)] hover:text-[var(--dark-ink)]'
                  : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
