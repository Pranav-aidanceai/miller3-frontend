'use client'

import { SessionEndedNotice } from '@/components/session/SessionEndedNotice'

interface AccountRejectedProps {
  onClose: () => void
  adminEmail?: string
}

export default function AccountRejected({ onClose, adminEmail }: AccountRejectedProps) {
  return <SessionEndedNotice variant="page" reason="rejected" onClose={onClose} adminEmail={adminEmail} />
}
