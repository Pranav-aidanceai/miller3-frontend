import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import BatchEnrichToast from '@/app/(modules)/search/BatchEnrichToast'

// ── Mocks ────────────────────────────────────────────────────────────────────
// The toast fetches a single-use ticket from this app's own
// /api/batch-enrichment/{id}/ws-ticket route before every (re)connect, then
// opens the socket on the returned ws_url. The backend refuses a socket with
// 4401 (missing/expired/used ticket) or 4403 (not the batch owner).

jest.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}))

jest.mock('@/store/store', () => ({
  store: { dispatch: jest.fn() },
}))

jest.mock('sonner', () => ({
  toast: { dismiss: jest.fn() },
}))

jest.mock('@/components/ui/progress', () => ({
  Progress: () => null,
}))

import apiClient from '@/lib/api/client'
const mockPost = apiClient.post as jest.Mock
const mockGet = apiClient.get as jest.Mock

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: ((ev: { code: number }) => void) | null = null

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED
  }

  // ── test helpers ──
  serverOpen() {
    act(() => {
      this.readyState = FakeWebSocket.OPEN
      this.onopen?.()
    })
  }
  serverSend(frame: unknown) {
    act(() => this.onmessage?.({ data: JSON.stringify(frame) }))
  }
  serverClose(code: number) {
    act(() => {
      this.readyState = FakeWebSocket.CLOSED
      this.onclose?.({ code })
    })
  }
}

let ticketCount = 0
function issueTickets() {
  mockPost.mockImplementation(async () => {
    ticketCount += 1
    return { data: { data: { ws_url: `wss://api.test/ws?ticket=t${ticketCount}`, expires_in: 60 } } }
  })
}

const sockets = () => FakeWebSocket.instances
const latestSocket = () => sockets()[sockets().length - 1]

async function waitForSockets(n: number, timeout = 3000) {
  await waitFor(() => expect(sockets()).toHaveLength(n), { timeout })
  return latestSocket()
}

const renderToast = (total = 3) =>
  render(<BatchEnrichToast toastId="t" batchId="batch-1" total={total} />)

beforeEach(() => {
  FakeWebSocket.instances = []
  ticketCount = 0
  mockPost.mockReset()
  mockGet.mockReset()
  ;(global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket
})

describe('BatchEnrichToast — ticketed progress socket', () => {
  it('fetches a ticket for the batch and connects with it', async () => {
    issueTickets()
    renderToast()

    const ws = await waitForSockets(1)
    expect(mockPost).toHaveBeenCalledWith('/batch-enrichment/batch-1/ws-ticket', {})
    expect(ws.url).toBe('wss://api.test/ws?ticket=t1')

    ws.serverOpen()
    ws.serverSend({ company_id: 'a', status: 'completed' })
    expect(screen.getByText(/1 of 3 companies enriched/)).toBeInTheDocument()
  })

  it('reconnects after a dropped connection with a fresh ticket', async () => {
    issueTickets()
    renderToast()

    const first = await waitForSockets(1)
    first.serverOpen()
    first.serverClose(1006)
    expect(screen.getByText(/Reconnecting/)).toBeInTheDocument()

    const second = await waitForSockets(2)
    expect(mockPost).toHaveBeenCalledTimes(2)
    expect(second.url).toBe('wss://api.test/ws?ticket=t2')
  })

  it('does not double-count companies whose frames are replayed after a reconnect', async () => {
    issueTickets()
    renderToast()

    const first = await waitForSockets(1)
    first.serverOpen()
    first.serverSend({ company_id: 'a', status: 'completed' })
    first.serverClose(1006)

    const second = await waitForSockets(2)
    second.serverOpen()
    second.serverSend({ company_id: 'a', status: 'completed' })
    second.serverSend({ company_id: 'b', status: 'completed' })

    expect(screen.getByText(/2 of 3 companies enriched/)).toBeInTheDocument()
  })

  it('retries a refused ticket (4401) once, immediately, then gives up', async () => {
    issueTickets()
    renderToast()

    const first = await waitForSockets(1)
    first.serverClose(4401)

    const second = await waitForSockets(2, 500)
    expect(second.url).toBe('wss://api.test/ws?ticket=t2')
    second.serverClose(4401)

    expect(await screen.findByText('The progress connection was refused.')).toBeInTheDocument()
    expect(sockets()).toHaveLength(2)
  })

  it('stops without retrying when the socket is forbidden (4403)', async () => {
    issueTickets()
    renderToast()

    const ws = await waitForSockets(1)
    ws.serverClose(4403)

    expect(await screen.findByText("You don't have access to this batch's progress.")).toBeInTheDocument()
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('never opens a socket when the ticket is refused', async () => {
    mockPost.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { isAxiosError: true, response: { status: 403 } })
    )
    renderToast()

    expect(await screen.findByText("You don't have access to this batch's progress.")).toBeInTheDocument()
    expect(sockets()).toHaveLength(0)
  })
})

describe('BatchEnrichToast — status polling fallback', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  const advance = (ms: number) => act(async () => { await jest.advanceTimersByTimeAsync(ms) })

  const statusBody = (overrides: Record<string, unknown> = {}) => ({
    data: {
      data: {
        batch_id: 'batch-1',
        status: 'processing',
        total_records: 100,
        processed: 1,
        succeeded: 1,
        failed: 0,
        duplicate_count: 0,
        percentage: 1.0,
        completed_at: null,
        cancelled_at: null,
        ...overrides,
      },
    },
  })

  /** Initial socket + 5 reconnects, each dropped before any frame arrives. */
  async function exhaustReconnects() {
    await advance(0)
    for (let i = 0; i < 6; i++) {
      expect(sockets()).toHaveLength(i + 1)
      latestSocket().serverClose(1006)
      // The last drop starts polling straight away; don't run into the next poll.
      await advance(i < 5 ? 8000 : 0)
    }
  }

  it('polls /status once reconnects are exhausted, then completes', async () => {
    issueTickets()
    mockGet
      .mockResolvedValueOnce(statusBody())
      .mockResolvedValueOnce(statusBody({ status: 'completed', processed: 100, succeeded: 97, failed: 3, completed_at: '2026-10-17T10:00:00Z' }))
    renderToast(100)

    await exhaustReconnects()

    expect(mockGet).toHaveBeenCalledWith('/batch-enrichment/batch-1/status')
    // percentage 1.0 means 1%, not 100%.
    expect(screen.getByText(/1 of 100 companies enriched \(1%\) · Checking periodically/)).toBeInTheDocument()
    expect(sockets()).toHaveLength(6)

    await advance(5000)
    expect(screen.getByText('Finishing up')).toBeInTheDocument()
  })

  it('reports a cancelled batch as interrupted', async () => {
    issueTickets()
    mockGet.mockResolvedValue(statusBody({ status: 'cancelled', cancelled_at: '2026-10-17T10:00:00Z' }))
    renderToast(100)

    await exhaustReconnects()

    expect(screen.getByText('Enrichment was cancelled.')).toBeInTheDocument()
  })

  it('gives up after repeated polling failures', async () => {
    issueTickets()
    mockGet.mockRejectedValue(Object.assign(new Error('boom'), { isAxiosError: true, response: { status: 502 } }))
    renderToast(100)

    await exhaustReconnects()
    await advance(5000 * 6)

    expect(screen.getByText(/Lost track of progress/)).toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledTimes(6)
  })
})
