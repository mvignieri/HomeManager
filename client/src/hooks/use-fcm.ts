import { useState, useEffect } from 'react';
import { getFCMToken, initializeMessaging, onMessageListener } from '@/lib/firebase';
import { useAppContext } from '@/context/app-context';
import { useToast } from './use-toast';

export function useFCM() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAppContext();
  const { toast } = useToast();

  // Get database user ID
  const [dbUserId, setDbUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDbUser = async () => {
      if (!user) {
        setDbUserId(null);
        return;
      }

      try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const users = await res.json();
        const dbUser = users.find((u: any) => u.uid === user.uid);
        if (dbUser) {
          setDbUserId(dbUser.id);
        }
      } catch (error) {
        console.error('Error fetching database user:', error);
      }
    };

    fetchDbUser();
  }, [user]);

  // Initialize FCM and get token
  useEffect(() => {
    const init = async () => {
      try {
        const messaging = await initializeMessaging();
        setIsSupported(!!messaging);

        if (messaging && user && dbUserId) {
          // Request notification permission
          const permission = await Notification.requestPermission();

          if (permission === 'granted') {
            // Get FCM token
            const token = await getFCMToken();

            if (token) {
              setFcmToken(token);

              // Save token to server
              await saveFCMTokenToServer(token, dbUserId);
            }
          } else {
            console.log('Notification permission denied');
          }
        }
      } catch (error) {
        console.error('Error initializing FCM:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && dbUserId) {
      init();
    } else if (!user) {
      setIsLoading(false);
    }
  }, [user, dbUserId]);

  // Listen for foreground messages
  useEffect(() => {
    if (!isSupported) return;

    const unsubscribe = onMessageListener((payload) => {
      console.log('Foreground message received:', payload);

      // Show notification toast
      toast({
        title: payload.notification?.title || 'New Notification',
        description: payload.notification?.body || '',
      });

      // Show browser notification if possible
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'HomeTask', {
          body: payload.notification?.body || '',
          icon: payload.notification?.icon || '/icon-192.png',
          data: payload.data
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isSupported, toast]);

  // Save FCM token to server
  const saveFCMTokenToServer = async (token: string, userId: number) => {
    try {
      const res = await fetch('/api/users/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId }),
      });

      if (res.ok) {
        console.log('FCM token saved to server');
      } else {
        console.error('Failed to save FCM token');
      }
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  };

  const refreshToken = async () => {
    if (!dbUserId) return;

    setIsLoading(true);
    try {
      const token = await getFCMToken();
      if (token) {
        setFcmToken(token);
        await saveFCMTokenToServer(token, dbUserId);
      }
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fcmToken,
    isSupported,
    isLoading,
    refreshToken,
  };
}
