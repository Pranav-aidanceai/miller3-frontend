import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgotPasswordPage from '@/app/auth/forgot-password/page' // ← adjust path

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return React.createElement('a', { href }, children)
  },
}))

jest.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}))

jest.mock('@/app/auth/authServices', () => ({
  resetPasswordAction: jest.fn(),
}))

import { resetPasswordAction } from '@/app/auth/authServices'
const mockResetPasswordAction = resetPasswordAction as jest.Mock

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ForgotPasswordPage', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // 1. Rendering
  describe('Rendering', () => {
    it('renders the email input', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
    })

    it('renders Send Reset Link button', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
    })

    it('renders Back to login button', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument()
    })

    it('renders the Reset your password heading', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByText(/reset your password/i)).toBeInTheDocument()
    })

    it('Send Reset Link button is disabled initially', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeDisabled()
    })
  })

  // 2. Validation
  describe('Validation', () => {
    it('shows email required error when field is touched and empty', async () => {
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

    it('enables Send Reset Link button when valid email is entered', async () => {
      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send reset link/i })).not.toBeDisabled()
      })
    })
  })

  // 3. Successful submission
  describe('Successful submission', () => {
    it('shows success message after valid submission', async () => {
      mockResetPasswordAction.mockResolvedValue({ data: true, errors: null })

      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText(/you will receive a reset link/i)).toBeInTheDocument()
      })
    })

    it('shows the submitted email in the success message', async () => {
      mockResetPasswordAction.mockResolvedValue({ data: true, errors: null })

      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText(/user@example.com/i)).toBeInTheDocument()
      })
    })

    it('shows Back to login link in success state', async () => {
      mockResetPasswordAction.mockResolvedValue({ data: true, errors: null })

      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument()
      })
    })
  })

  // 4. Failed submission
  describe('Failed submission', () => {
    it('shows server error message on failure', async () => {
      mockResetPasswordAction.mockResolvedValue({
        data: null,
        errors: [{ message: 'No account found with this email' }],
      })

      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText(/no account found with this email/i)).toBeInTheDocument()
      })
    })

    it('does not show success message on failure', async () => {
      mockResetPasswordAction.mockResolvedValue({
        data: null,
        errors: [{ message: 'Something went wrong' }],
      })

      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.queryByText(/you will receive a reset link/i)).not.toBeInTheDocument()
      })
    })
  })

  // 5. Loading state
  describe('Loading state', () => {
    it('shows Sending... while request is in progress', async () => {
      mockResetPasswordAction.mockImplementation(() => new Promise(() => {})) // never resolves

      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText(/sending.../i)).toBeInTheDocument()
      })
    })

    it('disables Send Reset Link button while loading', async () => {
      mockResetPasswordAction.mockImplementation(() => new Promise(() => {}))

      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()
      })
    })

    it('disables Back to login button while loading', async () => {
      mockResetPasswordAction.mockImplementation(() => new Promise(() => {}))

      render(<ForgotPasswordPage />)
      await userEvent.type(screen.getByTestId('email-input'), 'user@example.com')
      await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to login/i })).toBeDisabled()
      })
    })
  })

  // 6. Navigation
  describe('Navigation', () => {
    it('navigates to / when Back to login is clicked', async () => {
      render(<ForgotPasswordPage />)
      await userEvent.click(screen.getByRole('button', { name: /back to login/i }))
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

})