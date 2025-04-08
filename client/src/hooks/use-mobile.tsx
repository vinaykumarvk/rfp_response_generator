import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Initial check
    checkIfMobile()
    
    // Setup event listener
    function handleResize() {
      checkIfMobile()
    }
    
    function checkIfMobile() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Comment this line when you're done testing
  return true
  
  // return isMobile
}
