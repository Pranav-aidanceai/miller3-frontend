'use client'

import { SessionEndedNotice } from '@/components/session/SessionEndedNotice'

interface ApprovalPendingProps {
  onClose: () => void
  adminEmail?: string
}

export default function ApprovalPending({ onClose, adminEmail = 'admin@miller3.com' }: ApprovalPendingProps) {
  return <SessionEndedNotice variant="page" reason="pending" onClose={onClose} adminEmail={adminEmail} />
}
