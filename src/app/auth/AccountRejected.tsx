'use client'

import { Ban, X } from 'lucide-react'

interface AccountRejectedProps {
  onClose: () => void
  adminEmail?: string
}

export default function AccountRejected({ onClose, adminEmail = 'info@miler3group.com' }: AccountRejectedProps) {
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

        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Ban className="h-8 w-8" />
        </div>

        <h2 className="mt-5 text-xl font-semibold">Account Rejected</h2>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Your account access has been rejected by an administrator. If you
          believe this was a mistake, please reach out to us for assistance.
        </p>

        <p className="mt-4 text-xs text-muted-foreground">
          Contact the admin for more information.
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
