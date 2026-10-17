/**
 * @jest-environment node
 */
import { AxiosError, AxiosHeaders } from 'axios'
import { parseRetryAfter, rateLimitFrom, DEFAULT_RETRY_AFTER_SECONDS } from '@/lib/rateLimit'
import { authErrorResponse } from '@/lib/api/authError'
import { formatCooldown } from '@/hooks/useRetryCooldown'

function axiosError(status: number, data: unknown, headers: Record<string, string> = {}) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status, statusText: '', data, headers, config,
  })
}

describe('parseRetryAfter', () => {
  it.each([
    ['delay-seconds', '120', 120],
    ['zero', '0', 0],
    ['padded', ' 30 ', 30],
    ['a number', 45, 45],
    ['an array (multi-value header)', ['15'], 15],
  ])('reads %s', (_label, value, expected) => {
    expect(parseRetryAfter(value)).toBe(expected)
  })

  it('reads an HTTP date as seconds from now', () => {
    const now = Date.parse('2026-10-17T10:00:00Z')
    expect(parseRetryAfter('Sat, 17 Oct 2026 10:01:30 GMT', now)).toBe(90)
    expect(parseRetryAfter('Sat, 17 Oct 2026 09:59:00 GMT', now)).toBe(0)
  })

  it.each([undefined, null, '', 'soon', -5, '-5'])('returns null for %p', (value) => {
    expect(parseRetryAfter(value)).toBeNull()
  })
})

describe('rateLimitFrom', () => {
  it('returns the message and Retry-After for a 429', () => {
    const err = axiosError(429, { errors: [{ code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Please try again in 15 minutes.' }] }, { 'retry-after': '900' })
    expect(rateLimitFrom(err)).toEqual({ message: 'Too many attempts. Please try again in 15 minutes.', retryAfter: 900 })
  })

  it('falls back to a default wait when Retry-After is missing', () => {
    const err = axiosError(429, { errors: [{ message: 'Too many attempts.' }] })
    expect(rateLimitFrom(err)?.retryAfter).toBe(DEFAULT_RETRY_AFTER_SECONDS)
  })

  it('ignores anything that is not a 429', () => {
    expect(rateLimitFrom(axiosError(401, { errors: [{ message: 'Invalid credentials' }] }))).toBeNull()
    expect(rateLimitFrom(new Error('boom'))).toBeNull()
  })
})

describe('authErrorResponse', () => {
  it('passes a 429 through with its errors and Retry-After', async () => {
    const errors = [{ code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Please try again in 15 minutes.', field: 'email' }]
    const res = authErrorResponse(axiosError(429, { data: null, errors }, { 'retry-after': '900' }), 'Login failed')
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('900')
    expect(await res.json()).toEqual({ errors })
  })

  it('passes a 413 through', async () => {
    const res = authErrorResponse(axiosError(413, { errors: [{ code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large.' }] }), 'Login failed')
    expect(res.status).toBe(413)
    expect((await res.json()).errors[0].message).toBe('Request body too large.')
  })

  it('normalises a { detail } body into the errors shape', async () => {
    const res = authErrorResponse(axiosError(400, { detail: 'Invalid or expired code' }), 'fallback')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ errors: [{ message: 'Invalid or expired code' }] })
    expect(res.headers.get('retry-after')).toBeNull()
  })

  it('uses the fallback for an unreadable body', async () => {
    const res = authErrorResponse(axiosError(502, '<html>bad gateway</html>'), 'Login failed')
    expect(res.status).toBe(502)
    expect((await res.json()).errors).toHaveLength(1)
  })
})

describe('formatCooldown', () => {
  it.each([[5, '5s'], [59, '59s'], [60, '1:00'], [900, '15:00'], [899, '14:59']])('%i → %s', (s, label) => {
    expect(formatCooldown(s)).toBe(label)
  })
})
