import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
}

const GCAL_TOKEN_KEY = 'gcal_token';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            hint?: string;
            prompt?: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

/**
 * Hook for Google Calendar integration.
 *
 * Pass `userEmail` (from Firebase auth) to guarantee the calendar is always
 * linked to the same Google account used for app login.
 *
 * Flow:
 *  1. At login time firebase.ts extracts the OAuth token → stored in sessionStorage.
 *  2. On mount, if no token is found, we attempt a *silent* GIS re-auth
 *     (prompt: 'none', login_hint: userEmail) – no popup, works when the user
 *     already granted consent in a previous session.
 *  3. If silent re-auth fails (first ever session or consent revoked),
 *     `needsReconnect` is set to true → the UI shows a small "Reconnect"
 *     button that uses `login_hint` so the user can't pick the wrong account.
 */
export function useGoogleCalendar(userEmail?: string) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(GCAL_TOKEN_KEY));
  const [isConnecting, setIsConnecting] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load GIS script once
  useEffect(() => {
    if (document.getElementById('gis-script')) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Helper to build and request a GIS token client
  const requestToken = useCallback((prompt: string, onSuccess: (t: string) => void, onFail?: () => void) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.oauth2) return;

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GCAL_SCOPE,
      hint: userEmail,
      prompt,
      callback: (response) => {
        setIsConnecting(false);
        if (response.access_token) {
          sessionStorage.setItem(GCAL_TOKEN_KEY, response.access_token);
          setToken(response.access_token);
          setNeedsReconnect(false);
          onSuccess(response.access_token);
        } else {
          onFail?.();
        }
      },
    });
    client.requestAccessToken();
  }, [userEmail, scriptLoaded]);

  // On mount: if we have no token but know the user email, try silent re-auth.
  // This covers page reloads after the first login session.
  useEffect(() => {
    if (!scriptLoaded || token || !userEmail) return;
    // Small delay to ensure GIS script is fully initialised
    const id = setTimeout(() => {
      requestToken(
        'none', // silent – no popup
        () => {}, // success: token set inside requestToken
        () => setNeedsReconnect(true), // fail: show reconnect button
      );
    }, 500);
    return () => clearTimeout(id);
  }, [scriptLoaded, userEmail]);

  // Manual reconnect – uses login_hint so the user can't pick another account
  const reconnect = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('VITE_GOOGLE_CLIENT_ID is not set');
      return;
    }
    setIsConnecting(true);
    requestToken(
      'select_account', // show picker but hint pre-selects the right account
      () => {},
      () => setNeedsReconnect(true),
    );
  }, [requestToken]);

  const disconnect = useCallback(() => {
    sessionStorage.removeItem(GCAL_TOKEN_KEY);
    setToken(null);
    setNeedsReconnect(false);
  }, []);

  // Fetch events for the next 3 months
  const { data: events = [], isLoading } = useQuery<GoogleCalendarEvent[]>({
    queryKey: ['google-calendar-events', token],
    queryFn: async () => {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 401) {
        // Token expired – clear it and try silent re-auth
        sessionStorage.removeItem(GCAL_TOKEN_KEY);
        setToken(null);
        if (userEmail && scriptLoaded) {
          requestToken('none', () => {}, () => setNeedsReconnect(true));
        } else {
          setNeedsReconnect(true);
        }
        return [];
      }
      if (!res.ok) throw new Error('Failed to fetch Google Calendar events');
      const data = await res.json();
      return (data.items ?? []) as GoogleCalendarEvent[];
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    events,
    isLoading,
    isConnected: !!token,
    isConnecting,
    needsReconnect,
    reconnect,
    disconnect,
  };
}
