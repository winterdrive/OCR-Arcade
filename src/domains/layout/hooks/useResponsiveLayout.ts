import { useEffect } from 'react'
import { useStore } from '@/shared/store/useStore'
import { responsiveLayoutManager, ScreenSize } from '@/domains/layout/services/ResponsiveLayoutManager'

/**
 * Hook for managing responsive layout behavior
 * Integrates ResponsiveLayoutManager with the app store
 */
export function useResponsiveLayout() {
  const {
    screenSize,
    isSidebarCollapsed,
    isToolbarCompact,
    isSidebarOverlayMode,
    setScreenSize,
    setToolbarCompact,
    setSidebarOverlayMode,
    toggleSidebarOverlay
  } = useStore()

  useEffect(() => {
    // Initialize with current screen size
    const currentSize = responsiveLayoutManager.getCurrentScreenSize()
    setScreenSize(currentSize)

    // Listen for screen size changes
    const cleanup = responsiveLayoutManager.onScreenSizeChange((newSize: ScreenSize) => {
      setScreenSize(newSize)
      responsiveLayoutManager.adjustLayout(newSize)
    })

    // Listen for layout events from ResponsiveLayoutManager
    const handleCollapseSidebar = () => {
      // Handled by store's setScreenSize logic
    }

    const handleExpandSidebar = () => {
      setSidebarOverlayMode(false)
    }

    const handleToggleSidebarOverlay = () => {
      toggleSidebarOverlay()
    }

    const handleAdaptToolbar = (event: CustomEvent) => {
      const { isCompact } = event.detail
      setToolbarCompact(isCompact)
    }

    const handleResizeCanvasArea = () => {
      // Trigger canvas resize - this will be handled by CSS classes
      const event = new CustomEvent('canvas:resize')
      window.dispatchEvent(event)
    }

    // Add event listeners
    window.addEventListener('layout:collapseSidebar', handleCollapseSidebar)
    window.addEventListener('layout:expandSidebar', handleExpandSidebar)
    window.addEventListener('layout:toggleSidebarOverlay', handleToggleSidebarOverlay)
    window.addEventListener('layout:adaptToolbar', handleAdaptToolbar as EventListener)
    window.addEventListener('layout:resizeCanvasArea', handleResizeCanvasArea)

    return () => {
      cleanup()
      window.removeEventListener('layout:collapseSidebar', handleCollapseSidebar)
      window.removeEventListener('layout:expandSidebar', handleExpandSidebar)
      window.removeEventListener('layout:toggleSidebarOverlay', handleToggleSidebarOverlay)
      window.removeEventListener('layout:adaptToolbar', handleAdaptToolbar as EventListener)
      window.removeEventListener('layout:resizeCanvasArea', handleResizeCanvasArea)
    }
  }, [setScreenSize, setToolbarCompact, setSidebarOverlayMode, toggleSidebarOverlay])

  return {
    screenSize,
    isSidebarCollapsed,
    isToolbarCompact,
    isSidebarOverlayMode,
    isDesktop: screenSize === ScreenSize.DESKTOP,
    isTablet: screenSize === ScreenSize.TABLET,
    isMobile: screenSize === ScreenSize.MOBILE,
    breakpoints: responsiveLayoutManager.getBreakpoints(),
    
    // Actions
    toggleSidebarOverlay,
    
    // Utility methods
    getCurrentScreenSize: () => responsiveLayoutManager.getCurrentScreenSize(),
    isScreenSize: (size: ScreenSize) => responsiveLayoutManager.isScreenSize(size)
  }
}
