'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const isOrderFlow = pathname.startsWith('/order/new')

  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoadingUser(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  const name: string | undefined = user?.user_metadata?.name
  const picture: string | undefined = user?.user_metadata?.picture
  const initial = (name ?? user?.email ?? '?')[0].toUpperCase()

  return (
    <header className="sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight text-[#1a1a1a]">
          M G Prakash Catering
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          {!isOrderFlow && (
            <Link
              href="/menu"
              className="text-sm text-stone-600 hover:text-[#1a1a1a] transition-colors hidden sm:block"
            >
              Browse Menu
            </Link>
          )}

          {!loadingUser && user && (
            <Link
              href="/account/orders"
              className="text-sm text-stone-600 hover:text-[#1a1a1a] transition-colors hidden sm:block"
            >
              My Orders
            </Link>
          )}

          <Link
            href="/order/new"
            className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            Place an Order
          </Link>

          {!loadingUser && (
            <>
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setOpen(o => !o)}
                    className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-stone-300 transition-all focus:outline-none"
                    aria-label="Account menu"
                  >
                    {picture ? (
                      <img src={picture} alt={name ?? 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span
                        className="w-full h-full flex items-center justify-center text-sm font-semibold text-white"
                        style={{ background: 'var(--color-accent)' }}
                      >
                        {initial}
                      </span>
                    )}
                  </button>

                  {open && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-stone-200 rounded-2xl shadow-lg py-2 z-50">
                      <div className="px-4 py-3">
                        {name && <p className="text-sm font-semibold text-[#1a1a1a] truncate">{name}</p>}
                        <p className="text-xs text-stone-400 truncate mt-0.5">{user.email}</p>
                      </div>
                      <div className="border-t border-stone-100 my-1" />
                      <Link
                        href="/account/orders"
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                      >
                        My Orders
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="text-sm text-stone-600 hover:text-[#1a1a1a] transition-colors"
                >
                  Sign in
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
