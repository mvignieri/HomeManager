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
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export function useGoogleCalendar() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(GCAL_TOKEN_KEY));
  const [isConnecting, setIsConnecting] = useState(false);
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

  const connect = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('VITE_GOOGLE_CLIENT_ID is not set');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      console.error('Google Identity Services not loaded yet');
      return;
    }
    setIsConnecting(true);
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GCAL_SCOPE,
      callback: (response) => {
        setIsConnecting(false);
        if (response.access_token) {
          sessionStorage.setItem(GCAL_TOKEN_KEY, response.access_token);
          setToken(response.access_token);
        } else {
          console.error('Google Calendar auth failed:', response.error);
        }
      },
    });
    client.requestAccessToken();
  }, [scriptLoaded]);

  const disconnect = useCallback(() => {
    sessionStorage.removeItem(GCAL_TOKEN_KEY);
    setToken(null);
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
        // Token expired – clear it
        sessionStorage.removeItem(GCAL_TOKEN_KEY);
        setToken(null);
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
    scriptLoaded,
    connect,
    disconnect,
  };
}
