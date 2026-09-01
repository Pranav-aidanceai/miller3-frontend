import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '@/app/LoginForm'

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

describe('LoginForm', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    // 1. Rendering
    it('renders email and password fields', () => {
        render(<LoginForm />)
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('renders the Sign In button', () => {
        render(<LoginForm />)
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('renders forgot password link', () => {
        render(<LoginForm />)
        expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    })

    it('shows validation errors when fields are touched and empty', async () => {
        render(<LoginForm />)

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
        render(<LoginForm />)
        await userEvent.type(screen.getByLabelText(/email/i), 'notanemail')
        fireEvent.blur(screen.getByLabelText(/email/i))
        await waitFor(() => {
            expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument()
        })
    })

    // 3. Password toggle
    it('toggles password visibility', async () => {
        render(<LoginForm />)
        const passwordInput = screen.getByLabelText('Password')
        expect(passwordInput).toHaveAttribute('type', 'password')

        const toggleBtn = screen.getByRole('button', { name: /show password/i }) // eye icon button
        await userEvent.click(toggleBtn)
        expect(passwordInput).toHaveAttribute('type', 'text')
    })

    // 4. Successful login
    it('redirects to /search on successful login', async () => {
        mockLoginAction.mockResolvedValue({
            data: { token: 'abc123', user: { id: 1 } },
            errors: null,
        })

        render(<LoginForm />)
        await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
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

        render(<LoginForm />)
        await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword')
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
        })
    })

    // 6. Account-state errors
    it('shows the Approval Pending screen for an ACCOUNT_PENDING error', async () => {
        mockLoginAction.mockResolvedValue({
            data: null,
            errors: [{ code: 'ACCOUNT_PENDING', message: 'Your account is pending admin approval.', field: 'email' }],
        })

        render(<LoginForm />)
        await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

        await waitFor(() => {
            expect(screen.getByText(/approval pending/i)).toBeInTheDocument()
        })
    })

    // 7. Loading state
    it('shows Signing In... while loading', async () => {
        mockLoginAction.mockImplementation(() => new Promise(() => { })) // never resolves

        render(<LoginForm />)
        await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

        await waitFor(() => {
            expect(screen.getByText(/signing in/i)).toBeInTheDocument()
        })
    })
})