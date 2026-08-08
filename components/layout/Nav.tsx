import { createCookieClient } from '@/lib/supabase/server'
import { NavClient } from './NavClient'

/**
 * Server component.
 *
 * The previous version read the session in a `useEffect`, so the nav painted
 * with no account state and then visibly reflowed once the Supabase round-trip
 * landed — a layout shift on every single page load. Middleware already
 * refreshes the session cookie on every request, so the session is sitting
 * right there and can be read synchronously during render. First paint is
 * now correct, and there is nothing to shift.
 */
export async function Nav() {
  let user: { name?: string; email?: string; picture?: string } | null = null

  try {
    const supabase = await createCookieClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      user = {
        name: data.user.user_metadata?.name,
        email: data.user.email,
        picture: data.user.user_metadata?.picture,
      }
    }
  } catch {
    // Supabase unreachable or env not configured — render signed-out rather
    // than failing the whole page.
  }

  return <NavClient user={user} />
}
