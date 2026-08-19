import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Service role client — for server-side writes (no user context needed) */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Anon client without cookie context — for public data reads */
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/** Cookie-aware client — for server components and route handlers that need auth context */
export async function createCookieClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a server component — middleware handles refresh
          }
        },
      },
    }
  )
}

/**
 * Read-only auth client from a Request object — for route handlers that need to
 * know *who* is calling and nothing more.
 *
 * Two things here are deliberate.
 *
 * `autoRefreshToken: false` is the important one. This used to be a normal
 * cookie-writing client handed a `new Headers()` that the caller then threw
 * away. That looks harmless and is not: if the access token had expired,
 * `getUser()` refreshed it, Supabase rotated the refresh token, and the new
 * pair was written into headers nobody attached to a response. The browser kept
 * the old refresh token — which had just been consumed server-side — so a
 * customer could be silently signed out by the act of submitting an order.
 *
 * Nothing is lost by refusing to refresh here. `proxy.ts` already refreshes the
 * session cookie on every request and persists it properly, so by the time a
 * route handler runs the cookie is fresh. If it somehow is not, `getUser()`
 * fails, the caller reads null, and the request is treated as a guest — which
 * is the normal case for this site anyway.
 *
 * `setAll` is therefore a no-op rather than a serialiser. The hand-rolled
 * `Set-Cookie` string it used to build also silently dropped `Secure`,
 * `Domain` and `Expires`, so it could not have round-tripped a session
 * correctly even if the headers had been used.
 */
export function createReadOnlyRequestClient(request: Request) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      cookies: {
        getAll: () => {
          const cookieHeader = request.headers.get('cookie') ?? ''
          return cookieHeader.split(';').flatMap(pair => {
            const [name, ...rest] = pair.trim().split('=')
            if (!name) return []
            return [{ name: name.trim(), value: rest.join('=').trim() }]
          })
        },
        // Intentionally empty: this client must never mutate the session. See above.
        setAll: () => {},
      },
    }
  )
}
