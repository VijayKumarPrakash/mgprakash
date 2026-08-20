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

  /** `/menu` stays current while reading `/menu/masala-dosa`. */
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  /**
   * Nav items are pills rather than bare text. As plain labels they sat at
   * --ink-2 with only a colour shift on hover, so nothing said they were
   * interactive until the pointer was already on them — and there was no
   * current-page state at all: standing on /menu, "Menu" looked exactly like
   * "Areas". The resting label is full ink now, hover paints a soft well, and
   * the current page holds a copper-tinted pill.
   */
  function pill(href: string) {
    const current = isCurrent(href)
    const base =
      'px-3 py-1.5 rounded-[var(--r-pill)] text-sm font-medium ' +
      'transition-[background-color,color] duration-[var(--dur-fast)] ' +
      'focus-visible:outline-none focus-visible:ring-2 ' +
      'focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ' +
      (dark ? 'focus-visible:ring-offset-[var(--dark)]' : 'focus-visible:ring-offset-[var(--paper)]')

    if (dark) {
      return `${base} ${
        current
          ? 'bg-[rgba(247,241,230,.14)] text-[var(--accent-lift)]'
          : 'text-[var(--dark-ink)] hover:bg-[rgba(247,241,230,.09)]'
      }`
    }
    return `${base} ${
      current
        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
        : 'text-[var(--ink)] hover:bg-[var(--surface-2)]'
    }`
  }

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
          M G Prakash{' '}
          <span className={dark ? 'text-[var(--accent-lift)]' : 'text-[var(--accent)]'}>
            Catering
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-1.5">
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
              aria-current={isCurrent(item.href) ? 'page' : undefined}
              className={`hidden sm:inline-block ${pill(item.href)}`}
            >
              {item.label}
            </Link>
          ))}

          {user && (
            <Link
              href="/account/orders"
              aria-current={isCurrent('/account/orders') ? 'page' : undefined}
              className={`hidden sm:inline-block ${pill('/account/orders')}`}
            >
              My Orders
            </Link>
          )}

          {!isOrderFlow && (
            // Set apart from the pill group so the CTA reads as the primary
            // action rather than as one more tab in the row.
            <Link href="/order/new" className="btn btn-primary btn-sm ml-1 sm:ml-2">
              Get a Quote
            </Link>
          )}

          {/*
            The same left margin the CTA gets, for the opposite reason.

            Every other item in this row is a pill carrying `px-3`, so the gap
            you actually see between two of them is the container's 6px plus
            12px of padding on each side. The avatar is a bare 32px circle with
            no padding at all, so it sat 6px from the quote button while
            everything else read as roughly 18px apart — which is why it looked
            cramped against the CTA rather than evenly spaced with the rest.
          */}
          {user ? (
            <div className="relative ml-1 sm:ml-2" ref={dropdownRef}>
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
            <Link href="/auth/login" className={pill('/auth/login')}>
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
