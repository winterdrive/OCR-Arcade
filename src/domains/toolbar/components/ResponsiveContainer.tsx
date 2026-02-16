import React, { useState, useEffect } from 'react';
import type { ResponsiveContainerProps, Breakpoint } from './types';

// Breakpoint constants for desktop/tablet/mobile modes
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1024
} as const;

/**
 * Determines the current breakpoint based on viewport width
 */
export const getCurrentBreakpoint = (width: number): Breakpoint => {
  if (width < BREAKPOINTS.mobile) {
    return 'mobile';
  } else if (width < BREAKPOINTS.tablet) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};

/**
 * Hook for viewport width detection and responsive state management
 */
export const useViewportWidth = () => {
  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024; // Default to desktop width for SSR
  });

  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>(() => {
    return getCurrentBreakpoint(viewportWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setViewportWidth(width);
      setCurrentBreakpoint(getCurrentBreakpoint(width));
    };

    // Set initial values
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    viewportWidth,
    currentBreakpoint,
    isDesktop: currentBreakpoint === 'desktop',
    isTablet: currentBreakpoint === 'tablet',
    isMobile: currentBreakpoint === 'mobile'
  };
};

/**
 * ResponsiveContainer - Container component for responsive layout management
 * with viewport width detection and responsive state management
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  breakpoint,
  fallback
}) => {
  const { currentBreakpoint } = useViewportWidth();

  // Show children only if current breakpoint matches the specified breakpoint
  const shouldShowChildren = currentBreakpoint === breakpoint;

  return (
    <div
      className={`responsive-container ${breakpoint} ${currentBreakpoint === breakpoint ? 'active' : 'inactive'}`}
      data-testid={`responsive-container-${breakpoint}`}
      data-current-breakpoint={currentBreakpoint}
    >
      {shouldShowChildren ? children : fallback}
    </div>
  );
};