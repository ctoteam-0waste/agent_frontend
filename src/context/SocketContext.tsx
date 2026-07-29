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
  dismissIncomingBooking: () => void;
  clearCancelledBooking: () => void;
  simulateIncomingBooking: (data: IncomingBooking) => void;
  emitLocationUpdate: (bookingId: string, lat: number, lng: number) => void;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  incomingBooking: null,
  cancelledBookingId: null,
  dismissIncomingBooking: () => {},
  clearCancelledBooking: () => {},
  simulateIncomingBooking: () => {},
  emitLocationUpdate: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const gpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingBooking, setIncomingBooking] = useState<IncomingBooking | null>(null);
  const [cancelledBookingId, setCancelledBookingId] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  const { token, updateAgent, logout } = useAuth();

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

    socket.on('connect_error', (err) => {
      console.log('[Socket] Connection error:', err.message);
      setIsConnected(false);
      if (err.message?.toLowerCase().includes('token expired') || err.message?.toLowerCase().includes('authentication failed')) {
        console.log('[Socket] Token expired — auto logout');
        socket.disconnect();
        logout();
        Alert.alert('Session expired', 'Your session has expired. Please log in again.');
      }
    });

    // ── New booking incoming ──
    socket.on('NEW_BOOKING_AVAILABLE', (data: IncomingBooking) => {
      console.log('[Socket] ✅ NEW_BOOKING_AVAILABLE received:', data.bookingId);
      Vibration.vibrate([0, 400, 200, 400]);
      setIncomingBooking(data);
      addNotification({
        type: 'NEW_BOOKING',
        title: 'New Pickup Request 🚛',
        message: data.message || 'A new pickup request is available near you.',
        bookingId: data.bookingId,
      });
    });

    // ── Another agent accepted → dismiss popup ──
    socket.on('BOOKING_TAKEN', (data: { bookingId: string; message: string }) => {
      console.log('[Socket] BOOKING_TAKEN:', data.bookingId);
      setIncomingBooking((prev) => {
        if (prev?.bookingId === data.bookingId) {
          Alert.alert('Job taken', 'This pickup was just accepted by another agent.', [{ text: 'OK' }]);
          return null;
        }
        return prev;
      });
      addNotification({
        type: 'BOOKING_TAKEN',
        title: 'Pickup Taken',
        message: 'Another agent accepted this pickup request.',
        bookingId: data.bookingId,
      });
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
      // Also dismiss popup if this booking was showing
      setIncomingBooking(prev => {
        if (prev?.bookingId === data.bookingId) return null;
        return prev;
      });
      addNotification({
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled ❌',
        message: data.message || 'The user has cancelled this booking.',
        bookingId: data.bookingId,
      });
    });
  }, [token, startGpsTimer, stopGpsTimer, logout]);

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
    setIncomingBooking(null);
  }, []);

  const clearCancelledBooking = useCallback(() => {
    setCancelledBookingId(null);
  }, []);

  const simulateIncomingBooking = useCallback((data: IncomingBooking) => {
    Vibration.vibrate([0, 400, 200, 400]);
    setIncomingBooking(data);
  }, []);

  const emitLocationUpdate = useCallback((bookingId: string, lat: number, lng: number) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('agent:location-update', { bookingId, lat, lng });
  }, []);

  return (
    <SocketContext.Provider value={{ isConnected, incomingBooking, cancelledBookingId, dismissIncomingBooking, clearCancelledBooking, simulateIncomingBooking, emitLocationUpdate }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
