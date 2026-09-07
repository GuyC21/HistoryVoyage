import { useEffect, useRef } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import L from 'leaflet';

export const IDLE_TIMEOUT_MINUTES = 15; // Change this to 10/60 for QA testing 10 seconds

/**
 * Hook to handle idle timeout and automatic logout using the industry standard react-idle-timer.
 * Features built-in robust cross-tab sync and browser suspension handling.
 * Also includes custom GPS polling to keep users active during navigation.
 * 
 * @param {Function} onIdle - Callback triggered when the user becomes idle.
 * @param {number} timeoutMinutes - Number of minutes of inactivity before triggering onIdle.
 */
export function useIdleTimeout(onIdle, timeoutMinutes = IDLE_TIMEOUT_MINUTES) {
  const lastLocation = useRef(null);

  // 1. Core Idle Timer via Professional Package
  // This automatically handles cross-tab BroadcastChannels, browser sleep/wake events, 
  // and performance-optimized event listeners.
  const { activate } = useIdleTimer({
    onIdle: onIdle,
    timeout: timeoutMinutes * 60 * 1000,
    crossTab: true,
    syncTimers: 200,
    events: [
      'mousemove',
      'keydown',
      'wheel',
      'DOMMouseScroll',
      'mousewheel',
      'mousedown',
      'touchstart',
      'touchmove',
      'MSPointerDown',
      'MSPointerMove',
      'visibilitychange'
    ],
    // Exclude 'scroll' because Map Explorer triggers automatic layout shifts that register as scrolling.
    onAction: () => {
      // Sync to localStorage so if the browser is completely closed, AuthContext knows when we were last active
      localStorage.setItem('lastIdleActivity', Date.now().toString());
    }
  });

  // 2. Custom Battery-friendly GPS location polling
  // Fires every 2 minutes. If user moved more than 10 meters, we manually trigger activate()
  // to tell the IdleTimer that the user is still active.
  useEffect(() => {
    const gpsPollInterval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            if (lastLocation.current) {
              const prevLoc = L.latLng(lastLocation.current.lat, lastLocation.current.lng);
              const newLoc = L.latLng(latitude, longitude);
              
              if (prevLoc.distanceTo(newLoc) > 10 || position.coords.speed > 0) {
                // User moved physically, keep their session alive!
                activate();
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

    return () => clearInterval(gpsPollInterval);
  }, [activate]);
}
