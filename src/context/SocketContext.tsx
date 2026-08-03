import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { Alert, Vibration } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';
import { useNotifications } from './NotificationContext';
import { useAuth } from './AuthContext';
import { notifySessionInvalid } from '../utils/authEvents';

const SOCKET_URL = 'https://karmacoin-backend-testing.onrender.com';
const GPS_INTERVAL_MS = 30000; // 30 seconds

interface IncomingBooking {
  bookingId: string;
  message: string;
  location?: any;
  radius?: number;
}

interface SocketContextType {
  isConnected: boolean;
  incomingBooking: IncomingBooking | null;
  cancelledBookingId: string | null;
  takenBookingId: string | null;
  dismissIncomingBooking: () => void;
  clearCancelledBooking: () => void;
  clearTakenBooking: () => void;
  simulateIncomingBooking: (data: IncomingBooking) => void;
  emitLocationUpdate: (bookingId: string, lat: number, lng: number) => void;
  markBookingDead: (bookingId: string) => void;
  isBookingDead: (bookingId: string) => boolean;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  incomingBooking: null,
  cancelledBookingId: null,
  takenBookingId: null,
  dismissIncomingBooking: () => {},
  clearCancelledBooking: () => {},
  clearTakenBooking: () => {},
  simulateIncomingBooking: () => {},
  emitLocationUpdate: () => {},
  markBookingDead: () => {},
  isBookingDead: () => false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const gpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // A queue of incoming requests, not a single slot. Two bookings arriving within
  // seconds used to overwrite each other (only the latest survived); now each
  // lines up and is handled independently (bug #7). The overlay always shows the
  // head of the queue.
  const [incomingQueue, setIncomingQueue] = useState<IncomingBooking[]>([]);
  const incomingBooking = incomingQueue[0] ?? null;
  const [cancelledBookingId, setCancelledBookingId] = useState<string | null>(null);
  const [takenBookingId, setTakenBookingId] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  const { token, agent, updateAgent } = useAuth();

  // Always-fresh agent id for socket handlers (registered once, so a plain closure
  // over `agent` would go stale). Used to ignore our OWN BOOKING_TAKEN echo.
  const agentIdRef = useRef<string | null>(agent?.id ?? null);
  useEffect(() => { agentIdRef.current = agent?.id ?? null; }, [agent?.id]);

  // Bookings that are done for this agent — expired, declined, taken by someone
  // else, or cancelled. Once dead, a booking must never reappear (bug #10), even
  // if the server re-broadcasts NEW_BOOKING_AVAILABLE or getAvailableBookings
  // still returns it briefly. Both the popup queue and the browse list filter it.
  const deadBookingIdsRef = useRef<Set<string>>(new Set());
  const markBookingDead = useCallback((bookingId: string) => {
    if (bookingId) deadBookingIdsRef.current.add(bookingId);
  }, []);
  const isBookingDead = useCallback((bookingId: string) => deadBookingIdsRef.current.has(bookingId), []);

  // ─── GPS Location Update ───────────────────────────────────────────────
  const pushLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[GPS] Permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      console.log('[GPS] Sending coordinates:', loc.coords.longitude, loc.coords.latitude);
      const res = await apiClient.patch('/agents/location', {
        coordinates: [loc.coords.longitude, loc.coords.latitude],
      });
      console.log('[GPS] Location updated ✓', res.status);
    } catch (err: any) {
      console.log('[GPS] FAILED — status:', err?.response?.status, '| message:', err?.message, '| data:', JSON.stringify(err?.response?.data));
    }
  }, []);

  const startGpsTimer = useCallback(() => {
    pushLocation(); // immediate first push
    gpsTimerRef.current = setInterval(pushLocation, GPS_INTERVAL_MS);
  }, [pushLocation]);

  const stopGpsTimer = useCallback(() => {
    if (gpsTimerRef.current) {
      clearInterval(gpsTimerRef.current);
      gpsTimerRef.current = null;
    }
  }, []);

  // ─── Socket Connect ────────────────────────────────────────────────────
  // token is in deps to avoid stale closure — always uses the latest token value
  const connectSocket = useCallback(async () => {
    // Cancel any pending delayed disconnect (from StrictMode cleanup)
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    // Already connected — don't disconnect and reconnect unnecessarily
    if (socketRef.current?.connected) {
      console.log('[Socket] Already connected, skipping reconnect');
      return;
    }

    const activeToken = token || await AsyncStorage.getItem('agentToken');
    console.log('[Socket] connectSocket called — token from state:', !!token, '| resolved:', !!activeToken);
    if (!activeToken) {
      console.log('[Socket] No token — skipping connection');
      return;
    }

    if (activeToken.split('.').length !== 3) {
      console.log('[Socket] Skipping connection: token is not a valid JWT');
      return;
    }
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Decode JWT to see what _id is inside the token
    try {
      const payload = JSON.parse(atob(activeToken.split('.')[1]));
      console.log('[Socket] JWT payload _id:', payload._id || payload.id || payload.sub);
    } catch (_) {}
    console.log('[Socket] Connecting to', SOCKET_URL);
    const socket = io(SOCKET_URL, {
      auth: { token: activeToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
      startGpsTimer();
    });

    // Debug: log every single event received from server
    socket.onAny((eventName, ...args) => {
      console.log('[Socket] ANY EVENT:', eventName, JSON.stringify(args));
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
      stopGpsTimer();
    });

    socket.on('connect_error', (err: any) => {
      console.log('[Socket] Connection error:', err.message, '| code:', err?.data?.code);
      setIsConnected(false);
      const code = err?.data?.code;
      const isSessionSuperseded = code === 'SESSION_SUPERSEDED';
      const isAuthFailure = isSessionSuperseded
        || code === 'TOKEN_EXPIRED'
        || code === 'TOKEN_INVALID'
        || code === 'TOKEN_BLACKLISTED'
        || err.message?.toLowerCase().includes('token expired')
        || err.message?.toLowerCase().includes('authentication failed');
      if (isAuthFailure) {
        console.log('[Socket] Auth failure — auto logout:', code || err.message);
        socket.disconnect();
        notifySessionInvalid(
          isSessionSuperseded
            ? "You've been logged out because your account was signed in on another device."
            : err.message
        );
      }
    });

    // ── New booking incoming ──
    socket.on('NEW_BOOKING_AVAILABLE', (data: IncomingBooking) => {
      console.log('[Socket] ✅ NEW_BOOKING_AVAILABLE received:', data.bookingId);
      // Never resurrect a request this agent already finished with (expired /
      // declined / taken / cancelled) — the server sometimes re-broadcasts it.
      if (deadBookingIdsRef.current.has(data.bookingId)) {
        console.log('[Socket] Ignoring re-broadcast of dead booking:', data.bookingId);
        return;
      }
      Vibration.vibrate([0, 400, 200, 400]);
      // Append (don't replace) so a second request doesn't wipe the first, and
      // dedupe in case the server re-broadcasts the same booking.
      setIncomingQueue((prev) => prev.some((b) => b.bookingId === data.bookingId) ? prev : [...prev, data]);
      addNotification({
        type: 'NEW_BOOKING',
        title: 'New Pickup Request 🚛',
        message: data.message || 'A new pickup request is available near you.',
        bookingId: data.bookingId,
      });
    });

    // ── Another agent accepted → dismiss popup ──
    socket.on('BOOKING_TAKEN', (data: { bookingId: string; message?: string; acceptedByAgentId?: string; agentId?: string; acceptedBy?: string }) => {
      console.log('[Socket] BOOKING_TAKEN:', data.bookingId);

      // The server broadcasts BOOKING_TAKEN to every nearby agent — INCLUDING the
      // one who just accepted. That agent must NOT be told their own pickup was
      // "taken by another agent". Detect our own echo and stay silent for it (we
      // still drop it from the browse list, since it's now our active job).
      const acceptorId = data.acceptedByAgentId || data.agentId || data.acceptedBy || null;
      const takenByMe = !!acceptorId && !!agentIdRef.current && acceptorId === agentIdRef.current;

      // Taken by someone else → dead, must never reappear. (If I took it, it's my
      // active job now, not a dead browse-list entry, so don't blacklist it.)
      if (!takenByMe) deadBookingIdsRef.current.add(data.bookingId);

      setIncomingQueue((prev) => {
        // Only alert if the taken booking is the one currently on screen (the head)
        // — a queued-but-not-yet-shown one just drops silently.
        const wasShowing = prev[0]?.bookingId === data.bookingId;
        if (wasShowing && !takenByMe) Alert.alert('Job taken', 'This pickup was just accepted by another agent.', [{ text: 'OK' }]);
        return prev.filter((b) => b.bookingId !== data.bookingId);
      });
      // Every agent in the service area can now see the same available jobs,
      // so removing a taken booking from the browse list (not just the popup)
      // matters a lot more than it used to.
      setTakenBookingId(data.bookingId);
      if (!takenByMe) {
        addNotification({
          type: 'BOOKING_TAKEN',
          title: 'Pickup Taken',
          message: 'Another agent accepted this pickup request.',
          bookingId: data.bookingId,
        });
      }
    });

    // ── New rating received from user ──
    socket.on('NEW_RATING_RECEIVED', (data: any) => {
      // Backend may send newAvgRating or avgRating or rating
      const newRating = data.newAvgRating ?? data.avgRating ?? data.rating;
      console.log('[Socket] NEW_RATING_RECEIVED — new avg:', newRating);
      if (newRating !== undefined) {
        updateAgent({ rating: newRating, totalRatings: data.totalRatings });
      }
      addNotification({
        type: 'NEW_RATING',
        title: 'New rating received ⭐',
        message: data.message || `Your new average rating is ${Number(newRating)?.toFixed(1)}`,
      });
    });

    // ── Streak updated after a completed pickup ──
    socket.on('STREAK_UPDATED', (data: { currentStreak: number; longestStreak: number }) => {
      console.log('[Socket] STREAK_UPDATED —', data.currentStreak, 'days');
      updateAgent({ currentStreak: data.currentStreak, longestStreak: data.longestStreak });
    });

    // ── Booking cancelled by user ──
    socket.on('BOOKING_CANCELLED', (data: { bookingId: string; message: string }) => {
      setCancelledBookingId(data.bookingId);
      deadBookingIdsRef.current.add(data.bookingId);
      // Drop this booking from the incoming queue wherever it is (shown or queued).
      setIncomingQueue((prev) => prev.filter((b) => b.bookingId !== data.bookingId));
      addNotification({
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled ❌',
        message: data.message || 'The user has cancelled this booking.',
        bookingId: data.bookingId,
      });
    });
  }, [token, startGpsTimer, stopGpsTimer]);

  // ─── Disconnect ────────────────────────────────────────────────────────
  const disconnectSocket = useCallback(() => {
    stopGpsTimer();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, [stopGpsTimer]);

  // ─── Lifecycle: reconnect whenever token changes (login/logout) ───────
  useEffect(() => {
    if (!token) {
      console.log('[Socket] No token — disconnecting');
      disconnectSocket();
      return;
    }
    connectSocket();
    return () => {
      // Delay disconnect so StrictMode double-invoke doesn't create a gap
      // where the server briefly sees the agent as offline and misses events.
      disconnectTimerRef.current = setTimeout(() => disconnectSocket(), 300);
    };
  }, [token]);

  const dismissIncomingBooking = useCallback(() => {
    // Drop only the head — the next queued request (if any) becomes visible.
    setIncomingQueue((prev) => prev.slice(1));
  }, []);

  const clearCancelledBooking = useCallback(() => {
    setCancelledBookingId(null);
  }, []);

  const clearTakenBooking = useCallback(() => {
    setTakenBookingId(null);
  }, []);

  const simulateIncomingBooking = useCallback((data: IncomingBooking) => {
    Vibration.vibrate([0, 400, 200, 400]);
    setIncomingQueue((prev) => prev.some((b) => b.bookingId === data.bookingId) ? prev : [...prev, data]);
  }, []);

  const emitLocationUpdate = useCallback((bookingId: string, lat: number, lng: number) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('agent:location-update', { bookingId, lat, lng });
  }, []);

  return (
    <SocketContext.Provider value={{ isConnected, incomingBooking, cancelledBookingId, takenBookingId, dismissIncomingBooking, clearCancelledBooking, clearTakenBooking, simulateIncomingBooking, emitLocationUpdate, markBookingDead, isBookingDead }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
