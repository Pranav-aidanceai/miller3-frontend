import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OnboardingPage from '@/app/auth/register/Onboarding'

// ── Mocks ────────────────────────────────────────────────────────────────────

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
// OnboardingPage is now just the "Choose Your Plan" screen (welcome/approval/
// ready steps were removed) plus the Plan Payment popup shown on success.

const defaultProps = {
  onTierSelect: jest.fn(),
  onSubmit: jest.fn(),
  loading: false,
  successPlanLabel: null as string | null,
  onClosePaymentPopup: jest.fn(),
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OnboardingPage', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // 1. Choose Your Plan
  // Each plan card owns its own "Start X Plan" button — clicking it selects
  // that tier AND submits in one action (no separate shared Continue
  // button), per the Figma "Select Plan" reference.
  describe('Choose Your Plan', () => {
    it('renders the Choose Your Plan heading', () => {
      render(<OnboardingPage {...defaultProps} />)
      expect(screen.getByText(/choose your plan/i)).toBeInTheDocument()
    })

    it('renders all tier plans from constants', () => {
      render(<OnboardingPage {...defaultProps} />)
      expect(screen.getByText('Free Plan')).toBeInTheDocument()
      expect(screen.getByText('Pro Plan')).toBeInTheDocument()
      expect(screen.getByText('$0/month')).toBeInTheDocument()
      expect(screen.getByText('$99/month')).toBeInTheDocument()
    })

    it('renders tier descriptions', () => {
      render(<OnboardingPage {...defaultProps} />)
      expect(screen.getByText('Feature one')).toBeInTheDocument()
      expect(screen.getByText('Pro feature one')).toBeInTheDocument()
    })

    it('renders a Start-plan button per tier', () => {
      render(<OnboardingPage {...defaultProps} />)
      expect(screen.getByRole('button', { name: /start free plan/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /start pro plan/i })).toBeInTheDocument()
    })

    it('selects and submits a plan when its Start button is clicked', async () => {
      const onTierSelect = jest.fn()
      const onSubmit = jest.fn()
      render(<OnboardingPage {...defaultProps} onTierSelect={onTierSelect} onSubmit={onSubmit} />)
      await userEvent.click(screen.getByRole('button', { name: /start pro plan/i }))
      expect(onTierSelect).toHaveBeenCalledWith('Pro')
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('waits for onTierSelect to resolve before calling onSubmit', async () => {
      const order: string[] = []
      const onTierSelect = jest.fn(async () => { order.push('select'); await Promise.resolve() })
      const onSubmit = jest.fn(() => order.push('submit'))
      render(<OnboardingPage {...defaultProps} onTierSelect={onTierSelect} onSubmit={onSubmit} />)
      await userEvent.click(screen.getByRole('button', { name: /start free plan/i }))
      expect(order).toEqual(['select', 'submit'])
    })

    it('disables every plan button while loading, with no spinner if nothing was clicked yet', () => {
      render(<OnboardingPage {...defaultProps} loading={true} />)
      expect(screen.getByRole('button', { name: /start free plan/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /start pro plan/i })).toBeDisabled()
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    })

    it('shows a spinner only on the clicked plan once loading starts', async () => {
      const onTierSelect = jest.fn()
      const onSubmit = jest.fn()
      const { rerender } = render(
        <OnboardingPage {...defaultProps} onTierSelect={onTierSelect} onSubmit={onSubmit} loading={false} />
      )
      await userEvent.click(screen.getByRole('button', { name: /start pro plan/i }))
      rerender(<OnboardingPage {...defaultProps} onTierSelect={onTierSelect} onSubmit={onSubmit} loading={true} />)

      // The clicked (Pro) button now shows only a spinner, no text.
      const freeButton = screen.getByRole('button', { name: /start free plan/i })
      expect(freeButton).toBeDisabled()
      expect(freeButton.querySelector('.animate-spin')).not.toBeInTheDocument()

      const spinningButtons = document.querySelectorAll('.animate-spin')
      expect(spinningButtons).toHaveLength(1)
    })
  })

  // 2. Plan Payment popup
  describe('Plan Payment popup', () => {
    it('is not shown when successPlanLabel is null', () => {
      render(<OnboardingPage {...defaultProps} successPlanLabel={null} />)
      expect(screen.queryByText(/plan payment/i)).not.toBeInTheDocument()
    })

    it('shows the plan name once successPlanLabel is set', () => {
      render(<OnboardingPage {...defaultProps} successPlanLabel="Premium Plan" />)
      expect(screen.getByText(/plan payment/i)).toBeInTheDocument()
      expect(screen.getByText(/premium plan/i)).toBeInTheDocument()
      expect(screen.getByText(/payment link/i)).toBeInTheDocument()
    })

    it('calls onClosePaymentPopup when the footer Close button is clicked', async () => {
      const onClosePaymentPopup = jest.fn()
      render(<OnboardingPage {...defaultProps} successPlanLabel="Premium Plan" onClosePaymentPopup={onClosePaymentPopup} />)
      // Both the dialog's built-in header "X" and the footer button render
      // with the accessible name "Close" (the X's label is screen-reader-only
      // text) — the footer one is the last in DOM order.
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      await userEvent.click(closeButtons[closeButtons.length - 1])
      expect(onClosePaymentPopup).toHaveBeenCalledTimes(1)
    })
  })
})
