import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPage from '@/app/auth/register/page' // ← adjust path to your file

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

jest.mock('@/lib/constants', () => ({
  tiers: [],
}))

jest.mock('@/app/auth/authServices', () => ({
  registerAction: jest.fn(),
}))

// Clicking the Terms checkbox opens TermsOfUse.tsx's modal rather than
// toggling the field directly; that modal fetches the agreement text via
// apiClient. Mock it so the fetch resolves instantly instead of attempting
// a real network call from jsdom.
jest.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn().mockResolvedValue({ data: { data: 'Terms of use text.' } }) },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// fills the form with valid values, including accepting the Terms of Use
// via its modal (the checkbox itself only opens that modal — see
// TermsOfUse.tsx — the field is set by its "I accept" button).
const fillForm = async (overrides: Record<string, string> = {}) => {
  const values = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Password@1',
    confirm: 'Password@1',
    ...overrides,
  }
  await userEvent.type(screen.getByPlaceholderText(/enter your name/i), values.name)
  await userEvent.type(screen.getByPlaceholderText(/enter your email/i), values.email)
  await userEvent.type(screen.getByPlaceholderText(/enter your password/i), values.password)
  await userEvent.type(screen.getByPlaceholderText(/confirm your password/i), values.confirm)
  await userEvent.click(screen.getByRole('checkbox'))
  const acceptButton = await screen.findByRole('button', { name: /i accept/i })
  await waitFor(() => expect(acceptButton).not.toBeDisabled())
  await userEvent.click(acceptButton)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RegisterPage', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // 1. Rendering
  it('renders all form fields', () => {
    render(<RegisterPage />)
    expect(screen.getByPlaceholderText(/enter your name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('renders the Continue button as disabled initially', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('renders Sign in link', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  // 2. Validation - required fields
  it('shows required errors when fields are touched and empty', async () => {
    render(<RegisterPage />)

    await userEvent.click(screen.getByPlaceholderText(/enter your name/i))
    await userEvent.tab()
    await userEvent.click(screen.getByPlaceholderText(/enter your email/i))
    await userEvent.tab()
    await userEvent.click(screen.getByPlaceholderText(/enter your password/i))
    await userEvent.tab()
    await userEvent.click(screen.getByPlaceholderText(/confirm your password/i))
    await userEvent.tab()

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('shows error for name less than 2 characters', async () => {
    render(<RegisterPage />)
    await userEvent.type(screen.getByPlaceholderText(/enter your name/i), 'J')
    await userEvent.tab()
    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
    })
  })

  it('shows invalid email error for bad email format', async () => {
    render(<RegisterPage />)
    await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'notanemail')
    await userEvent.tab()
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('shows error for password less than 8 characters', async () => {
    render(<RegisterPage />)
    await userEvent.type(screen.getByPlaceholderText(/enter your password/i), 'Ab@1')
    await userEvent.tab()
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('shows error when passwords do not match', async () => {
    render(<RegisterPage />)
    await userEvent.type(screen.getByPlaceholderText(/enter your password/i), 'Password@1')
    await userEvent.type(screen.getByPlaceholderText(/confirm your password/i), 'Password@2')
    await userEvent.tab()
    await waitFor(() => {
      expect(screen.getByText(/passwords must match/i)).toBeInTheDocument()
    })
  })

  // 3. Password toggle
  it('toggles password visibility', async () => {
    render(<RegisterPage />)
    const passwordInput = screen.getByPlaceholderText(/enter your password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: /show password/i })) // eye icon button
    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  // 4. Checkbox
  it('enables Continue button when form is fully valid', async () => {
    render(<RegisterPage />)
    await fillForm()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
    })
  })

  // 5. Shows checkmark when passwords match
  it('shows checkmark icon when passwords match', async () => {
    render(<RegisterPage />)
    await userEvent.type(screen.getByPlaceholderText(/enter your password/i), 'Password@1')
    await userEvent.type(screen.getByPlaceholderText(/confirm your password/i), 'Password@1')
    await waitFor(() => {
      // lucide Check icon appears when passwords match
      expect(document.querySelector('.lucide-check')).toBeInTheDocument()
    })
  })

  // 6. Form submission moves to onboarding
  it('shows onboarding page after valid form submission', async () => {
    render(<RegisterPage />)
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => {
      // OnboardingPage renders when onboarding state is true
      // tiers is mocked as [] so we just check the register form is gone
      expect(screen.queryByPlaceholderText(/enter your name/i)).not.toBeInTheDocument()
    })
  })

})