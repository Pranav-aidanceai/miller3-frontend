import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Lazy initializer reads the real viewport on mount instead of the effect
// calling setState synchronously for the initial value (server-render falls
// back to `false`, corrected on hydration by the effect's own re-render).
function getIsMobile() {
  if (typeof window === "undefined") return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
