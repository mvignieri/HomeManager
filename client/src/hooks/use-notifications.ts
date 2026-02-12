import { useState, useEffect } from 'react';
import { requestNotificationPermission, sendNotification } from '@/lib/pwa';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  };

  const notify = async (title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      await sendNotification(title, options);
      return true;
    } else if (permission === 'default') {
      const result = await requestPermission();
      if (result === 'granted') {
        await sendNotification(title, options);
        return true;
      }
    }
    return false;
  };

  return {
    permission,
    isSupported,
    requestPermission,
    notify,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
  };
}
