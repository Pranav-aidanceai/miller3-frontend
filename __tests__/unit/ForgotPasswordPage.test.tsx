import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgotPasswordPage from '@/app/auth/forgot-password/page'

// ── Mocks ────────────────────────────────────────────────────────────────────
// The real flow is a 4-step wizard (email -> OTP -> new password -> done),
// backed by resetPasswordAction (sends the code) and two apiClient calls
// (verify-otp, confirm-password) — see src/app/auth/forgot-password/page.tsx.

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}))

jest.mock('@/app/auth/authServices', () => ({
  resetPasswordAction: jest.fn(),
}))

jest.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}))

import { resetPasswordAction } from '@/app/auth/authServices'
import apiClient from '@/lib/api/client'
const mockResetPasswordAction = resetPasswordAction as jest.Mock
const mockApiClientPost = apiClient.post as jest.Mock

const VALID_OTP = '123456'

/** Drives the form from the email step through to a submitted OTP. `user`
 * defaults to the plain userEvent import; tests running under fake timers
 * pass a `userEvent.setup({ delay: null })` instance instead (see the
 * "Resend Code" describe block) so its internal waits don't depend on
 * real/fake timers being advanced. */
const getToOtpStep = async (email = 'user@example.com', user: Pick<typeof userEvent, 'type' | 'click'> = userEvent) => {
  render(<ForgotPasswordPage />)
  await user.type(screen.getByTestId('email-input'), email)
  await user.click(screen.getByRole('button', { name: /send reset code/i }))
  await screen.findByText(new RegExp(`enter the code sent to ${email}`, 'i'))
}

/** Drives the form all the way to the new-password step. */
const getToPasswordStep = async () => {
  mockApiClientPost.mockResolvedValueOnce({ data: {} }) // verify-otp
  await getToOtpStep()
  await userEvent.type(screen.getByTestId('otp-box-0'), VALID_OTP)
  await userEvent.click(screen.getByRole('button', { name: /verify code/i }))
  await screen.findByText(/choose a new password/i)
}

describe('ForgotPasswordPage', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // 1. Step 1 — email
  describe('Step 1 - email', () => {
    it('renders the email input', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
    })

    it('renders the Send Reset Code button, disabled initially', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByRole('button', { name: /send reset code/i })).toBeDisabled()
    })

    it('renders the Reset your password subtitle', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByText(/reset your password/i)).toBeInTheDocument()
    })

    it('shows email required error when touched and empty', async () => {
      render(<ForgotPasswordPage />)
      await userEvent.click(screen.getByTestId('email-input'))
      await userEvent.tab()
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('shows invalid email error for bad email format', async () => {
      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'notanemail')
      await userEvent.tab()
      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
      })
    })

    it('enables Send Reset Code once a valid email is entered', async () => {
      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send reset code/i })).not.toBeDisabled()
      })
    })

    it('advances to the OTP step on success', async () => {
      mockResetPasswordAction.mockResolvedValue({ data: true, errors: null })
      await getToOtpStep()
      expect(screen.getByTestId('otp-box-0')).toBeInTheDocument()
    })

    it('shows a server error and stays on this step on failure', async () => {
      mockResetPasswordAction.mockResolvedValue({
        data: null,
        errors: [{ message: 'No account found with this email' }],
      })
      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await userEvent.click(screen.getByRole('button', { name: /send reset code/i }))
      await waitFor(() => {
        expect(screen.getByText(/no account found with this email/i)).toBeInTheDocument()
      })
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
    })

    it('shows Sending... while the request is in progress', async () => {
      mockResetPasswordAction.mockImplementation(() => new Promise(() => { }))
      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await userEvent.click(screen.getByRole('button', { name: /send reset code/i }))
      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument()
      })
    })

    it('navigates to / when Back to login is clicked', async () => {
      render(<ForgotPasswordPage />)
      await userEvent.click(screen.getByRole('button', { name: /back to login/i }))
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  // 2. Step 2 — OTP
  describe('Step 2 - OTP', () => {
    beforeEach(() => {
      mockResetPasswordAction.mockResolvedValue({ data: true, errors: null })
    })

    it('shows which email the code was sent to', async () => {
      await getToOtpStep('someone@example.com')
      expect(screen.getByText(/enter the code sent to someone@example.com/i)).toBeInTheDocument()
    })

    it('renders 6 OTP boxes', async () => {
      await getToOtpStep()
      for (let i = 0; i < 6; i++) {
        expect(screen.getByTestId(`otp-box-${i}`)).toBeInTheDocument()
      }
    })

    it('advances to the password step on a valid code', async () => {
      mockApiClientPost.mockResolvedValueOnce({ data: {} })
      await getToOtpStep()
      await userEvent.type(screen.getByTestId('otp-box-0'), VALID_OTP)
      await userEvent.click(screen.getByRole('button', { name: /verify code/i }))
      await waitFor(() => {
        expect(screen.getByText(/choose a new password/i)).toBeInTheDocument()
      })
      expect(mockApiClientPost).toHaveBeenCalledWith('/auth/verify-otp', expect.objectContaining({ otp: VALID_OTP }))
    })

    it('shows a server error for an invalid/expired code', async () => {
      mockApiClientPost.mockRejectedValueOnce(new Error('Invalid or expired code'))
      await getToOtpStep()
      await userEvent.type(screen.getByTestId('otp-box-0'), VALID_OTP)
      await userEvent.click(screen.getByRole('button', { name: /verify code/i }))
      await waitFor(() => {
        expect(screen.getByText(/invalid or expired code/i)).toBeInTheDocument()
      })
    })

    it('returns to the email step via "Use a different email"', async () => {
      await getToOtpStep()
      await userEvent.click(screen.getByRole('button', { name: /use a different email/i }))
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
    })

    it('does not render an inline validation message while typing an incomplete code', async () => {
      await getToOtpStep()
      await userEvent.type(screen.getByTestId('otp-box-0'), '1')
      expect(screen.queryByText(/enter the 6-digit code/i)).not.toBeInTheDocument()
    })

    describe('Resend Code', () => {
      // `delay: null` makes userEvent resolve its interactions without any
      // internal real/fake-timer-based waiting, so it doesn't fight with
      // jest's fake timers below (which are only there to fast-forward the
      // countdown itself, not to drive userEvent).
      const user = userEvent.setup({ delay: null })

      beforeEach(() => {
        jest.useFakeTimers()
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it('shows a 30s cooldown instead of an active Resend button right after the code is sent', async () => {
        await getToOtpStep(undefined, user)
        expect(screen.getByText(/resend in 30s/i)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /resend code/i })).not.toBeInTheDocument()
      })

      it('counts the cooldown down and enables Resend Code once it reaches 0', async () => {
        await getToOtpStep(undefined, user)

        // The countdown re-schedules its own next setTimeout from a
        // useEffect keyed on the current count, so each second needs its
        // own render/effect cycle — advance one tick at a time rather than
        // jumping the fake clock forward in one big step.
        for (let i = 0; i < 29; i++) {
          act(() => { jest.advanceTimersByTime(1000) })
        }
        expect(screen.getByText(/resend in 1s/i)).toBeInTheDocument()

        act(() => { jest.advanceTimersByTime(1000) })
        expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument()
      })

      it('resends the code and restarts the cooldown when clicked', async () => {
        mockResetPasswordAction.mockResolvedValue({ data: true, errors: null })
        await getToOtpStep(undefined, user)

        for (let i = 0; i < 30; i++) {
          act(() => { jest.advanceTimersByTime(1000) })
        }
        const resendButton = screen.getByRole('button', { name: /resend code/i })

        await user.click(resendButton)

        // The click handler's own async body (the resetPasswordAction call)
        // keeps running after userEvent's click promise resolves — wait for
        // its result to land rather than asserting immediately.
        await waitFor(() => {
          expect(screen.getByText(/resend in 30s/i)).toBeInTheDocument()
        })
        expect(mockResetPasswordAction).toHaveBeenCalledTimes(2) // initial send + resend
      })
    })
  })

  // 3. Step 3 — new password
  describe('Step 3 - new password', () => {
    it('shows password validation errors', async () => {
      await getToPasswordStep()
      await userEvent.type(screen.getByLabelText('New Password'), 'short')
      await userEvent.tab()
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
    })

    it('shows an error when the passwords do not match', async () => {
      await getToPasswordStep()
      await userEvent.type(screen.getByLabelText('New Password'), 'Password@1')
      await userEvent.type(screen.getByLabelText('Confirm Password'), 'Password@2')
      await userEvent.tab()
      await waitFor(() => {
        expect(screen.getByText(/passwords must match/i)).toBeInTheDocument()
      })
    })

    it('toggles password visibility', async () => {
      await getToPasswordStep()
      const passwordInput = screen.getByLabelText('New Password')
      expect(passwordInput).toHaveAttribute('type', 'password')
      await userEvent.click(screen.getByRole('button', { name: /show password/i }))
      expect(passwordInput).toHaveAttribute('type', 'text')
    })

    it('advances to the done step on success', async () => {
      mockApiClientPost.mockResolvedValueOnce({ data: {} }) // confirm-password
      await getToPasswordStep()
      await userEvent.type(screen.getByLabelText('New Password'), 'Password@1')
      await userEvent.type(screen.getByLabelText('Confirm Password'), 'Password@1')
      await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
      await waitFor(() => {
        expect(screen.getByText(/password has been reset successfully/i)).toBeInTheDocument()
      })
    })
  })

  // 4. Step 4 — done
  describe('Step 4 - done', () => {
    it('navigates to / when Back to login is clicked', async () => {
      mockApiClientPost.mockResolvedValueOnce({ data: {} })
      await getToPasswordStep()
      await userEvent.type(screen.getByLabelText('New Password'), 'Password@1')
      await userEvent.type(screen.getByLabelText('Confirm Password'), 'Password@1')
      await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
      await screen.findByText(/password has been reset successfully/i)

      await userEvent.click(screen.getByRole('button', { name: /back to login/i }))
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})
