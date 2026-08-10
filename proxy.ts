import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase session cookie on every request, so the nav can read
 * the signed-in user during render instead of round-tripping for it after
 * paint.
 *
 * This was `middleware.ts` / `export function middleware`. Next 16 renamed the
 * convention to `proxy.ts` / `export function proxy` and the old name builds
 * with a deprecation warning; the behaviour is unchanged.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // This runs on every request, so an unconfigured environment used to throw
  // here and return a 500 for the entire site — including the menu and the
  // home page, neither of which needs auth at all. Session refresh is a
  // best-effort concern: if it cannot run, serve the request signed-out.
  if (!url || !anonKey) return supabaseResponse

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — keeps auth tokens alive. Wrapped because a Supabase
  // outage must not take down pages that do not depend on auth.
  try {
    await supabase.auth.getUser()
  } catch {
    // Serve signed-out rather than 500.
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
