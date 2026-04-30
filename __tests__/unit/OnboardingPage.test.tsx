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
      label: 'Free',
      icon: () => null,
      active: 'border-primary',
      color: 'border-border',
      desc1: 'Feature one',
      desc2: 'Feature two',
      desc3: 'Feature three',
    },
    {
      role: 'Pro',
      label: 'Pro',
      icon: () => null,
      active: 'border-primary',
      color: 'border-border',
      desc1: 'Pro feature one',
      desc2: 'Pro feature two',
      desc3: 'Pro feature three',
    },
  ],
}))

// ── Default Props ─────────────────────────────────────────────────────────────

const defaultProps = {
  onTierSelect: jest.fn(),
  selectedTier: 'Free',
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
      expect(screen.getByText(/miller3/i)).toBeInTheDocument()
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
  describe('Step 1 - Choose Plan', () => {
    it('renders Choose Your Plan heading', () => {
      render(<OnboardingPage {...defaultProps} step={1} />)
      expect(screen.getByText(/choose your plan/i)).toBeInTheDocument()
    })

    it('renders all tiers from constants', () => {
      render(<OnboardingPage {...defaultProps} step={1} />)
      expect(screen.getByText('Free')).toBeInTheDocument()
      expect(screen.getByText('Pro')).toBeInTheDocument()
    })

    it('renders tier descriptions', () => {
      render(<OnboardingPage {...defaultProps} step={1} />)
      expect(screen.getByText('Feature one')).toBeInTheDocument()
      expect(screen.getByText('Pro feature one')).toBeInTheDocument()
    })

    it('calls onTierSelect when a tier is clicked', async () => {
      const onTierSelect = jest.fn()
      render(<OnboardingPage {...defaultProps} step={1} onTierSelect={onTierSelect} />)
      await userEvent.click(screen.getByText('Pro'))
      expect(onTierSelect).toHaveBeenCalledWith('Pro')
    })

    it('renders Continue button', () => {
      render(<OnboardingPage {...defaultProps} step={1} />)
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })

    it('calls onSubmit when Continue is clicked', async () => {
      const onSubmit = jest.fn()
      render(<OnboardingPage {...defaultProps} step={1} onSubmit={onSubmit} />)
      await userEvent.click(screen.getByRole('button', { name: /continue/i }))
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('disables Continue button when loading is true', () => {
      render(<OnboardingPage {...defaultProps} step={1} loading={true} />)
      expect(screen.getByRole('button', { name: '' })).toBeDisabled() // spinner shown, no text
    })

    it('shows spinner when loading is true', () => {
      render(<OnboardingPage {...defaultProps} step={1} loading={true} />)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  // 3. Step 2 - Ready
  describe('Step 2 - Ready', () => {
    it('renders ready heading', () => {
      render(<OnboardingPage {...defaultProps} step={2} />)
      expect(screen.getByText(/you're ready/i)).toBeInTheDocument()
    })

    it('renders start searching message', () => {
      render(<OnboardingPage {...defaultProps} step={2} />)
      expect(screen.getByText(/start searching for vendors/i)).toBeInTheDocument()
    })

    it('renders Login to Start Searching button', () => {
      render(<OnboardingPage {...defaultProps} step={2} />)
      expect(screen.getByRole('button', { name: /login to start searching/i })).toBeInTheDocument()
    })

    it('redirects to / when Login to Start Searching is clicked', async () => {
      render(<OnboardingPage {...defaultProps} step={2} />)
      await userEvent.click(screen.getByRole('button', { name: /login to start searching/i }))
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  // 4. Progress dots
  describe('Progress dots', () => {
    it('renders 3 progress dots', () => {
      render(<OnboardingPage {...defaultProps} step={0} />)
      const dots = document.querySelectorAll('.rounded-full')
      // 3 progress dots + 1 welcome icon circle
      expect(dots.length).toBeGreaterThanOrEqual(3)
    })
  })

})