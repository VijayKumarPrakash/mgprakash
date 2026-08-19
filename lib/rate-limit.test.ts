import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, clientKey, __resetRateLimits } from './rate-limit'

/**
 * The clock is passed in rather than faked, so these are ordinary synchronous
 * assertions about a sliding window.
 */

beforeEach(() => {
  __resetRateLimits()
})

const opts = { limit: 3, windowMs: 60_000 }

describe('checkRateLimit', () => {
  it('allows up to the limit and then refuses', () => {
    const t = 1_000_000
    expect(checkRateLimit('a', opts, t)).toMatchObject({ ok: true, remaining: 2 })
    expect(checkRateLimit('a', opts, t)).toMatchObject({ ok: true, remaining: 1 })
    expect(checkRateLimit('a', opts, t)).toMatchObject({ ok: true, remaining: 0 })
    expect(checkRateLimit('a', opts, t).ok).toBe(false)
  })

  it('keeps keys independent', () => {
    const t = 1_000_000
    for (let i = 0; i < 3; i++) checkRateLimit('a', opts, t)
    expect(checkRateLimit('a', opts, t).ok).toBe(false)
    // One noisy address must not lock out everybody else.
    expect(checkRateLimit('b', opts, t).ok).toBe(true)
  })

  it('lets the window slide rather than resetting in fixed blocks', () => {
    // Spaced deliberately. Three hits at the same instant would all age out
    // together, which tests nothing about sliding — the window has to be
    // exercised with hits that expire one at a time.
    const t = 1_000_000
    checkRateLimit('a', opts, t)
    checkRateLimit('a', opts, t + 20_000)
    checkRateLimit('a', opts, t + 40_000)
    expect(checkRateLimit('a', opts, t + 40_000).ok).toBe(false)

    // Still inside the window of all three.
    expect(checkRateLimit('a', opts, t + 59_000).ok).toBe(false)

    // Only the first hit has aged out, so exactly one slot frees up and the
    // next request after it is refused again.
    expect(checkRateLimit('a', opts, t + 60_001).ok).toBe(true)
    expect(checkRateLimit('a', opts, t + 60_002).ok).toBe(false)

    // The second hit expires 20s later, freeing the next slot.
    expect(checkRateLimit('a', opts, t + 80_001).ok).toBe(true)
  })

  it('reports when a slot next frees up', () => {
    const t = 1_000_000
    for (let i = 0; i < 3; i++) checkRateLimit('a', opts, t)

    const refused = checkRateLimit('a', opts, t + 30_000)
    expect(refused.ok).toBe(false)
    // 30s elapsed of a 60s window, so the oldest hit expires in 30s.
    expect(refused.retryAfter).toBe(30)
  })

  it('never reports a retryAfter of zero while refusing', () => {
    // A Retry-After of 0 invites an immediate retry, which is the opposite of
    // what a refusal is for.
    const t = 1_000_000
    for (let i = 0; i < 3; i++) checkRateLimit('a', opts, t)
    const refused = checkRateLimit('a', opts, t + 59_999)
    expect(refused.ok).toBe(false)
    expect(refused.retryAfter).toBeGreaterThanOrEqual(1)
  })

  it('does not count refused attempts against the window', () => {
    // Otherwise a client hammering the endpoint would extend its own ban
    // indefinitely and could never come back.
    const t = 1_000_000
    for (let i = 0; i < 3; i++) checkRateLimit('a', opts, t)
    for (let i = 0; i < 20; i++) checkRateLimit('a', opts, t + 1_000)
    expect(checkRateLimit('a', opts, t + 60_001).ok).toBe(true)
  })
})

describe('clientKey', () => {
  const withHeaders = (h: Record<string, string>) =>
    new Request('https://example.com/api/orders', { method: 'POST', headers: h })

  it('takes the left-most forwarded address', () => {
    const key = clientKey(withHeaders({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18' }), 'orders')
    expect(key).toBe('orders:203.0.113.7')
  })

  it('falls back to x-real-ip', () => {
    expect(clientKey(withHeaders({ 'x-real-ip': '203.0.113.9' }), 'orders')).toBe('orders:203.0.113.9')
  })

  it('buckets an unidentifiable caller rather than exempting it', () => {
    expect(clientKey(withHeaders({}), 'orders')).toBe('orders:unknown')
  })

  it('scopes separately per endpoint', () => {
    const headers = { 'x-forwarded-for': '203.0.113.7' }
    // Submitting an order and previewing a draft PDF have different costs and
    // must not share a budget.
    expect(clientKey(withHeaders(headers), 'orders'))
      .not.toBe(clientKey(withHeaders(headers), 'draft-pdf'))
  })
})
