import * as React from "react"

// Breakpoints that align with Tailwind CSS defaults
export const BREAKPOINTS = {
  sm: 640,   // Small devices
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (laptops)
  xl: 1280,  // Extra large devices
  '2xl': 1536 // 2X large devices
}

/**
 * Hook to check if the current viewport is mobile-sized
 * @returns boolean indicating if the viewport is smaller than the md breakpoint
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return;
    
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.md - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.md)
    }
    
    // Set initial value
    setIsMobile(window.innerWidth < BREAKPOINTS.md)
    
    // Add listener for screen size changes
    mql.addEventListener("change", onChange)
    
    // Debounced resize handler for better performance
    let timeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsMobile(window.innerWidth < BREAKPOINTS.md);
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    }
  }, [])

  return !!isMobile
}

/**
 * Hook to get the current screen size category
 * @returns current screen size: 'xs', 'sm', 'md', 'lg', 'xl', or '2xl'
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('md')
  
  React.useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return;
    
    const getScreenSize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.sm) return 'xs';
      if (width < BREAKPOINTS.md) return 'sm';
      if (width < BREAKPOINTS.lg) return 'md';
      if (width < BREAKPOINTS.xl) return 'lg';
      if (width < BREAKPOINTS['2xl']) return 'xl';
      return '2xl';
    };
    
    // Set initial value
    setScreenSize(getScreenSize());
    
    // Debounced resize handler for better performance
    let timeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setScreenSize(getScreenSize());
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, []);
  
  return screenSize;
}
