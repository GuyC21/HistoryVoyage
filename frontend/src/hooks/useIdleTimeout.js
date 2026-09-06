import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';


/**
 * Hook to handle idle timeout and automatic logout.
 * Resets the idle timer on user DOM interaction (clicks, scrolls, typing)
 * or significant GPS movement (> 10 meters).
 * 
 * @param {Function} onIdle - Callback triggered when the user becomes idle.
 * @param {number} timeoutMinutes - Number of minutes of inactivity before triggering onIdle.
 */
export function useIdleTimeout(onIdle, timeoutMinutes = 15) {
  const lastActivity = useRef(Date.now());
  const onIdleRef = useRef(onIdle);
  const hasTriggered = useRef(false);
  const lastLocation = useRef(null);

  // Keep the latest callback without triggering re-renders
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    hasTriggered.current = false; // Reset trigger if timeout changes
    lastActivity.current = Date.now(); // Reset activity on mount

    // 1. Bulletproof Interval Checker
    // Checks the physical elapsed time every 1 second.
    // This is immune to background tab suspension, browser throttling, and event loop delays.
    const checkIdleInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      
      if (!hasTriggered.current && elapsed >= timeoutMs) {
        hasTriggered.current = true; // Prevent multiple triggers while logout is processing
        if (onIdleRef.current) {
          onIdleRef.current();
        }
      }
    }, 1000);

    // 2. DOM Activity Handler
    const handleActivity = () => {
      if (!hasTriggered.current) {
        // CRITICAL FIX: If the tab was completely frozen by the browser (Memory Saver, iOS Safari), 
        // the interval won't fire. When the tab wakes up, handleActivity fires first.
        // We MUST check if they were already idle before resetting the activity timer!
        if (Date.now() - lastActivity.current >= timeoutMs) {
          hasTriggered.current = true;
          if (onIdleRef.current) onIdleRef.current();
        } else {
          lastActivity.current = Date.now();
        }
      }
    };

    const WINDOW_EVENTS = ['mousemove', 'keydown', 'touchstart', 'click'];
    WINDOW_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    // visibilitychange must be attached to document to work reliably in all browsers
    document.addEventListener('visibilitychange', handleActivity, { passive: true });

    // 3. Battery-friendly GPS location polling (every 2 minutes)
    const gpsPollInterval = setInterval(() => {
      if (navigator.geolocation && !hasTriggered.current) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            if (lastLocation.current) {
              const prevLoc = L.latLng(lastLocation.current.lat, lastLocation.current.lng);
              const newLoc = L.latLng(latitude, longitude);
              
              if (prevLoc.distanceTo(newLoc) > 10 || position.coords.speed > 0) {
                if (Date.now() - lastActivity.current >= timeoutMs) {
                  hasTriggered.current = true;
                  if (onIdleRef.current) onIdleRef.current();
                } else {
                  lastActivity.current = Date.now();
                }
                lastLocation.current = { lat: latitude, lng: longitude };
              }
            } else {
              lastLocation.current = { lat: latitude, lng: longitude };
            }
          },
          (error) => {
            console.warn("IdleTimeout Geolocation error:", error);
          },
          {
            enableHighAccuracy: false,
            maximumAge: 60000,
            timeout: 10000
          }
        );
      }
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(checkIdleInterval);
      clearInterval(gpsPollInterval);
      WINDOW_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleActivity);
    };
  }, [timeoutMinutes]);
}
