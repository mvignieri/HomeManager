import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

export function initializePusher(): Pusher | null {
  if (pusherInstance) {
    return pusherInstance;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || 'eu';

  if (!appId || !key || !secret) {
    console.warn('⚠ Pusher credentials not found - real-time updates will not work');
    return null;
  }

  try {
    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });

    console.log('✅ Pusher initialized successfully');
    return pusherInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Pusher:', error);
    return null;
  }
}

export function getPusher(): Pusher | null {
  return pusherInstance;
}

// Trigger an event to a house channel
export async function triggerHouseEvent(houseId: number, event: string, data: any) {
  const pusher = getPusher();
  if (!pusher) {
    console.warn('Pusher not initialized - skipping event:', event);
    return;
  }

  try {
    await pusher.trigger(`house-${houseId}`, event, data);
    console.log(`📡 Pusher event sent: ${event} to house-${houseId}`);
  } catch (error) {
    console.error('Failed to trigger Pusher event:', error);
  }
}

// Trigger an event to a user channel
export async function triggerUserEvent(userId: number, event: string, data: any) {
  const pusher = getPusher();
  if (!pusher) {
    console.warn('Pusher not initialized - skipping event:', event);
    return;
  }

  try {
    await pusher.trigger(`user-${userId}`, event, data);
    console.log(`📡 Pusher event sent: ${event} to user-${userId}`);
  } catch (error) {
    console.error('Failed to trigger Pusher event:', error);
  }
}
