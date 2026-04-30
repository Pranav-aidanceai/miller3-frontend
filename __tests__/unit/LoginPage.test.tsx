import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/page'

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

jest.mock('@/store/hooks', () => ({
    useAppDispatch: () => jest.fn(),
}))

jest.mock('@/store/slices/authSlice', () => ({
    setCredentials: jest.fn(),
}))

jest.mock('@/app/auth/authServices', () => ({
    loginAction: jest.fn(),
}))

// import AFTER mock so we get the mocked version
import { loginAction } from '@/app/auth/authServices'
import React from 'react'
const mockLoginAction = loginAction as jest.Mock

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    // 1. Rendering
    it('renders email and password fields', () => {
        render(<LoginPage />)
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('renders the Sign In button', () => {
        render(<LoginPage />)
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('renders forgot password link', () => {
        render(<LoginPage />)
        expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    })

    it('shows validation errors when fields are touched and empty', async () => {
        render(<LoginPage />)

        // click into and out of email field without typing
        await userEvent.click(screen.getByLabelText(/email/i))
        await userEvent.tab() // moves focus to next field, triggers blur on email

        // moves focus away from password, triggers blur on password
        await userEvent.tab()

        await waitFor(() => {
            expect(screen.getByText(/Email is required/i)).toBeInTheDocument()
            expect(screen.getByText(/Password is required/i)).toBeInTheDocument()
        })
    })

    it('shows invalid email error for bad email format', async () => {
        render(<LoginPage />)
        await userEvent.type(screen.getByLabelText(/email/i), 'notanemail')
        fireEvent.blur(screen.getByLabelText(/email/i))
        await waitFor(() => {
            expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument()
        })
    })

    // 3. Password toggle
    it('toggles password visibility', async () => {
        render(<LoginPage />)
        const passwordInput = screen.getByLabelText(/password/i)
        expect(passwordInput).toHaveAttribute('type', 'password')

        const toggleBtn = screen.getByRole('button', { name: '' }) // eye icon button
        await userEvent.click(toggleBtn)
        expect(passwordInput).toHaveAttribute('type', 'text')
    })

    // 4. Successful login
    it('redirects to /search on successful login', async () => {
        mockLoginAction.mockResolvedValue({
            data: { token: 'abc123', user: { id: 1 } },
            errors: null,
        })

        render(<LoginPage />)
        await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
        await userEvent.type(screen.getByLabelText(/password/i), 'password123')
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/search')
        })
    })

    // 5. Failed login - server error
    it('shows server error message on failed login', async () => {
        mockLoginAction.mockResolvedValue({
            data: null,
            errors: [{ message: 'Invalid credentials' }],
        })

        render(<LoginPage />)
        await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
        await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword')
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
        })
    })

    // 6. Loading state
    it('shows Signing In... while loading', async () => {
        mockLoginAction.mockImplementation(() => new Promise(() => { })) // never resolves

        render(<LoginPage />)
        await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
        await userEvent.type(screen.getByLabelText(/password/i), 'password123')
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

        await waitFor(() => {
            expect(screen.getByText(/signing in/i)).toBeInTheDocument()
        })
    })
})