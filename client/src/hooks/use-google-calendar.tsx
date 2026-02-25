import { useState, useCallback, useEffect, useRef } from 'react';
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

const GCAL_TOKEN_KEY        = 'gcal_token';
const GCAL_EXPIRES_KEY      = 'gcal_token_expires';
const GCAL_EVER_CONNECTED   = 'gcal_ever_connected';
const GCAL_SCOPE            = 'https://www.googleapis.com/auth/calendar.readonly';

// ----- localStorage helpers ------------------------------------------------ //

function getStoredToken(): string | null {
  const token = localStorage.getItem(GCAL_TOKEN_KEY);
  if (!token) return null;
  const expires = localStorage.getItem(GCAL_EXPIRES_KEY);
  if (expires && Date.now() > parseInt(expires, 10)) {
    localStorage.removeItem(GCAL_TOKEN_KEY);
    localStorage.removeItem(GCAL_EXPIRES_KEY);
    return null;
  }
  return token;
}

export function storeGcalToken(token: string) {
  localStorage.setItem(GCAL_TOKEN_KEY, token);
  // Google access tokens last 1 h; treat as expired slightly early.
  localStorage.setItem(GCAL_EXPIRES_KEY, String(Date.now() + 55 * 60 * 1000));
  // Remember that this user has connected at least once.
  localStorage.setItem(GCAL_EVER_CONNECTED, 'true');
}

function clearGcalToken() {
  localStorage.removeItem(GCAL_TOKEN_KEY);
  localStorage.removeItem(GCAL_EXPIRES_KEY);
}

// --------------------------------------------------------------------------- //

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
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isConnecting, setIsConnecting] = useState(false);
  // If the token is gone but the user previously connected, show reconnect immediately.
  const [needsReconnect, setNeedsReconnect] = useState<boolean>(
    () => !getStoredToken() && !!localStorage.getItem(GCAL_EVER_CONNECTED),
  );
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const connectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearConnectingTimer = () => {
    if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
    connectingTimerRef.current = null;
  };

  // Load GIS script once
  useEffect(() => {
    if (document.getElementById('gis-script')) { setScriptLoaded(true); return; }
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  const requestToken = useCallback((
    prompt: string,
    onSuccess: (t: string) => void,
    onFail?: () => void,
  ) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.oauth2) { onFail?.(); return; }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GCAL_SCOPE,
      hint: userEmail,
      prompt,
      callback: (response) => {
        clearConnectingTimer();
        setIsConnecting(false);
        if (response.access_token) {
          storeGcalToken(response.access_token);
          setToken(response.access_token);
          setNeedsReconnect(false);
          onSuccess(response.access_token);
        } else {
          onFail?.();
        }
      },
    });
    client.requestAccessToken();
  }, [userEmail]);

  // On mount / when GIS loads: attempt silent re-auth if no token and user has connected before.
  // If GIS callback doesn't fire within 6 s (e.g. iOS blocks the silent iframe), fall back
  // to showing the reconnect button.
  useEffect(() => {
    if (!scriptLoaded || token || !userEmail) return;
    if (!localStorage.getItem(GCAL_EVER_CONNECTED)) return; // user never connected

    let callbackFired = false;

    const silentId = setTimeout(() => {
      requestToken(
        'none',
        () => { callbackFired = true; },
        () => { callbackFired = true; setNeedsReconnect(true); },
      );
    }, 500);

    // Safety net: if GIS never calls the callback (iOS ITP blocks the iframe),
    // fall back to the reconnect button after 6 s.
    const safetyId = setTimeout(() => {
      if (!callbackFired) setNeedsReconnect(true);
    }, 6000);

    return () => { clearTimeout(silentId); clearTimeout(safetyId); };
  }, [scriptLoaded, userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const reconnect = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) { console.error('VITE_GOOGLE_CLIENT_ID is not set'); return; }

    if (!scriptLoaded || !window.google?.accounts?.oauth2) {
      setNeedsReconnect(true);
      return;
    }

    setIsConnecting(true);
    setNeedsReconnect(false);

    // If the GIS popup is blocked or dismissed, reset after 30 s.
    connectingTimerRef.current = setTimeout(() => {
      setIsConnecting(false);
      setNeedsReconnect(true);
    }, 30_000);

    requestToken(
      'select_account',
      () => { clearConnectingTimer(); },
      () => { clearConnectingTimer(); setIsConnecting(false); setNeedsReconnect(true); },
    );
  }, [requestToken, scriptLoaded]);

  const disconnect = useCallback(() => {
    clearGcalToken();
    localStorage.removeItem(GCAL_EVER_CONNECTED);
    setToken(null);
    setNeedsReconnect(false);
  }, []);

  const handleExpired = useCallback(() => {
    clearGcalToken();
    setToken(null);
    if (userEmail && scriptLoaded) {
      requestToken('none', () => {}, () => setNeedsReconnect(true));
    } else {
      setNeedsReconnect(true);
    }
  }, [userEmail, scriptLoaded, requestToken]);

  // Fetch events from ALL user calendars
  const { data: events = [], isLoading } = useQuery<GoogleCalendarEvent[]>({
    queryKey: ['google-calendar-events', token],
    queryFn: async () => {
      const headers = { Authorization: `Bearer ${token}` };

      const calListRes = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
        { headers },
      );
      if (calListRes.status === 401) { handleExpired(); return []; }
      if (!calListRes.ok) throw new Error('Failed to fetch calendar list');
      const calListData = await calListRes.json();

      const calendars: { id: string; backgroundColor?: string }[] =
        (calListData.items ?? []).filter((c: any) => c.selected !== false);
      if (calendars.length === 0) return [];

      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({
        timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
      });

      const perCalendar = await Promise.all(
        calendars.map(async (cal) => {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
            { headers },
          );
          if (!res.ok) return [] as GoogleCalendarEvent[];
          const data = await res.json();
          return ((data.items ?? []) as GoogleCalendarEvent[]).map((ev) => ({
            ...ev, calendarId: cal.id, calendarColor: cal.backgroundColor,
          }));
        }),
      );

      return perCalendar.flat().sort((a, b) => {
        const ta = a.start.dateTime ?? a.start.date ?? '';
        const tb = b.start.dateTime ?? b.start.date ?? '';
        return ta.localeCompare(tb);
      });
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return { events, isLoading, isConnected: !!token, isConnecting, needsReconnect, reconnect, disconnect };
}
