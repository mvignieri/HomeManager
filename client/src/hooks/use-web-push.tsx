import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppContext } from '@/context/app-context';
import { useToast } from './use-toast';
import { ToastAction } from '@/components/ui/toast';

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

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function useWebPush() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [dbUserId, setDbUserId] = useState<number | null>(null);
  const toastShownRef = useRef(false);

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

  // Core subscribe function — must be called from a user gesture on iOS
  const subscribe = useCallback(async (userId: number) => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn('⚠ VITE_VAPID_PUBLIC_KEY not set - push notifications disabled');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported in this browser');
      return;
    }
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
        body: JSON.stringify({ subscription, userId }),
      });

      if (res.ok) {
        console.log('✅ Web Push subscription saved');
      } else {
        console.error('Failed to save push subscription');
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    }
  }, []);

  useEffect(() => {
    if (!user || !dbUserId) return;
    if (!VAPID_PUBLIC_KEY) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;

    if (isIOS()) {
      // iOS requires requestPermission() to be called from a user gesture.
      // If already granted, subscribe directly. Otherwise show a toast with a button.
      if (Notification.permission === 'granted') {
        subscribe(dbUserId);
      } else if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast({
          title: 'Abilita le notifiche',
          description: 'Tocca il bottone per ricevere notifiche push per i task assegnati.',
          duration: 20000,
          action: <ToastAction altText="Abilita" onClick={() => subscribe(dbUserId)}>Abilita</ToastAction>,
        });
      }
    } else {
      // Non-iOS: auto-request permission
      subscribe(dbUserId);
    }
  }, [user, dbUserId, subscribe, toast]);
}
