import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/notificationService';

const STORAGE_KEY = 'agent_notifications';
const MAX_NOTIFICATIONS = 200;
const PAGE_SIZE = 20;

export interface AgentNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  bookingId?: string;
  serverId?: string; // present when this item came from server history
}

interface NotificationContextType {
  notifications: AgentNotification[];
  unreadCount: number;
  hasMore: boolean;
  loadingNotifs: boolean;
  addNotification: (n: Omit<AgentNotification, 'id' | 'timestamp' | 'read'>) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  hasMore: false,
  loadingNotifs: false,
  addNotification: () => {},
  refresh: async () => {},
  loadMore: async () => {},
  markRead: () => {},
  markAllRead: () => {},
  clearAll: () => {},
});

// Server items carry only `event` + `data` — derive a display type/title the same
// way the live socket toasts do, so one list renders both.
const EVENT_TYPE: Record<string, string> = {
  NEW_BOOKING_AVAILABLE: 'NEW_BOOKING',
  BOOKING_ACCEPTED_CONFIRMATION: 'ACCEPTED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  NEW_RATING_RECEIVED: 'NEW_RATING',
  BOOKING_TAKEN: 'BOOKING_TAKEN',
  STREAK_UPDATED: 'STREAK_UPDATED',
};
const EVENT_TITLE: Record<string, string> = {
  NEW_BOOKING_AVAILABLE: 'New pickup available',
  BOOKING_ACCEPTED_CONFIRMATION: 'Pickup accepted',
  BOOKING_CANCELLED: 'Booking cancelled',
  NEW_RATING_RECEIVED: 'New rating received',
  BOOKING_TAKEN: 'Pickup taken',
  STREAK_UPDATED: 'Streak updated',
};

function mapServer(item: any): AgentNotification {
  const event = item?.event || '';
  return {
    id: item._id,
    serverId: item._id,
    type: EVENT_TYPE[event] || event || 'OTHER',
    title: EVENT_TITLE[event] || 'Notification',
    message: item?.data?.message || '',
    timestamp: item?.createdAt || new Date().toISOString(),
    read: !!item?.read,
    bookingId: item?.data?.bookingId,
  };
}

const sortDesc = (a: AgentNotification, b: AgentNotification) =>
  (b.timestamp > a.timestamp ? 1 : b.timestamp < a.timestamp ? -1 : 0);

// Combine live/local items with a freshly-fetched server page. Server is the source
// of truth for anything it persists, so a local live item is dropped once its server
// twin (same type + bookingId) arrives — but socket-only events (BOOKING_TAKEN /
// STREAK_UPDATED, never persisted) are kept so they don't vanish on refresh.
function mergeServer(prev: AgentNotification[], serverItems: AgentNotification[]): AgentNotification[] {
  const srvKeys = new Set(serverItems.map((s) => `${s.type}|${s.bookingId || ''}`));
  const localKept = prev.filter((n) => !n.serverId && !srvKeys.has(`${n.type}|${n.bookingId || ''}`));
  const byId = new Map<string, AgentNotification>();
  [...serverItems, ...localKept].forEach((n) => byId.set(n.id, n));
  return Array.from(byId.values()).sort(sortDesc).slice(0, MAX_NOTIFICATIONS);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Offline cache — show something instantly, then reconcile with the server.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const cached: AgentNotification[] = JSON.parse(raw);
          setNotifications(cached);
          setUnreadCount(cached.filter((n) => !n.read).length);
        } catch (_) {}
      }
    });
  }, []);

  const persist = useCallback((list: AgentNotification[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_NOTIFICATIONS))).catch(() => {});
  }, []);

  // Fetch page 1 from the server: reconciles the badge and pulls in any events
  // missed while the app was closed. Silently no-ops when logged out/offline.
  const refresh = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const d = await notificationService.getNotifications(1, PAGE_SIZE);
      const items = (d?.items || []).map(mapServer);
      setPage(1);
      setTotal(d?.total ?? items.length);
      setHasMore(items.length < (d?.total ?? items.length));
      setUnreadCount(d?.unreadCount ?? 0);
      setNotifications((prev) => {
        const merged = mergeServer(prev, items);
        persist(merged);
        return merged;
      });
    } catch (_) {
      // offline / not authed — keep the cached list
    } finally {
      setLoadingNotifs(false);
    }
  }, [persist]);

  const loadMore = useCallback(async () => {
    if (loadingNotifs || !hasMore) return;
    setLoadingNotifs(true);
    try {
      const next = page + 1;
      const d = await notificationService.getNotifications(next, PAGE_SIZE);
      const items = (d?.items || []).map(mapServer);
      setPage(next);
      const newTotal = d?.total ?? total;
      setTotal(newTotal);
      setNotifications((prev) => {
        const byId = new Map<string, AgentNotification>();
        [...prev, ...items].forEach((n) => byId.set(n.id, n));
        const merged = Array.from(byId.values()).sort(sortDesc).slice(0, MAX_NOTIFICATIONS);
        setHasMore(merged.filter((n) => n.serverId).length < newTotal);
        persist(merged);
        return merged;
      });
    } catch (_) {
    } finally {
      setLoadingNotifs(false);
    }
  }, [loadingNotifs, hasMore, page, total, persist]);

  // Live socket toast → prepend locally and bump the badge (reconciled on next refresh).
  const addNotification = useCallback((n: Omit<AgentNotification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications((prev) => {
      const item: AgentNotification = {
        ...n,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      const updated = [item, ...prev].slice(0, MAX_NOTIFICATIONS);
      persist(updated);
      return updated;
    });
    setUnreadCount((c) => c + 1);
  }, [persist]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const item = prev.find((n) => n.id === id);
      if (item && !item.read) setUnreadCount((c) => Math.max(0, c - 1));
      if (item?.serverId) notificationService.markRead(item.serverId).catch(() => {});
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      persist(updated);
      return updated;
    });
  }, [persist]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      persist(updated);
      return updated;
    });
    setUnreadCount(0);
    notificationService.markAllRead().catch(() => {});
  }, [persist]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([])).catch(() => {});
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, hasMore, loadingNotifs, addNotification, refresh, loadMore, markRead, markAllRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
