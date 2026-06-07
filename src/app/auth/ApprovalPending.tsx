'use client'

import { Clock, X } from 'lucide-react'

interface ApprovalPendingProps {
  onClose: () => void
  adminEmail?: string
}

export default function ApprovalPending({ onClose, adminEmail = 'admin@miller3.com' }: ApprovalPendingProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex w-full max-w-md flex-col items-center rounded-lg border border-input bg-background px-6 py-10 text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock className="h-8 w-8" />
        </div>

        <h2 className="mt-5 text-xl font-semibold">Approval Pending</h2>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Your account is pending admin approval. You&apos;ll be able to sign in
          once an administrator has reviewed and approved your access.
        </p>

        <p className="mt-4 text-xs text-muted-foreground">
          Contact your admin for more information.
        </p>

        <a
          href={`mailto:${adminEmail}`}
          className="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          Contact Admin
        </a>
      </div>
    </div>
  )
}
