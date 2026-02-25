"use client";

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Start with null to indicate that the value is not yet determined.
  // This is crucial for preventing hydration mismatches.
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Set the initial value on mount
    checkDevice();
    
    // Add event listener for window resize
    window.addEventListener("resize", checkDevice);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("resize", checkDevice);
    };
  }, []); // The empty dependency array ensures this effect runs only once on mount.

  return isMobile;
}
