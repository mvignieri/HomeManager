import { useEffect, useRef } from 'react';
import PusherClient from 'pusher-js';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || '';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'eu';

let pusherInstance: PusherClient | null = null;

function getPusherInstance(): PusherClient | null {
  if (!PUSHER_KEY) {
    console.warn('⚠ Pusher key not configured - real-time updates disabled');
    return null;
  }

  if (!pusherInstance) {
    try {
      pusherInstance = new PusherClient(PUSHER_KEY, {
        cluster: PUSHER_CLUSTER,
      });
      console.log('✅ Pusher client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Pusher client:', error);
      return null;
    }
  }

  return pusherInstance;
}

export function usePusher(houseId: number | undefined, userId: number | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const channelsRef = useRef<{ house?: any; user?: any }>({});

  useEffect(() => {
    const pusher = getPusherInstance();
    if (!pusher) return;

    // Subscribe to house channel for task updates
    if (houseId && !channelsRef.current.house) {
      const houseChannel = pusher.subscribe(`house-${houseId}`);
      channelsRef.current.house = houseChannel;

      // Listen for task events
      houseChannel.bind('task-updated', () => {
        console.log('📡 Received task-updated event');
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      });

      houseChannel.bind('task-created', () => {
        console.log('📡 Received task-created event');
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      });

      houseChannel.bind('task-deleted', () => {
        console.log('📡 Received task-deleted event');
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      });

      // Listen for shopping list events
      houseChannel.bind('shopping-list-updated', () => {
        console.log('📡 Received shopping-list-updated event');
        queryClient.invalidateQueries({ queryKey: ['/api/shopping-items'] });
      });

      console.log(`🔔 Subscribed to house-${houseId}`);
    }

    // Subscribe to user channel for notifications
    if (userId && !channelsRef.current.user) {
      const userChannel = pusher.subscribe(`user-${userId}`);
      channelsRef.current.user = userChannel;

      // Listen for notification events
      userChannel.bind('notification-created', (data: { notification?: { title?: string; message?: string } }) => {
        console.log('📡 Received notification-created event', data);
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });

        const title = data?.notification?.title || 'New Notification';
        const message = data?.notification?.message || '';

        // Show in-app toast
        toastRef.current({ title, description: message });

        // Show browser notification if permission granted and app is in background
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
          new Notification(title, { body: message, icon: '/icon-192.png' });
        }
      });

      console.log(`🔔 Subscribed to user-${userId}`);
    }

    // Cleanup function
    return () => {
      if (channelsRef.current.house) {
        pusher.unsubscribe(`house-${houseId}`);
        channelsRef.current.house = undefined;
        console.log(`🔕 Unsubscribed from house-${houseId}`);
      }
      if (channelsRef.current.user) {
        pusher.unsubscribe(`user-${userId}`);
        channelsRef.current.user = undefined;
        console.log(`🔕 Unsubscribed from user-${userId}`);
      }
    };
  }, [houseId, userId, queryClient]);
}
