'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import axios from 'axios'

interface TermsModalProps {
  onAccept: () => void
  onClose: () => void
}

export default function TermsModal({ onAccept, onClose }: TermsModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scrolledToEnd, setScrolledToEnd] = useState(false)

  useEffect(() => {
    let active = true

    const fetchAgreement = async () => {
      try {
        const res = await axios.get('/api/auth/user-agreement')

        // The route wraps the upstream response as { data: ... }. The markdown
        // may be the string itself or nested under a common key.
        const payload = res.data?.data
        const markdown =
          typeof payload === 'string'
            ? payload
            : payload?.data ?? payload?.content ?? payload?.tou ?? ''

        if (active) setContent(markdown)
      } catch (err) {
        const message = axios.isAxiosError(err)
          ? (err.response?.data?.error ?? 'Failed to load terms')
          : (err instanceof Error ? err.message : 'Failed to load terms')
        if (active) setError(message)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchAgreement()
    return () => {
      active = false
    }
  }, [])

  const checkScrollEnd = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const reachedEnd = el.scrollHeight - el.scrollTop - el.clientHeight <= 8
    // If the content is short enough that there's nothing to scroll, allow accept.
    if (reachedEnd || el.scrollHeight <= el.clientHeight) {
      setScrolledToEnd(true)
    }
  }, [])

  // Re-evaluate once content renders, in case it fits without scrolling.
  useEffect(() => {
    if (!loading) checkScrollEnd()
  }, [loading, content, checkScrollEnd])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-input bg-background">
        <div className="flex items-center justify-between border-b border-input px-6 py-4">
          <div>
            <p className="text-base font-medium">Terms of Use</p>
            <p className="text-xs text-muted-foreground">Please read the full agreement before accepting</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={scrollRef}
          onScroll={checkScrollEnd}
          className="flex-1 overflow-y-auto px-6 py-5 text-sm text-muted-foreground leading-relaxed"
        >
          {loading ? (
            <p className="text-center py-10">Loading terms…</p>
          ) : error ? (
            <p className="text-center py-10 text-destructive">{error}</p>
          ) : (
            <ReactMarkdown
              components={{
                h1: (props) => <h1 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0" {...props} />,
                h2: (props) => <h2 className="text-base font-semibold text-foreground mt-4 mb-2 first:mt-0" {...props} />,
                h3: (props) => <h3 className="text-sm font-semibold text-foreground mt-3 mb-1" {...props} />,
                p: (props) => <p className="mb-3" {...props} />,
                ul: (props) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                ol: (props) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                li: (props) => <li className="leading-relaxed" {...props} />,
                a: (props) => <a className="text-primary underline" target="_blank" rel="noreferrer" {...props} />,
                strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-input px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {scrolledToEnd ? 'You have read the full agreement.' : 'Please read fully to accept.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-9 rounded-md border border-input px-4 text-sm text-muted-foreground hover:bg-secondary cursor-pointer"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              disabled={!scrolledToEnd || loading}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              I accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
