import React from 'react'

/**
 * Responsive Layout Manager
 * 
 * Manages responsive layout behavior according to requirements:
 * - 4.1: Screen width < 1024px -> sidebar collapses to icon mode
 * - 4.2: Screen width < 768px -> toolbar shrinks to dropdown menu
 * - 4.3: Collapsed sidebar -> canvas area expands
 * - 4.4: Collapsed sidebar icon click -> overlay mode
 */

export const ScreenSize = {
  MOBILE: 'mobile',    // < 768px
  TABLET: 'tablet',    // 768px - 1024px
  DESKTOP: 'desktop'   // > 1024px
} as const

export type ScreenSize = typeof ScreenSize[keyof typeof ScreenSize]

export interface ResponsiveState {
  screenSize: ScreenSize
  screenWidth: number
  screenHeight: number
  isSidebarCollapsed: boolean
  isToolbarCompact: boolean
  isOverlayMode: boolean
}

export interface ResponsiveLayoutManager {
  // Screen size detection
  getCurrentScreenSize(): ScreenSize
  onScreenSizeChange(callback: (size: ScreenSize) => void): () => void
  
  // Layout adjustments
  adjustLayout(size: ScreenSize): void
  
  // Sidebar management
  collapseSidebar(): void
  expandSidebar(): void
  toggleSidebarOverlay(): void
  
  // Toolbar adaptation
  adaptToolbar(size: ScreenSize): void
  
  // Canvas area adjustment
  resizeCanvasArea(): void
  
  // Utility methods
  getBreakpoints(): { mobile: number; tablet: number; desktop: number }
  isScreenSize(size: ScreenSize): boolean
}

class ResponsiveLayoutManagerImpl implements ResponsiveLayoutManager {
  private callbacks: ((size: ScreenSize) => void)[] = []
  private currentSize: ScreenSize = ScreenSize.DESKTOP
  private resizeObserver: ResizeObserver | null = null
  
  private readonly breakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1024
  }

  constructor() {
    this.initializeResizeObserver()
    this.currentSize = this.getCurrentScreenSize()
  }

  private initializeResizeObserver(): void {
    if (typeof window === 'undefined') return

    this.resizeObserver = new ResizeObserver(() => {
      const newSize = this.getCurrentScreenSize()
      if (newSize !== this.currentSize) {
        this.currentSize = newSize
        this.notifyCallbacks(newSize)
      }
    })

    // Observe the document body for size changes
    this.resizeObserver.observe(document.body)

    // Also listen to window resize for immediate response
    window.addEventListener('resize', this.handleWindowResize)
  }

  private handleWindowResize = (): void => {
    const newSize = this.getCurrentScreenSize()
    if (newSize !== this.currentSize) {
      this.currentSize = newSize
      this.notifyCallbacks(newSize)
    }
  }

  private notifyCallbacks(size: ScreenSize): void {
    this.callbacks.forEach(callback => callback(size))
  }

  getCurrentScreenSize(): ScreenSize {
    if (typeof window === 'undefined') return ScreenSize.DESKTOP
    
    const width = window.innerWidth
    
    if (width < this.breakpoints.mobile) {
      return ScreenSize.MOBILE
    } else if (width < this.breakpoints.tablet) {
      return ScreenSize.TABLET
    } else {
      return ScreenSize.DESKTOP
    }
  }

  onScreenSizeChange(callback: (size: ScreenSize) => void): () => void {
    this.callbacks.push(callback)
    
    // Return cleanup function
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  adjustLayout(size: ScreenSize): void {
    // Requirement 4.1: Screen width < 1024px -> sidebar collapses
    if (size === ScreenSize.MOBILE || size === ScreenSize.TABLET) {
      this.collapseSidebar()
    }
    
    // Requirement 4.2: Screen width < 768px -> toolbar shrinks
    this.adaptToolbar(size)
    
    // Requirement 4.3: Canvas area adjustment
    this.resizeCanvasArea()
  }

  collapseSidebar(): void {
    // This will be handled by the store update
    const event = new CustomEvent('layout:collapseSidebar')
    window.dispatchEvent(event)
  }

  expandSidebar(): void {
    const event = new CustomEvent('layout:expandSidebar')
    window.dispatchEvent(event)
  }

  toggleSidebarOverlay(): void {
    // Requirement 4.4: Overlay mode for collapsed sidebar
    const event = new CustomEvent('layout:toggleSidebarOverlay')
    window.dispatchEvent(event)
  }

  adaptToolbar(size: ScreenSize): void {
    const event = new CustomEvent('layout:adaptToolbar', { 
      detail: { size, isCompact: size === ScreenSize.MOBILE } 
    })
    window.dispatchEvent(event)
  }

  resizeCanvasArea(): void {
    const event = new CustomEvent('layout:resizeCanvasArea')
    window.dispatchEvent(event)
  }

  getBreakpoints(): { mobile: number; tablet: number; desktop: number } {
    return { ...this.breakpoints }
  }

  isScreenSize(size: ScreenSize): boolean {
    return this.currentSize === size
  }

  // Cleanup method
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
    window.removeEventListener('resize', this.handleWindowResize)
    this.callbacks = []
  }
}

// Singleton instance
export const responsiveLayoutManager = new ResponsiveLayoutManagerImpl()

// Hook for React components
export function useResponsiveLayout() {
  const [screenSize, setScreenSize] = React.useState<ScreenSize>(
    responsiveLayoutManager.getCurrentScreenSize()
  )

  React.useEffect(() => {
    const cleanup = responsiveLayoutManager.onScreenSizeChange(setScreenSize)
    return cleanup
  }, [])

  return {
    screenSize,
    isDesktop: screenSize === ScreenSize.DESKTOP,
    isTablet: screenSize === ScreenSize.TABLET,
    isMobile: screenSize === ScreenSize.MOBILE,
    breakpoints: responsiveLayoutManager.getBreakpoints()
  }
}
