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

const GCAL_TOKEN_KEY      = 'gcal_token';
const GCAL_EXPIRES_KEY    = 'gcal_token_expires';
const GCAL_EVER_CONNECTED = 'gcal_ever_connected';
const GCAL_SCOPE          = 'https://www.googleapis.com/auth/calendar.readonly';

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
  localStorage.setItem(GCAL_EXPIRES_KEY, String(Date.now() + 55 * 60 * 1000));
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

/**
 * Optional callback provided by the caller (AppContext) that performs a
 * Firebase reauthentication popup and returns the new Google access token.
 * This is more reliable than GIS on iOS PWA because Firebase's popup
 * mechanism already works on iOS (the user successfully uses it to log in).
 */
export type ReauthFn = () => Promise<string | null>;

export function useGoogleCalendar(userEmail?: string, reauthFn?: ReauthFn) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isConnecting, setIsConnecting] = useState(false);
  // Show reconnect immediately if token is gone but user previously connected.
  const [needsReconnect, setNeedsReconnect] = useState<boolean>(
    () => !getStoredToken() && !!localStorage.getItem(GCAL_EVER_CONNECTED),
  );
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const connectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearConnectingTimer = () => {
    if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
    connectingTimerRef.current = null;
  };

  // Load GIS script (used only for browsers where it works; iOS falls back to reauthFn)
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

  // GIS-based token request (desktop fallback)
  const requestTokenViaGIS = useCallback((
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

  // On mount / when GIS loads: attempt silent re-auth.
  // On iOS, the GIS iframe is blocked by ITP so we rely on needsReconnect being
  // set immediately (via gcal_ever_connected) and the user tapping the button.
  useEffect(() => {
    if (!scriptLoaded || token || !userEmail) return;
    if (!localStorage.getItem(GCAL_EVER_CONNECTED)) return;

    let callbackFired = false;
    const silentId = setTimeout(() => {
      requestTokenViaGIS(
        'none',
        () => { callbackFired = true; },
        () => { callbackFired = true; setNeedsReconnect(true); },
      );
    }, 500);

    // Safety net: if GIS never calls back (iOS ITP blocks the iframe),
    // fall through to the reconnect button after 5 s.
    const safetyId = setTimeout(() => {
      if (!callbackFired) setNeedsReconnect(true);
    }, 5000);

    return () => { clearTimeout(silentId); clearTimeout(safetyId); };
  }, [scriptLoaded, userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── reconnect ────────────────────────────────────────────────────────────── //
  const reconnect = useCallback(() => {
    setIsConnecting(true);
    setNeedsReconnect(false);

    // Prefer Firebase reauthentication if provided — this is the mechanism that
    // works on iOS PWA (same popup path used for the initial login).
    if (reauthFn) {
      connectingTimerRef.current = setTimeout(() => {
        setIsConnecting(false);
        setNeedsReconnect(true);
      }, 60_000);

      reauthFn()
        .then((newToken) => {
          clearConnectingTimer();
          if (newToken) {
            storeGcalToken(newToken);
            setToken(newToken);
            setNeedsReconnect(false);
          } else {
            setNeedsReconnect(true);
          }
        })
        .catch(() => {
          clearConnectingTimer();
          setNeedsReconnect(true);
        })
        .finally(() => setIsConnecting(false));
      return;
    }

    // Fallback: GIS popup (works on desktop Chrome/Firefox)
    if (!scriptLoaded || !window.google?.accounts?.oauth2) {
      setIsConnecting(false);
      setNeedsReconnect(true);
      return;
    }

    connectingTimerRef.current = setTimeout(() => {
      setIsConnecting(false);
      setNeedsReconnect(true);
    }, 30_000);

    requestTokenViaGIS(
      'select_account',
      () => { clearConnectingTimer(); },
      () => { clearConnectingTimer(); setIsConnecting(false); setNeedsReconnect(true); },
    );
  }, [reauthFn, requestTokenViaGIS, scriptLoaded]);

  const disconnect = useCallback(() => {
    clearGcalToken();
    localStorage.removeItem(GCAL_EVER_CONNECTED);
    setToken(null);
    setNeedsReconnect(false);
  }, []);

  const handleExpired = useCallback(() => {
    clearGcalToken();
    setToken(null);
    // Show reconnect immediately — the user will tap the Navbar button.
    setNeedsReconnect(true);
  }, []);

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
