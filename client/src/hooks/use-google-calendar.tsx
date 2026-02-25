import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  calendarId?: string;
  calendarColor?: string;
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

  // On mount: silent re-auth if no token (covers page reloads)
  useEffect(() => {
    if (!scriptLoaded || token || !userEmail) return;
    const id = setTimeout(() => {
      requestToken('none', () => {}, () => setNeedsReconnect(true));
    }, 500);
    return () => clearTimeout(id);
  }, [scriptLoaded, userEmail]);

  const reconnect = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) { console.error('VITE_GOOGLE_CLIENT_ID is not set'); return; }
    setIsConnecting(true);
    requestToken('select_account', () => {}, () => setNeedsReconnect(true));
  }, [requestToken]);

  const disconnect = useCallback(() => {
    sessionStorage.removeItem(GCAL_TOKEN_KEY);
    setToken(null);
    setNeedsReconnect(false);
  }, []);

  const handleExpired = useCallback(() => {
    sessionStorage.removeItem(GCAL_TOKEN_KEY);
    setToken(null);
    if (userEmail && scriptLoaded) {
      requestToken('none', () => {}, () => setNeedsReconnect(true));
    } else {
      setNeedsReconnect(true);
    }
  }, [userEmail, scriptLoaded, requestToken]);

  // Fetch events from ALL user calendars (not just primary)
  const { data: events = [], isLoading } = useQuery<GoogleCalendarEvent[]>({
    queryKey: ['google-calendar-events', token],
    queryFn: async () => {
      const headers = { Authorization: `Bearer ${token}` };

      // Step 1: get the list of all calendars the user has selected
      const calListRes = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
        { headers }
      );
      if (calListRes.status === 401) { handleExpired(); return []; }
      if (!calListRes.ok) throw new Error('Failed to fetch calendar list');
      const calListData = await calListRes.json();

      // Only fetch from calendars the user has visible (selected !== false)
      const calendars: { id: string; backgroundColor?: string; summary?: string }[] =
        (calListData.items ?? []).filter((c: any) => c.selected !== false);

      if (calendars.length === 0) return [];

      // Step 2: fetch events from all calendars in parallel (next 3 months)
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });

      const perCalendar = await Promise.all(
        calendars.map(async (cal) => {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
            { headers }
          );
          if (!res.ok) return [] as GoogleCalendarEvent[];
          const data = await res.json();
          return ((data.items ?? []) as GoogleCalendarEvent[]).map((ev) => ({
            ...ev,
            calendarId: cal.id,
            calendarColor: cal.backgroundColor,
          }));
        })
      );

      // Merge and sort by start time
      return perCalendar
        .flat()
        .sort((a, b) => {
          const ta = a.start.dateTime ?? a.start.date ?? '';
          const tb = b.start.dateTime ?? b.start.date ?? '';
          return ta.localeCompare(tb);
        });
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
