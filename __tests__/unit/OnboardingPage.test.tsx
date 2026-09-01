import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OnboardingPage from '@/app/auth/register/Onboarding' // ← adjust path to your file

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}))

jest.mock('@/lib/constants', () => ({
  tiers: [
    {
      role: 'Free',
      label: 'Free Plan',
      price: '$0/month',
      description: 'Free plan description.',
      desc1: 'Feature one',
      desc2: 'Feature two',
      desc3: 'Feature three',
      highlighted: false,
    },
    {
      role: 'Pro',
      label: 'Pro Plan',
      price: '$99/month',
      description: 'Pro plan description.',
      desc1: 'Pro feature one',
      desc2: 'Pro feature two',
      desc3: 'Pro feature three',
      highlighted: true,
    },
  ],
}))

// ── Default Props ─────────────────────────────────────────────────────────────

const defaultProps = {
  onTierSelect: jest.fn(),
  onSubmit: jest.fn(),
  step: 0,
  setStep: jest.fn(),
  loading: false,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OnboardingPage', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // 1. Step 0 - Welcome
  describe('Step 0 - Welcome', () => {
    it('renders welcome heading', () => {
      render(<OnboardingPage {...defaultProps} step={0} />)
      expect(screen.getByText(/welcome to/i)).toBeInTheDocument()
      expect(screen.getByText(/vendorlens/i)).toBeInTheDocument()
    })

    it('renders get started button', () => {
      render(<OnboardingPage {...defaultProps} step={0} />)
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
    })

    it('calls setStep(1) when Get Started is clicked', async () => {
      const setStep = jest.fn()
      render(<OnboardingPage {...defaultProps} step={0} setStep={setStep} />)
      await userEvent.click(screen.getByRole('button', { name: /get started/i }))
      expect(setStep).toHaveBeenCalledWith(1)
    })

    it('does not render plan selection in step 0', () => {
      render(<OnboardingPage {...defaultProps} step={0} />)
      expect(screen.queryByText(/choose your plan/i)).not.toBeInTheDocument()
    })
  })

  // 2. Step 1 - Choose Plan
  // Each plan card owns its own "Start X Plan" button — clicking it selects
  // that tier AND submits in one action (no separate shared Continue
  // button), per the Figma "Select Plan" reference.
  describe('Step 1 - Choose Plan', () => {
    it('renders Choose Your Plan heading', () => {
      render(<OnboardingPage {...defaultProps} step={1} />)
      expect(screen.getByText(/choose your plan/i)).toBeInTheDocument()
    })

    it('renders all tier plans from constants', () => {
      render(<OnboardingPage {...defaultProps} step={1} />)
      expect(screen.getByText('Free Plan')).toBeInTheDocument()
      expect(screen.getByText('Pro Plan')).toBeInTheDocument()
      expect(screen.getByText('$0/month')).toBeInTheDocument()
      expect(screen.getByText('$99/month')).toBeInTheDocument()
    })

    it('renders tier descriptions', () => {
      render(<OnboardingPage {...defaultProps} step={1} />)
      expect(screen.getByText('Feature one')).toBeInTheDocument()
      expect(screen.getByText('Pro feature one')).toBeInTheDocument()
    })

    it('renders a Start-plan button per tier', () => {
      render(<OnboardingPage {...defaultProps} step={1} />)
      expect(screen.getByRole('button', { name: /start free plan/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /start pro plan/i })).toBeInTheDocument()
    })

    it('selects and submits a plan when its Start button is clicked', async () => {
      const onTierSelect = jest.fn()
      const onSubmit = jest.fn()
      render(<OnboardingPage {...defaultProps} step={1} onTierSelect={onTierSelect} onSubmit={onSubmit} />)
      await userEvent.click(screen.getByRole('button', { name: /start pro plan/i }))
      expect(onTierSelect).toHaveBeenCalledWith('Pro')
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('waits for onTierSelect to resolve before calling onSubmit', async () => {
      const order: string[] = []
      const onTierSelect = jest.fn(async () => { order.push('select'); await Promise.resolve() })
      const onSubmit = jest.fn(() => order.push('submit'))
      render(<OnboardingPage {...defaultProps} step={1} onTierSelect={onTierSelect} onSubmit={onSubmit} />)
      await userEvent.click(screen.getByRole('button', { name: /start free plan/i }))
      expect(order).toEqual(['select', 'submit'])
    })

    it('disables every plan button while loading, with no spinner if nothing was clicked yet', () => {
      render(<OnboardingPage {...defaultProps} step={1} loading={true} />)
      expect(screen.getByRole('button', { name: /start free plan/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /start pro plan/i })).toBeDisabled()
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    })

    it('shows a spinner only on the clicked plan once loading starts', async () => {
      const onTierSelect = jest.fn()
      const onSubmit = jest.fn()
      const { rerender } = render(
        <OnboardingPage {...defaultProps} step={1} onTierSelect={onTierSelect} onSubmit={onSubmit} loading={false} />
      )
      await userEvent.click(screen.getByRole('button', { name: /start pro plan/i }))
      rerender(<OnboardingPage {...defaultProps} step={1} onTierSelect={onTierSelect} onSubmit={onSubmit} loading={true} />)

      // The clicked (Pro) button now shows only a spinner, no text.
      const freeButton = screen.getByRole('button', { name: /start free plan/i })
      expect(freeButton).toBeDisabled()
      expect(freeButton.querySelector('.animate-spin')).not.toBeInTheDocument()

      const spinningButtons = document.querySelectorAll('.animate-spin')
      expect(spinningButtons).toHaveLength(1)
    })
  })

  // 3. Step 2 - Approval Pending
  // (Shown when the backend returns APPROVAL_PENDING for the chosen tier —
  // see registerAction's status check in src/app/auth/register/page.tsx —
  // rather than every registration reaching "ready" directly.)
  describe('Step 2 - Approval Pending', () => {
    it('renders approval pending heading', () => {
      render(<OnboardingPage {...defaultProps} step={2} />)
      expect(screen.getByText(/approval pending/i)).toBeInTheDocument()
    })

    it('renders Back to Login button', () => {
      render(<OnboardingPage {...defaultProps} step={2} />)
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument()
    })

    it('redirects to / when Back to Login is clicked', async () => {
      render(<OnboardingPage {...defaultProps} step={2} />)
      await userEvent.click(screen.getByRole('button', { name: /back to login/i }))
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  // 4. Step 3 - Ready
  describe('Step 3 - Ready', () => {
    it('renders ready heading', () => {
      render(<OnboardingPage {...defaultProps} step={3} />)
      expect(screen.getByText(/you're ready/i)).toBeInTheDocument()
    })

    it('renders start searching message', () => {
      render(<OnboardingPage {...defaultProps} step={3} />)
      expect(screen.getByText(/start searching for vendors/i)).toBeInTheDocument()
    })

    it('renders Login to Start Searching button', () => {
      render(<OnboardingPage {...defaultProps} step={3} />)
      expect(screen.getByRole('button', { name: /login to start searching/i })).toBeInTheDocument()
    })

    it('redirects to / when Login to Start Searching is clicked', async () => {
      render(<OnboardingPage {...defaultProps} step={3} />)
      await userEvent.click(screen.getByRole('button', { name: /login to start searching/i }))
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  // 5. Progress dots
  describe('Progress dots', () => {
    it('renders one dot per step (welcome, plan, approval, ready)', () => {
      render(<OnboardingPage {...defaultProps} step={0} />)
      const dots = document.querySelectorAll('.rounded-full')
      // 4 progress dots (steps 0-3) + 1 welcome icon circle
      expect(dots.length).toBeGreaterThanOrEqual(4)
    })
  })

})