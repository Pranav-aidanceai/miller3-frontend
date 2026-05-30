import { useEffect, useState } from 'react';
// import { useTheme } from 'next-themes';
import { driver } from 'driver.js';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setOnboardingSeen } from '@/store/slices/authSlice';
import 'driver.js/dist/driver.css';

export function useOnboarding() {
  const dispatch = useAppDispatch();
  // const { theme } = useTheme();
  const has_seen_onboarding = useAppSelector(state => state.auth.has_seen_onboarding);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const startTour = () => {
    // Determine background color based on theme
    // const bgColor = theme === 'dark' ? '#09090b' : '#ffffff';
    // const overlayColor = theme === 'dark' ? '#000000' : '#ffffff';

    const driverObj = driver({
      allowClose: true,
      overlayOpacity: 0.5,
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: [
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
            description: 'Monitor your remaining search credits here. Each search query consumes credits based on your plan.',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '[data-tour="theme-toggle"]',
          popover: {
            title: '🌙 Theme Toggle',
            description: 'Switch between light and dark mode. Your preference is saved automatically.',
            side: 'bottom',
            align: 'end',
          },
        },
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
      ],
      onDeselected: () => {
        console.log("tour closed")
        dispatch(setOnboardingSeen());
      },
      onDestroyed: () => {
        console.log("tour destroyed")
        dispatch(setOnboardingSeen());
      },
    });

    driverObj.drive();
  };

  return { 
    showOnboarding: mounted && !has_seen_onboarding, 
    startTour 
  };
}