/**
 * @jest-environment node
 */
import { parseClientIp } from '@/lib/api/clientIp'

// ── Mocks (for the login-route wiring test) ──────────────────────────────────
let incomingXff: string | null = null

jest.mock('next/headers', () => ({
  headers: async () => new Headers(incomingXff ? { 'x-forwarded-for': incomingXff } : {}),
}))

jest.mock('axios', () => {
  const actual = jest.requireActual('axios')
  return { __esModule: true, ...actual, default: { ...actual.default, post: jest.fn() } }
})

import axios from 'axios'
import { POST as loginPOST } from '@/app/api/auth/login/route'
const mockPost = axios.post as jest.Mock

describe('parseClientIp — App Service X-Forwarded-For', () => {
  it.each([
    ['IPv4 with port', '203.0.113.7:51234', '203.0.113.7'],
    ['IPv6 with port', '[2001:db8::1]:51234', '2001:db8::1'],
    ['bare IPv4', '203.0.113.7', '203.0.113.7'],
    ['bare IPv6', '2001:db8::1', '2001:db8::1'],
    ['surrounding whitespace', '  203.0.113.7:443  ', '203.0.113.7'],
  ])('%s', (_label, xff, expected) => {
    expect(parseClientIp(xff)).toBe(expected)
  })

  it('takes only the last (App Service-appended) entry, ignoring spoofed earlier ones', () => {
    expect(parseClientIp('1.2.3.4, 10.0.0.1, 203.0.113.7:51234')).toBe('203.0.113.7')
  })

  it('ignores a trailing empty entry', () => {
    expect(parseClientIp('1.2.3.4, 203.0.113.7:51234, ')).toBe('203.0.113.7')
  })

  it.each([
    ['missing header', null],
    ['empty header', ''],
    ['not an IP', 'unknown'],
    ['hostname with port', 'example.com:443'],
    ['out-of-range octets', '999.1.1.1:80'],
    ['unterminated IPv6 bracket', '[2001:db8::1'],
  ])('returns null for %s', (_label, xff) => {
    expect(parseClientIp(xff)).toBeNull()
  })
})

describe('login route — forwards the client IP to the backend', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockPost.mockResolvedValue({
      status: 200,
      data: { data: { access_token: 'a', refresh_token: 'r', role: 'user', user_details: {}, role_details: {}, credits_left: 1 } },
    })
  })

  const login = () =>
    loginPOST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'x@example.com', password: 'pw' }),
    }))

  it('sends exactly one plain IP, not the incoming header', async () => {
    incomingXff = '1.2.3.4, 203.0.113.7:51234'
    await login()
    const headers = mockPost.mock.calls[0][2].headers
    expect(headers['x-forwarded-for']).toBe('203.0.113.7')
  })

  it('sends no x-forwarded-for when the IP is unknown', async () => {
    incomingXff = null
    await login()
    const headers = mockPost.mock.calls[0][2].headers
    expect(headers).not.toHaveProperty('x-forwarded-for')
  })
})
