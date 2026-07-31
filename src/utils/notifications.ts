// FCM push notifications for the Agent app (Android). Lets an agent receive
// NEW_BOOKING_AVAILABLE / BOOKING_CANCELLED / NEW_RATING_RECEIVED even when the app
// is backgrounded or killed — the Socket.io side only works in the foreground.
//
// Guarded: expo-notifications/expo-device are required lazily so the app still runs
// in Expo Go / before the packages are installed (push just no-ops there). Real FCM
// tokens only exist in a dev/production build (APK), never in Expo Go.
import { Platform } from 'react-native';
import apiClient, { BASE_URL } from '../api/apiClient';

let Notifications: any = null;
let Device: any = null;
let Constants: any = null;
try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;
} catch (_) { /* packages not installed yet — push disabled */ }

// Expo Go issues sandbox tokens the backend's FCM sender rejects — skip entirely.
const isExpoGo = Constants?.appOwnership === 'expo';

// Backend guide: POST/DELETE /api/notifications/device-token (NOT under /v1).
// BASE_URL is ".../api/v1", so drop the version segment for the notification route.
// TODO: if the backend actually serves this under /api/v1, change one line here.
const NOTIF_ROOT = BASE_URL.replace(/\/v1\/?$/, '');
const DEVICE_TOKEN_URL = `${NOTIF_ROOT}/notifications/device-token`;

// Foreground display config — show a heads-up + sound when a push arrives while the
// app is open (Android does NOT auto-show a tray notification in the foreground).
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function getFcmToken(): Promise<string | null> {
  if (!Notifications || !Device) return null;
  if (!Device.isDevice) return null;           // emulator without Play Services
  if (Platform.OS !== 'android') return null;  // backend validator only accepts ANDROID
  if (isExpoGo) return null;                    // Expo Go tokens rejected — needs APK

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Pickup alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#15803d',
  });

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;

  const tokenData = await Notifications.getDevicePushTokenAsync(); // FCM token on Android
  return tokenData?.data || null;
}

// Call after login (agent JWT stored) AND on app launch when a session already
// exists — a missing token means that agent gets zero pushes.
export async function registerDeviceToken(): Promise<void> {
  try {
    const token = await getFcmToken();
    if (!token) return;
    await apiClient.post(DEVICE_TOKEN_URL, { token, platform: 'ANDROID' });
  } catch (e) {
    console.warn('[push] device-token registration failed', e);
  }
}

// Call on explicit logout, WHILE the agent JWT is still stored (the request needs
// its auth header) — otherwise a logged-out device keeps receiving that agent's pushes.
export async function removeDeviceToken(): Promise<void> {
  if (!Notifications) return;
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    if (tokenData?.data) {
      await apiClient.delete(DEVICE_TOKEN_URL, { data: { token: tokenData.data } });
    }
  } catch (e) {
    console.warn('[push] device-token removal failed', e);
  }
}

// FCM can rotate the token at any time — re-send whenever it does (guide §3.2).
export function addTokenRotationListener(): { remove: () => void } {
  if (!Notifications?.addPushTokenListener) return { remove: () => {} };
  return Notifications.addPushTokenListener(({ data }: { data: string }) => {
    apiClient.post(DEVICE_TOKEN_URL, { token: data, platform: 'ANDROID' }).catch(() => {});
  });
}

// Notification tap → hands back the data payload (event, bookingId, …) so the app
// can deep-link to the right screen.
export function addNotificationTapListener(cb: (data: any) => void): { remove: () => void } {
  if (!Notifications?.addNotificationResponseReceivedListener) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener((response: any) => {
    cb(response?.notification?.request?.content?.data || {});
  });
}

// If the app was cold-started by tapping a notification, return its data payload.
export async function getInitialNotificationData(): Promise<any | null> {
  if (!Notifications?.getLastNotificationResponseAsync) return null;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification?.request?.content?.data || null;
  } catch (_) {
    return null;
  }
}
