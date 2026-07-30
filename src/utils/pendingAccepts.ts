import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookingService } from '../services/bookingService';

// Bookings whose accept call failed to reach the server (e.g. Render
// cold-start timeout) get queued here so the agent can still resume the job
// after closing the app, while we keep retrying the real accept in the
// background until it lands on the backend.
const STORAGE_KEY = 'pendingAcceptedBookings';
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000, 120000];

export type PendingAccept = {
  bookingId: string;
  booking: any;
  queuedAt: number;
};

async function readAll(): Promise<PendingAccept[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeAll(list: PendingAccept[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function getPendingAccepts(): Promise<PendingAccept[]> {
  return readAll();
}

export async function queuePendingAccept(bookingId: string, booking: any) {
  const list = await readAll();
  if (list.some(p => p.bookingId === bookingId)) return;
  list.push({ bookingId, booking, queuedAt: Date.now() });
  await writeAll(list);
}

export async function clearPendingAccept(bookingId: string) {
  const list = await readAll();
  await writeAll(list.filter(p => p.bookingId !== bookingId));
}

// Bookings currently being retried, so a manual "Retry" tap or a relaunch
// doesn't stack a second concurrent backoff loop for the same booking.
const inFlight = new Set<string>();

// Retries a single queued accept with backoff until it succeeds, the booking
// is confirmed gone (400 — already taken/expired), or attempts run out.
export function retryPendingAccept(bookingId: string) {
  if (inFlight.has(bookingId)) return;
  inFlight.add(bookingId);

  let attempt = 0;
  const tryOnce = async () => {
    try {
      await bookingService.acceptBooking(bookingId);
      await clearPendingAccept(bookingId);
      inFlight.delete(bookingId);
    } catch (error: any) {
      if (error?.response?.status === 400) {
        await clearPendingAccept(bookingId);
        inFlight.delete(bookingId);
        return;
      }
      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt];
        attempt += 1;
        setTimeout(tryOnce, delay);
      } else {
        inFlight.delete(bookingId);
      }
    }
  };
  tryOnce();
}

// Resumes retrying every accept left over from a killed app session.
export async function resumeAllPendingAccepts() {
  const list = await readAll();
  list.forEach(p => retryPendingAccept(p.bookingId));
}
