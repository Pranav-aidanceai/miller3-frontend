import { useEffect, useState } from 'react';
import { Driver, driver, DriveStep } from 'driver.js';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setOnboardingSeen } from '@/store/slices/authSlice';
import 'driver.js/dist/driver.css';
import { onboardingAction } from '@/app/auth/authServices';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function useOnboarding() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const has_seen_onboarding = useAppSelector(state => state.auth.has_seen_onboarding);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOnboardingComplete = async () => {
    const { errors, data } = await onboardingAction();
    if (errors || !data) {
      toast.error(errors?.[0].message || 'Logout failed', {
        duration: 5000,
        position: 'bottom-right',
        className: '!bg-destructive !text-white !border-destructive',
      });
      return;
    }
    if (data.has_seen_onboarding) {
      dispatch(setOnboardingSeen());
    }
  }

  const steps = [
    {
      element: '[data-tour="sidebar"]',
      popover: {
        title: '📍 Navigation',
        description: 'Use the sidebar to navigate between different sections of the app. Click the arrow to collapse/expand it.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="credits"]',
      popover: {
        title: '💳 Credit Balance',
        description: 'Monitor your remaining search, AI search and enrichment credits here. Each query/enrichment consumes credits based on your plan.',
        side: 'bottom',
        align: 'end',
      },
    },
    // {
    //   element: '[data-tour="theme-toggle"]',
    //   popover: {
    //     title: '🌙 Theme Toggle',
    //     description: 'Switch between light and dark mode. Your preference is saved automatically.',
    //     side: 'bottom',
    //     align: 'end',
    //   },
    // },
    {
      element: '[data-tour="filters-section"]',
      popover: {
        title: '🔍 Filters',
        description: 'Refine your search results using these filters. Apply changes to update the results.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="location-filter"]',
      popover: {
        title: '📍 Location Filters',
        description: 'Filter companies by city, county, and state.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="industry-filter"]',
      popover: {
        title: '🏭 Industry Filters',
        description: 'Search by NAICS/SIC codes and year founded.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="size-filter"]',
      popover: {
        title: '📊 Company Size',
        description: 'Filter by employee count and annual revenue.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="demographics-filter"]',
      popover: {
        title: '👥 Demographics',
        description: 'Filter for minority-owned, women-owned, or veteran-owned companies.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="data-quality-filter"]',
      popover: {
        title: '✅ Data Quality',
        description: 'Filter companies that have specific contact information available.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="ai-search-input"]',
      popover: {
        title: '✨ AI Search (Coming Soon)',
        description: 'This feature is coming soon! You\'ll be able to describe what you\'re looking for in plain English, and our AI will generate the perfect query for you. The data shown here is for visual purposes only.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="ai-search-examples"]',
      popover: {
        title: '📝 Example Prompts',
        description: 'These are example queries to show you what will be possible once AI Search is live. Each example demonstrates different types of searches you can perform.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="query-history-list"]',
      popover: {
        title: '📋 Query History (Coming Soon)',
        description: 'This page will show all your previous searches for easy replay and reference. The data displayed here is for visual demonstration purposes only.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '[data-tour="query-replay-button"]',
      popover: {
        title: '🔄 Replay Query',
        description: 'Click the Replay button to run a previous search again with the same filters and parameters.',
        side: 'left',
        align: 'center',
      },
    }
  ] as DriveStep[];

  const startTour = () => {

    if (has_seen_onboarding) {
      return;
    }
    let driverObj: Driver;

    const handleNavigation = async (direction: 'next' | 'prev') => {
      const currentStepIndex = driverObj.getState()?.activeIndex || 0;

      if (direction === 'next' && currentStepIndex === 7) {
        router.push('/ai-search');

        // Wait for element to appear, then move to next step
        let attempts = 0;
        const waitForElement = setInterval(() => {
          if (document.querySelector('[data-tour="ai-search-input"]') || attempts > 20) {
            clearInterval(waitForElement);
            if (attempts <= 20) {
              driverObj.moveNext();
            }
          }
          attempts++;
        }, 200);
      } else if (direction === 'next' && currentStepIndex === 9) {
        router.push('/query-history');

        let attempts = 0;
        const waitForElement = setInterval(() => {
          if (document.querySelector('[data-tour="query-history-list"]') || attempts > 20) {
            clearInterval(waitForElement);
            if (attempts <= 20) {
              driverObj.moveNext();
            }
          }
          attempts++;
        }, 200);
      } else if (direction === 'next') {
        driverObj.moveNext();
      } else if (direction === 'prev') {
        driverObj.movePrevious();
      }
    };

    driverObj = driver({
      allowClose: true,
      overlayOpacity: 0.5,
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: steps,
      onNextClick: () => {
        handleNavigation('next');
      },
      onPrevClick: () => {
        handleNavigation('prev');
      },
      onDestroyed: () => {
        handleOnboardingComplete();
      },
    });

    driverObj.drive();
  };

  return {
    showOnboarding: mounted && !has_seen_onboarding,
    startTour
  };
}