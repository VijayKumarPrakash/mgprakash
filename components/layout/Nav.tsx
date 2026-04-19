'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const isOrderFlow = pathname.startsWith('/order/new')

  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

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

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

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

          {!loadingUser && (
            <>
              {user ? (
                <>
                  <Link
                    href="/account/orders"
                    className="text-sm text-stone-600 hover:text-[#1a1a1a] transition-colors hidden sm:block"
                  >
                    My Orders
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 hidden sm:block truncate max-w-[140px]">
                      {user.email}
                    </span>
                    <button
                      onClick={handleSignOut}
                      className="text-sm text-stone-500 hover:text-[#1a1a1a] transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </>
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

          <Link
            href="/order/new"
            className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            Place an Order
          </Link>
        </nav>
      </div>
    </header>
  )
}
