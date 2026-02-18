import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let firebaseAdmin: App | null = null;

export function initializeFirebaseAdmin() {
  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseAdmin = existingApps[0];
    return firebaseAdmin;
  }

  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  try {
    // Check if service account key is provided
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccount) {
      // Parse and validate JSON
      const serviceAccountJson = JSON.parse(serviceAccount);

      // Initialize with service account
      firebaseAdmin = initializeApp({
        credential: cert(serviceAccountJson),
      });
      console.log('✓ Firebase Admin initialized with service account');
    } else {
      console.log('⚠ Firebase Admin not initialized - no credentials found');
      console.log('  FCM notifications will not work until credentials are provided');
      console.log('  Set FIREBASE_SERVICE_ACCOUNT_KEY in .env');
      return null;
    }

    return firebaseAdmin;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    return null;
  }
}

export function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    return initializeFirebaseAdmin();
  }
  return firebaseAdmin;
}

// Send push notification to a specific user
export async function sendNotificationToUser(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const admin = getFirebaseAdmin();

  if (!admin) {
    console.warn('Firebase Admin not initialized, cannot send notification');
    return false;
  }

  try {
    const messaging = getMessaging(admin);

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: fcmToken,
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        },
      },
    };

    const response = await messaging.send(message);
    console.log('Successfully sent message:', response);
    return true;
  } catch (error: any) {
    console.error('Error sending message:', error);

    // If token is invalid, we should remove it from database
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      console.log('Invalid FCM token, should be removed from database');
    }

    return false;
  }
}

// Send notification to multiple users
export async function sendNotificationToMultipleUsers(
  fcmTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  const admin = getFirebaseAdmin();

  if (!admin) {
    console.warn('Firebase Admin not initialized, cannot send notifications');
    return { successCount: 0, failureCount: fcmTokens.length };
  }

  try {
    const messaging = getMessaging(admin);

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: fcmTokens,
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} messages`);

    if (response.failureCount > 0) {
      console.log(`Failed to send ${response.failureCount} messages`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Error for token ${fcmTokens[idx]}:`, resp.error);
        }
      });
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending multicast message:', error);
    return { successCount: 0, failureCount: fcmTokens.length };
  }
}
