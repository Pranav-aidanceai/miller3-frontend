/**
 * @jest-environment node
 */
import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'

// ── Mocks ────────────────────────────────────────────────────────────────────
// The shared server instance reads/writes auth cookies via next/headers, and
// refreshes an expired access token with a raw axios.post to /token/refresh.
// The backend rotates refresh tokens: each refresh returns a new one and the
// old one becomes single-use.

let jar: Record<string, string | undefined> = {}
const mockCookieSet = jest.fn()
jest.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar[name] ? { value: jar[name] } : undefined),
    set: mockCookieSet,
  }),
  headers: async () => new Headers(),
}))

import AXIOS from '@/lib/api/server'
import { POST as logoutPOST } from '@/app/api/auth/logout/route'

function errorFor(config: InternalAxiosRequestConfig, status: number, headers: Record<string, string> = {}, data: unknown = {}) {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status, statusText: '', data, headers, config,
  })
}

const backendError = (status: number, headers: Record<string, string> = {}, data: unknown = {}) =>
  errorFor({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig, status, headers, data)

// Every test uses its own refresh token, so the module-level refresh cache
// (kept for a short reuse window) never leaks between tests.
let seq = 0
let refreshToken: string
let postSpy: jest.SpyInstance

/** The backend: rotates on every refresh. */
const rotating = async (_url: string, body: { refresh_token: string }) => ({
  data: { access_token: `access:${body.refresh_token}`, refresh_token: `next:${body.refresh_token}`, token_type: 'bearer' },
})

beforeEach(() => {
  seq += 1
  refreshToken = `refresh-${seq}`
  jar = { access_token: 'access-old', refresh_token: refreshToken }
  mockCookieSet.mockReset()
  postSpy = jest.spyOn(axios, 'post')
  // Expired access token → 401; anything else → 200 echoing the token used.
  AXIOS.defaults.adapter = async (config) => {
    const auth = String(config.headers?.Authorization ?? '')
    if (auth === 'Bearer access-old' || auth === '') throw errorFor(config, 401)
    return { status: 200, statusText: 'OK', data: { auth }, headers: {}, config }
  }
})

afterEach(() => postSpy.mockRestore())

const cookieWrites = (name: string) => mockCookieSet.mock.calls.filter(([n]) => n === name)

describe('server AXIOS — refresh-token rotation', () => {
  it('stores the rotated refresh token with the login flags and retries with the new access token', async () => {
    postSpy.mockImplementation(rotating)

    const res = await AXIOS.get('/api/v1/anything')

    expect(res.data.auth).toBe(`Bearer access:${refreshToken}`)
    expect(postSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/token/refresh'),
      { refresh_token: refreshToken },
      expect.anything()
    )
    expect(mockCookieSet).toHaveBeenCalledWith('access_token', `access:${refreshToken}`,
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }))
    expect(mockCookieSet).toHaveBeenCalledWith('refresh_token', `next:${refreshToken}`,
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 604800 }))
  })

  it('leaves the refresh cookie alone while the backend does not rotate yet', async () => {
    postSpy.mockResolvedValue({ data: { access_token: 'access-new', token_type: 'bearer' } })

    await AXIOS.get('/api/v1/anything')

    expect(cookieWrites('access_token')).toHaveLength(1)
    expect(cookieWrites('refresh_token')).toHaveLength(0)
  })

  it('shares one refresh between parallel requests carrying the same token', async () => {
    postSpy.mockImplementation(rotating)

    const results = await Promise.all([
      AXIOS.get('/api/v1/a'), AXIOS.get('/api/v1/b'), AXIOS.get('/api/v1/c'),
    ])

    expect(postSpy).toHaveBeenCalledTimes(1)
    results.forEach((r) => expect(r.data.auth).toBe(`Bearer access:${refreshToken}`))
    // Each response hands the browser the same new tokens.
    expect(cookieWrites('refresh_token').map(([, v]) => v)).toEqual(Array(3).fill(`next:${refreshToken}`))
  })

  it('reuses a just-completed refresh for a request still carrying the old token', async () => {
    postSpy.mockImplementation(rotating)

    await AXIOS.get('/api/v1/first')
    // A request the browser sent before it received the new cookie.
    const late = await AXIOS.get('/api/v1/late')

    expect(postSpy).toHaveBeenCalledTimes(1)
    expect(late.data.auth).toBe(`Bearer access:${refreshToken}`)
  })

  it('never hands one user the tokens refreshed for another', async () => {
    postSpy.mockImplementation(rotating)
    const userA = refreshToken
    const userB = `${refreshToken}-other-user`

    const a = await AXIOS.get('/api/v1/anything')
    jar = { access_token: 'access-old', refresh_token: userB }
    const b = await AXIOS.get('/api/v1/anything')

    expect(postSpy).toHaveBeenCalledTimes(2)
    expect(a.data.auth).toBe(`Bearer access:${userA}`)
    expect(b.data.auth).toBe(`Bearer access:${userB}`)
  })
})

describe('server AXIOS — when the session is over', () => {
  it('turns a 401 from refresh into SESSION_EXPIRED and clears both cookies', async () => {
    postSpy.mockRejectedValue(backendError(401))

    const err = await AXIOS.get('/api/v1/anything').catch((e) => e)

    expect(err).toBeInstanceOf(AxiosError)
    expect(err.response.status).toBe(401)
    expect(err.response.data.errors[0].code).toBe('SESSION_EXPIRED')
    expect(mockCookieSet).toHaveBeenCalledWith('access_token', '', expect.objectContaining({ maxAge: 0 }))
    expect(mockCookieSet).toHaveBeenCalledWith('refresh_token', '', expect.objectContaining({ maxAge: 0 }))
  })

  it('does not remember a failed refresh', async () => {
    postSpy.mockRejectedValueOnce(backendError(401)).mockImplementation(rotating)

    await AXIOS.get('/api/v1/anything').catch(() => {})
    const retry = await AXIOS.get('/api/v1/anything')

    expect(postSpy).toHaveBeenCalledTimes(2)
    expect(retry.data.auth).toBe(`Bearer access:${refreshToken}`)
  })

  it('reports SESSION_EXPIRED without calling the backend when there is no refresh cookie', async () => {
    jar = { access_token: 'access-old' }

    const err = await AXIOS.get('/api/v1/anything').catch((e) => e)

    expect(err.response.data.errors[0].code).toBe('SESSION_EXPIRED')
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('passes a 403 (deactivated) through without clearing cookies', async () => {
    postSpy.mockRejectedValue(backendError(403, {}, { error_code: 'ACCOUNT_DEACTIVATED' }))

    const err = await AXIOS.get('/api/v1/anything').catch((e) => e)

    expect(err.response.status).toBe(403)
    expect(mockCookieSet).not.toHaveBeenCalled()
  })
})

describe('server AXIOS — token refresh rate limiting', () => {
  it('waits out a short Retry-After, refreshes once more, then retries the request', async () => {
    postSpy.mockRejectedValueOnce(backendError(429, { 'retry-after': '0' })).mockImplementation(rotating)

    const res = await AXIOS.get('/api/v1/anything')

    expect(res.data.auth).toBe(`Bearer access:${refreshToken}`)
    expect(postSpy).toHaveBeenCalledTimes(2)
  })

  it('passes a long Retry-After back as a 429 — not a sign-out', async () => {
    postSpy.mockRejectedValueOnce(backendError(429, { 'retry-after': '60' }, {
      errors: [{ code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please try again in a minute.' }],
    }))

    const err = await AXIOS.get('/api/v1/anything').catch((e) => e)

    expect(axios.isAxiosError(err)).toBe(true)
    expect(err.response.status).toBe(429)
    expect(err.response.headers['retry-after']).toBe('60')
    expect(postSpy).toHaveBeenCalledTimes(1)
    expect(mockCookieSet).not.toHaveBeenCalled()
  })
})

describe('logout route', () => {
  it('signs out when the session was already over (refresh 401)', async () => {
    postSpy.mockRejectedValue(backendError(401))

    const res = await logoutPOST()

    expect(res.status).toBe(200)
    expect(res.headers.getSetCookie().join('\n')).toMatch(/refresh_token=;.*Max-Age=0/)
  })

  it('clears the cookies in the cookies() store last, after a refresh during logout', async () => {
    postSpy.mockImplementation(rotating)

    const res = await logoutPOST()

    expect(res.status).toBe(200)
    // The refresh wrote new tokens to the store; the final write must clear them.
    const refreshWrites = cookieWrites('refresh_token').map(([, v]) => v)
    expect(refreshWrites).toEqual([`next:${refreshToken}`, ''])
  })
})
