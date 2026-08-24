'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BUSINESS, TEL_HREF, WHATSAPP_HREF } from '@/lib/business'

interface User { name?: string; email?: string; picture?: string }

export function NavClient({ user }: { user: User | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const isOrderFlow = pathname.startsWith('/order/new')

  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileNavRef = useRef<HTMLDivElement>(null)

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
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) setMobileOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setMobileOpen(false) }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // A route change is the one way the panel can end up open over a page it
  // was never opened on — every in-panel link already closes it on click, but
  // back/forward navigation and any programmatic push do not fire that handler.
  // Derived during render rather than in an effect, same reasoning as
  // `highestReached` in OrderForm: an effect would leave the panel open for
  // a frame over the new page before closing it.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setMobileOpen(false)
  }

  useEffect(() => {
    if (!mobileOpen) return
    // Same compensation as the dish modal: locking overflow alone shifts the
    // page left by the scrollbar width the instant the panel opens.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    const { overflow, paddingRight } = document.body.style
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [mobileOpen])

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
                onClick={() => { setOpen(o => !o); setMobileOpen(false) }}
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
            // Hidden below sm along with the other pills: at 390px it sat
            // beside the hamburger with no room to breathe and wrapped onto
            // two lines ("Sign" / "in"). It moves into the panel instead —
            // the same place "My Orders" already lives for a signed-in visitor.
            <Link href="/auth/login" className={`hidden sm:inline-block ${pill('/auth/login')}`}>
              Sign in
            </Link>
          )}

          {/*
            Menu, Services and Areas have nowhere to go below sm — they are the
            three pills hidden above. Get a Quote stays outside this, in the
            row, because it is the action a mobile visitor is already looking
            for; this exists for the links that lost their spot, plus sign-in
            when there is no avatar to carry it.
          */}
          <div className="relative sm:hidden ml-1" ref={mobileNavRef}>
            <button
              type="button"
              onClick={() => { setMobileOpen(o => !o); setOpen(false) }}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-panel"
              className={`grid place-items-center w-9 h-9 rounded-full transition-colors duration-[var(--dur-fast)] ${
                dark ? 'text-[var(--dark-ink)] hover:bg-[rgba(247,241,230,.09)]' : 'text-[var(--ink)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {mobileOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M1.5 1.5L14.5 14.5M14.5 1.5L1.5 14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
                  <path d="M1 1H17M1 7H17M1 13H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav-panel"
          className={`sm:hidden absolute inset-x-0 top-full border-b animate-[panelIn_160ms_var(--ease)] origin-top ${
            dark ? 'bg-[var(--dark)] border-[var(--dark-line)] on-dark' : 'bg-[var(--surface)] border-[var(--line)]'
          }`}
          style={{ boxShadow: 'var(--shadow-lift)' }}
        >
          <nav aria-label="Mobile" className="px-4 py-2 flex flex-col">
            {[
              { href: '/menu', label: 'Menu' },
              { href: '/services', label: 'Services' },
              { href: '/areas', label: 'Areas' },
            ].map(item => {
              const current = isCurrent(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? 'page' : undefined}
                  className={`h-12 flex items-center px-3 rounded-[var(--r-md)] text-[15px] font-medium transition-colors duration-[var(--dur-fast)] ${
                    dark
                      ? current ? 'text-[var(--accent-lift)] bg-[rgba(247,241,230,.14)]' : 'text-[var(--dark-ink)] hover:bg-[rgba(247,241,230,.07)]'
                      : current ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-[var(--ink)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}

            <div className={`h-px my-2 ${dark ? 'bg-[var(--dark-line)]' : 'bg-[var(--line)]'}`} />

            <a
              href={TEL_HREF}
              className={`h-12 flex items-center gap-3 px-3 rounded-[var(--r-md)] text-[15px] font-medium transition-colors duration-[var(--dur-fast)] ${
                dark ? 'text-[var(--dark-ink)] hover:bg-[rgba(247,241,230,.07)]' : 'text-[var(--ink)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.06 6.06l1.01-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.01z" />
              </svg>
              {BUSINESS.phone}
            </a>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={`h-12 flex items-center gap-3 px-3 rounded-[var(--r-md)] text-[15px] font-medium transition-colors duration-[var(--dur-fast)] ${
                dark ? 'text-[var(--dark-ink)] hover:bg-[rgba(247,241,230,.07)]' : 'text-[var(--ink)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.528 5.845L.057 23.882l6.188-1.448A11.934 11.934 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.884 9.884 0 0 1-5.031-1.378l-.361-.214-3.741.981.999-3.648-.235-.374A9.86 9.86 0 0 1 2.106 12C2.106 6.57 6.57 2.106 12 2.106c5.43 0 9.894 4.464 9.894 9.894 0 5.43-4.464 9.894-9.894 9.894z"/>
              </svg>
              WhatsApp
            </a>

            {/* Signed-in has an avatar to carry this; signed-out has nothing
                below sm once the pill is hidden, so it lands here instead. */}
            {!user && (
              <>
                <div className={`h-px my-2 ${dark ? 'bg-[var(--dark-line)]' : 'bg-[var(--line)]'}`} />
                <Link
                  href="/auth/login"
                  className={`h-12 flex items-center px-3 rounded-[var(--r-md)] text-[15px] font-medium transition-colors duration-[var(--dur-fast)] ${
                    dark ? 'text-[var(--dark-ink)] hover:bg-[rgba(247,241,230,.07)]' : 'text-[var(--ink)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  Sign in
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
