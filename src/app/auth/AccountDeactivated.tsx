'use client'

import { SessionEndedNotice } from '@/components/session/SessionEndedNotice'

interface AccountDeactivatedProps {
  onClose: () => void
  adminEmail?: string
}

export default function AccountDeactivated({ onClose, adminEmail }: AccountDeactivatedProps) {
  return <SessionEndedNotice variant="page" reason="deactivated" onClose={onClose} adminEmail={adminEmail} />
}
