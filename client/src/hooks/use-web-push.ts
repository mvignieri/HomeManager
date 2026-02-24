import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/app-context';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const { user } = useAppContext();
  const [dbUserId, setDbUserId] = useState<number | null>(null);

  // Fetch database user ID
  useEffect(() => {
    if (!user) {
      setDbUserId(null);
      return;
    }
    fetch(`/api/users/me?uid=${user.uid}`)
      .then(r => r.ok ? r.json() : null)
      .then(u => u && setDbUserId(u.id))
      .catch(console.error);
  }, [user]);

  // Subscribe to Web Push
  useEffect(() => {
    if (!user || !dbUserId) return;

    if (!VAPID_PUBLIC_KEY) {
      console.warn('⚠ VITE_VAPID_PUBLIC_KEY not set - push notifications disabled');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported in this browser');
      return;
    }

    const subscribe = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        const res = await fetch('/api/users/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, userId: dbUserId }),
        });

        if (res.ok) {
          console.log('✅ Web Push subscription saved');
        } else {
          console.error('Failed to save push subscription');
        }
      } catch (error) {
        console.error('Error subscribing to push notifications:', error);
      }
    };

    subscribe();
  }, [user, dbUserId]);
}
