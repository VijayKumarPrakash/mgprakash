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

/** Cookie-aware client from a Request object — for use in Route Handlers */
export function createRequestClient(
  request: Request,
  responseHeaders: Headers
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          const cookieHeader = request.headers.get('cookie') ?? ''
          return cookieHeader.split(';').flatMap(pair => {
            const [name, ...rest] = pair.trim().split('=')
            if (!name) return []
            return [{ name: name.trim(), value: rest.join('=').trim() }]
          })
        },
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieStr = `${name}=${value}; Path=${options?.path ?? '/'}${options?.maxAge ? `; Max-Age=${options.maxAge}` : ''}${options?.httpOnly ? '; HttpOnly' : ''}${options?.sameSite ? `; SameSite=${options.sameSite}` : ''}`
            responseHeaders.append('Set-Cookie', cookieStr)
          })
        },
      },
    }
  )
}
