import AsyncStorage from '@react-native-async-storage/async-storage';

// Jobs this agent has opened in the job flow and not finished, kept on the device
// so a job stays in the queue with Resume after the agent backs out or closes the
// app, whatever the server's job list returns. Removed once the job is completed,
// cancelled or confirmed finished by the server.
const STORAGE_KEY = 'activeJobs';

export type SavedJob = {
  bookingId: string;
  booking: any;
  step: number;
  savedAt: number;
};

async function readAll(): Promise<SavedJob[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeAll(list: SavedJob[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export async function getSavedJobs(): Promise<SavedJob[]> {
  return readAll();
}

export async function saveActiveJob(booking: any, step: number) {
  const bookingId = booking?._id || booking?.id;
  if (!bookingId) return;
  const list = (await readAll()).filter(j => j.bookingId !== bookingId);
  list.push({ bookingId, booking, step, savedAt: Date.now() });
  await writeAll(list);
}

export async function removeActiveJob(bookingId: string) {
  const list = await readAll();
  await writeAll(list.filter(j => j.bookingId !== bookingId));
}
