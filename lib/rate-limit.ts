/**
 * A small in-process rate limiter for the two public POST routes.
 *
 * WHAT THIS PROTECTS
 * `POST /api/orders` inserts rows and sends two Gmail messages per call. Gmail
 * SMTP caps at a few hundred messages a day, and the account is the business's
 * own address — so a loop against that endpoint does not merely fill the orders
 * table, it exhausts the day's quota and the business stops receiving real
 * enquiries. There is no admin dashboard, so clearing the junk means hand-written
 * SQL. `POST /api/orders/draft-pdf` renders a full React-PDF document, which
 * costs CPU and a network font fetch, and needs no authentication at all.
 *
 * WHAT THIS IS NOT
 * It is not a guarantee. State lives in the memory of one serverless instance,
 * so the effective ceiling is the limit multiplied by however many instances
 * Vercel has warm, and a deploy resets every counter. That is a real weakness
 * and it is the reason this is deliberately the cheap half of the answer: the
 * durable control is a rate-limit rule in the Vercel firewall, which runs at the
 * edge before a function is even invoked, and this module is what makes the
 * abuse expensive in the meantime and keeps the limit meaningful in local
 * development. Reach for Upstash or the firewall before raising these numbers.
 *
 * `now` is injectable so the behaviour can be tested without faking timers.
 */

interface Options {
  /** Requests allowed inside the window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the caller may retry. Only meaningful when `ok` is false. */
  retryAfter: number
  /** Requests still available in the current window. */
  remaining: number
}

/**
 * Hit timestamps per key.
 *
 * A plain Map would grow without bound — one entry per distinct IP, forever, in
 * a long-lived instance. `MAX_KEYS` bounds it, and because Map iterates in
 * insertion order the oldest key is always the first one out.
 */
const hits = new Map<string, number[]>()
const MAX_KEYS = 5_000

function evictIfNeeded() {
  while (hits.size > MAX_KEYS) {
    const oldest = hits.keys().next()
    if (oldest.done) break
    hits.delete(oldest.value)
  }
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: Options,
  now: number = Date.now()
): RateLimitResult {
  const cutoff = now - windowMs
  // Timestamps older than the window are dropped on read rather than swept on a
  // timer: there is no scheduler in a serverless function, and a key nobody
  // touches again is evicted by MAX_KEYS regardless.
  const recent = (hits.get(key) ?? []).filter(t => t > cutoff)

  if (recent.length >= limit) {
    hits.set(key, recent)
    // The oldest hit in the window is the one whose expiry frees a slot.
    const retryAfter = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000))
    return { ok: false, retryAfter, remaining: 0 }
  }

  recent.push(now)
  hits.set(key, recent)
  evictIfNeeded()

  return { ok: true, retryAfter: 0, remaining: limit - recent.length }
}

/**
 * The caller's identity for limiting purposes.
 *
 * `x-forwarded-for` is a client-supplied header and is trivially spoofed in
 * general — but on Vercel the platform overwrites it at the edge, and the
 * left-most entry is the real client. Falling back to a single shared bucket
 * when there is no header is deliberate: an unidentifiable caller should be
 * limited, not exempt.
 */
export function clientKey(req: Request, scope: string): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  return `${scope}:${ip}`
}

/** Test seam. Nothing in the application should need this. */
export function __resetRateLimits() {
  hits.clear()
}
