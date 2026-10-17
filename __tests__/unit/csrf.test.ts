/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { isCrossSiteRequest } from '@/lib/csrf'
import { proxy } from '@/proxy'

const SITE = 'https://miller3.azurewebsites.net'

function req(path: string, method = 'POST', headers: Record<string, string> = {}) {
  return new NextRequest(`${SITE}${path}`, { method, headers })
}

describe('isCrossSiteRequest', () => {
  it('allows our own pages (Sec-Fetch-Site: same-origin)', () => {
    expect(isCrossSiteRequest(req('/api/bucket', 'POST', { 'sec-fetch-site': 'same-origin' }))).toBe(false)
  })

  it.each(['cross-site', 'same-site', 'none'])('blocks Sec-Fetch-Site: %s', (site) => {
    expect(isCrossSiteRequest(req('/api/bucket', 'POST', { 'sec-fetch-site': site }))).toBe(true)
  })

  it('trusts Sec-Fetch-Site over a matching Origin', () => {
    expect(isCrossSiteRequest(req('/api/bucket', 'POST', { 'sec-fetch-site': 'cross-site', origin: SITE }))).toBe(true)
  })

  it.each(['PUT', 'PATCH', 'DELETE'])('applies to %s', (method) => {
    expect(isCrossSiteRequest(req('/api/bucket', method, { 'sec-fetch-site': 'cross-site' }))).toBe(true)
  })

  it.each(['GET', 'HEAD', 'OPTIONS'])('never blocks %s (reads don\'t change state)', (method) => {
    expect(isCrossSiteRequest(req('/api/bucket', method, { 'sec-fetch-site': 'cross-site' }))).toBe(false)
  })

  describe('older browsers without Sec-Fetch-Site (Origin fallback)', () => {
    it('allows an Origin matching the requested host', () => {
      expect(isCrossSiteRequest(req('/api/bucket', 'POST', { origin: SITE }))).toBe(false)
    })

    it('allows an Origin matching X-Forwarded-Host (behind a proxy)', () => {
      const r = new NextRequest('http://localhost:8080/api/bucket', {
        method: 'POST',
        headers: { origin: SITE, 'x-forwarded-host': 'miller3.azurewebsites.net' },
      })
      expect(isCrossSiteRequest(r)).toBe(false)
    })

    it('blocks a foreign Origin', () => {
      expect(isCrossSiteRequest(req('/api/bucket', 'POST', { origin: 'https://evil.example' }))).toBe(true)
    })

    it('blocks a look-alike host', () => {
      expect(isCrossSiteRequest(req('/api/bucket', 'POST', { origin: 'https://miller3.azurewebsites.net.evil.example' }))).toBe(true)
    })

    it('blocks Origin: null (sandboxed iframe, file://)', () => {
      expect(isCrossSiteRequest(req('/api/bucket', 'POST', { origin: 'null' }))).toBe(true)
    })
  })

  it('allows a request with neither header (non-browser client — not a CSRF vector)', () => {
    expect(isCrossSiteRequest(req('/api/bucket', 'POST'))).toBe(false)
  })
})

describe('proxy', () => {
  it('rejects a cross-site POST to an API route with 403', async () => {
    const res = proxy(req('/api/bucket', 'POST', { 'sec-fetch-site': 'cross-site' }))
    expect(res.status).toBe(403)
    expect((await res.json()).errors[0].code).toBe('CROSS_SITE_REQUEST')
  })

  it('lets a same-origin POST to an API route through', () => {
    const res = proxy(req('/api/bucket', 'POST', { 'sec-fetch-site': 'same-origin' }))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('never redirects API routes, even without a session', () => {
    const res = proxy(req('/api/search/ai/templates', 'GET'))
    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(res.headers.get('location')).toBeNull()
  })

  it('still redirects protected pages to login without a session', () => {
    const res = proxy(req('/search', 'GET'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(`${SITE}/?next=%2Fsearch`)
  })
})
