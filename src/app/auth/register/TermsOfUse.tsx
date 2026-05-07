'use client'

import { X } from 'lucide-react'

interface TermsModalProps {
  onAccept: () => void
  onClose: () => void
}

export default function TermsModal({ onAccept, onClose }: TermsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-120 w-full max-w-lg flex-col rounded-lg border border-input bg-background">
        <div className="flex items-center justify-between border-b border-input px-6 py-4">
          <div>
            <p className="text-base font-medium">Terms of Use</p>
            <p className="text-xs text-muted-foreground">Last updated: May 2025</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-muted-foreground leading-relaxed space-y-4">
          {[
            ['1. Acceptance of terms', 'By creating an account and using Miller3, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not register or use the service.'],
            ['2. Use of the service', 'You agree to use Miller3 only for lawful purposes and in a way that does not infringe the rights of others. You must not use the service to transmit unsolicited messages, engage in fraudulent activity, or violate any applicable laws or regulations.'],
            ['3. Account responsibility', 'You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorised use of your account.'],
            ['4. Intellectual property', 'All content, trademarks, and software provided through Miller3 are owned by or licensed to us. You may not reproduce, distribute, or create derivative works without our prior written consent.'],
            ['5. Privacy', 'Your use of Miller3 is also governed by our Privacy Policy. By using the service, you consent to the collection and use of your information as described therein.'],
            ['6. Limitation of liability', 'Miller3 is provided on an "as is" basis without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.'],
            ['7. Termination', 'We reserve the right to suspend or terminate your account at our discretion if you violate these terms or engage in conduct we deem harmful to other users or the service.'],
            ['8. Changes to these terms', 'We may update these Terms of Use from time to time. Continued use of Miller3 after changes are posted constitutes your acceptance of the revised terms.'],
          ].map(([heading, body]) => (
            <div key={heading}>
              <p className="font-medium text-foreground mb-1">{heading}</p>
              <p>{body}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-input px-6 py-4">
          <button onClick={onClose} className="h-9 rounded-md border border-input px-4 text-sm text-muted-foreground hover:bg-secondary cursor-pointer">
            Decline
          </button>
          <button onClick={onAccept} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
            I accept
          </button>
        </div>
      </div>
    </div>
  )
}