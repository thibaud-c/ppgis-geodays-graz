import { useState, useEffect } from 'react';

const DEFAULT_CENTER: [number, number] = [47.0707, 15.4395]; // Graz fallback

interface GeolocationState {
    center: [number, number];
    resolved: boolean;
}

/**
 * Attempts to get the user's location via GPS.
 * Falls back to IP-based geolocation if GPS is denied.
 * Defaults to Graz if both fail.
 */
export function useGeolocation() {
    const [state, setState] = useState<GeolocationState>({
        center: DEFAULT_CENTER,
        resolved: false,
    });

    useEffect(() => {
        let cancelled = false;

        const setLocation = (lat: number, lng: number) => {
            if (!cancelled) {
                setState({ center: [lat, lng], resolved: true });
            }
        };

        const fallbackToIP = async () => {
            try {
                // Free IP geolocation API (no key required)
                const res = await fetch('https://ipapi.co/json/');
                const data = await res.json();
                if (data.latitude && data.longitude) {
                    setLocation(data.latitude, data.longitude);
                } else {
                    setState({ center: DEFAULT_CENTER, resolved: true });
                }
            } catch {
                setState({ center: DEFAULT_CENTER, resolved: true });
            }
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    // GPS denied or failed → try IP
                    fallbackToIP();
                },
                { enableHighAccuracy: false, timeout: 5000 }
            );
        } else {
            fallbackToIP();
        }

        return () => { cancelled = true; };
    }, []);

    return state;
}
