import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { authService } from '../services/authService';
import { agentService } from '../services/agentService';
import { setSessionInvalidHandler } from '../utils/authEvents';
import { registerDeviceToken, removeDeviceToken, addTokenRotationListener, addNotificationTapListener } from '../utils/notifications';
import { navigationRef } from '../navigation/navRef';

interface AuthState {
  token: string | null;
  agent: any | null;
  isOnline: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleOnlineStatus: () => Promise<void>;
  updateAgent: (patch: Partial<any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [agent, setAgent] = useState<any | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start loading true for session load

  // Load session from AsyncStorage on app launch
  useEffect(() => {
    async function loadSession() {
      try {
        const storedToken = await AsyncStorage.getItem('agentToken');
        const storedAgent = await AsyncStorage.getItem('agentData');
        const storedOnline = await AsyncStorage.getItem('agentOnline');

        if (storedToken && storedAgent) {
          setToken(storedToken);
          setAgent(JSON.parse(storedAgent));
          setIsOnline(storedOnline === 'true');
          // Existing session on app launch — (re)register the push token so this
          // agent keeps receiving pushes (and to backfill agents who never had one).
          registerDeviceToken();
        }
      } catch (error) {
        console.error('Failed to load session from storage:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  // Registered once so apiClient's response interceptor (a plain module, not a
  // component — it can't call useAuth()) can force a logout when the backend
  // reports this session is no longer valid: either a plain expired token, or
  // this device's session having been superseded by a login elsewhere.
  //
  // Guarded with a ref (not state) because several in-flight requests can all
  // 401 around the same moment — e.g. QueueScreen fetches available bookings
  // and agent jobs in parallel — and the socket can also fire connect_error
  // repeatedly across its reconnection attempts. Without this, the user would
  // see the same "logged out" alert stack multiple times.
  const sessionInvalidHandledRef = useRef(false);
  useEffect(() => {
    if (token) sessionInvalidHandledRef.current = false;
  }, [token]);

  // Push wiring (mounted once): re-send the FCM token whenever it rotates, and on a
  // notification tap bring the agent to their home so the (focus-refetched)
  // available/active job lists reflect what they tapped.
  useEffect(() => {
    const rotationSub = addTokenRotationListener();
    const tapSub = addNotificationTapListener(() => {
      if (navigationRef.isReady()) navigationRef.navigate('Main');
    });
    return () => { rotationSub.remove(); tapSub.remove(); };
  }, []);
  useEffect(() => {
    setSessionInvalidHandler(async (message) => {
      if (sessionInvalidHandledRef.current) return;
      sessionInvalidHandledRef.current = true;

      setToken(null);
      setAgent(null);
      setIsOnline(false);
      await AsyncStorage.removeItem('agentToken');
      await AsyncStorage.removeItem('agentData');
      await AsyncStorage.removeItem('agentOnline');

      const isSuperseded = message?.toLowerCase().includes('another device');
      Alert.alert(
        isSuperseded ? 'Logged out' : 'Session expired',
        message || 'Your session has expired. Please log in again.'
      );
    });
  }, []);

  /**
   * Hits the backend login API and saves session state.
   */
  const login = async (phone: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(phone, password);
      if (response?.success && response?.data) {
        const newToken = response.data?.token;
        const rawUser = response.data?.user;

        const agentData = {
          id: rawUser._id,
          agentId: `AGT-${rawUser._id.substring(rawUser._id.length - 4).toUpperCase()}`,
          name: rawUser.name,
          email: rawUser.email,
          phone: rawUser.phone,
          coins: rawUser.coins || 0,
          isFirstTime: response.data.isFirstTime ?? true,
          rating: rawUser.rating || null,
          totalPickups: rawUser.totalPickups || 0,
          currentStreak: rawUser.currentStreak || 0,
          longestStreak: rawUser.longestStreak || 0,
          lastCompletedDate: rawUser.lastCompletedDate || null,
          zone: rawUser.zone || null,
        };

        setToken(newToken);
        setAgent(agentData);
        setIsOnline(true);

        await AsyncStorage.setItem('agentToken', newToken);
        await AsyncStorage.setItem('agentData', JSON.stringify(agentData));
        await AsyncStorage.setItem('agentOnline', 'true');

        // Register the FCM device token now that the agent JWT is stored — this is
        // what lets the agent receive pushes while backgrounded/killed.
        registerDeviceToken();

        // Tell backend agent is available so NEW_BOOKING_AVAILABLE events are emitted
        try {
          await agentService.toggleAvailability(true);
        } catch (_) {
          console.warn('[Auth] Could not set online status on backend after login');
        }
      } else {
        console.log('[Auth] success:false response:', JSON.stringify(response));
        Alert.alert('Login failed', response?.message || 'Invalid credentials. Please try again.');
      }
    } catch (error: any) {
      console.log('[Auth] catch error — status:', error?.response?.status, 'data:', JSON.stringify(error?.response?.data));
      const isNetworkError = !error?.response;

      if (isNetworkError) {
        // Genuine network failure → sandbox mode for offline testing
        console.warn('Network failure — sandbox mode activated:', error.message);

        const agentData = {
          id: '6a00d9ebcbe38dbc991a01e2',
          agentId: 'AGT-01E2',
          name: 'Bhanu Singh',
          email: 'bhanusingh@example.com',
          phone: phone || '9123456777',
          coins: 0, isFirstTime: true, rating: null, totalPickups: 0, currentStreak: 0, longestStreak: 0, lastCompletedDate: null, zone: null,
        };

        setToken(null);
        setAgent(agentData);
        setIsOnline(true);
        await AsyncStorage.setItem('agentData', JSON.stringify(agentData));
        await AsyncStorage.setItem('agentOnline', 'true');

        Alert.alert('No internet connection', 'Server is unreachable. Logging in with offline sandbox credentials.');
      } else {
        // API error (401 wrong pass, 404, 500 etc.) → show real error, stay on login
        const msg = error?.response?.data?.message || 'Invalid credentials. Please try again.';
        Alert.alert('Login failed', msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logs out the user and clears all local storage.
   */
  const logout = async () => {
    // Unregister the push token FIRST — the DELETE request needs the still-stored
    // agent JWT for auth. Otherwise this device keeps getting the agent's pushes.
    await removeDeviceToken();
    setToken(null);
    setAgent(null);
    setIsOnline(false);
    await AsyncStorage.removeItem('agentToken');
    await AsyncStorage.removeItem('agentData');
    await AsyncStorage.removeItem('agentOnline');
  };

  /**
   * Toggles availability status on the backend and updates local states.
   */
  const toggleOnlineStatus = async () => {
    const nextStatus = !isOnline;
    // Update local state instantly for extreme UI responsiveness
    setIsOnline(nextStatus);
    await AsyncStorage.setItem('agentOnline', String(nextStatus));

    try {
      // Hit the real backend API to sync status
      await agentService.toggleAvailability(nextStatus);
    } catch (error) {
      console.warn('Backend toggle failed, synced locally but server not reached:', error);
      // We don't revert to keep on-field UX seamless, or we can revert if strict.
    }
  };

  const updateAgent = async (patch: Partial<any>) => {
    const updated = { ...agent, ...patch };
    setAgent(updated);
    await AsyncStorage.setItem('agentData', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ token, agent, isOnline, isLoading, login, logout, toggleOnlineStatus, updateAgent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
