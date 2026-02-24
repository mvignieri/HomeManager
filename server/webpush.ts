import webpush from 'web-push';

let initialized = false;

export function initializeWebPush(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const rawContact = process.env.VAPID_CONTACT_EMAIL || 'admin@homemanager.app';
  const contact = rawContact.startsWith('mailto:') || rawContact.startsWith('https://')
    ? rawContact
    : `mailto:${rawContact}`;

  if (!publicKey || !privateKey) {
    console.warn('⚠ VAPID keys not configured - web push notifications disabled');
    return false;
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);
  initialized = true;
  console.log('✅ Web Push (VAPID) initialized');
  return true;
}

export async function sendWebPush(
  subscriptionJson: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!initialized) {
    console.warn('Web Push not initialized - skipping notification');
    return false;
  }

  try {
    const subscription = JSON.parse(subscriptionJson) as webpush.PushSubscription;
    const payload = JSON.stringify({ title, body, data: data || {} });
    await webpush.sendNotification(subscription, payload);
    console.log(`📱 Web Push sent: ${title}`);
    return true;
  } catch (error: any) {
    console.error('Error sending web push:', error);
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('Push subscription is no longer valid - should be removed from DB');
    }
    return false;
  }
}
