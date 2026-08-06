import apiClient from '../api/apiClient';

// Server-persisted notification history. apiClient's baseURL already ends in
// /api/v1, so these relative paths resolve to /api/v1/notifications*.
export const notificationService = {
  // Paginated history, newest first, plus data.unreadCount for the badge.
  getNotifications: async (page = 1, limit = 20) => {
    const res = await apiClient.get('/notifications', { params: { page, limit } });
    return res.data?.data || res.data;
  },

  markRead: async (id: string) => {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async () => {
    const res = await apiClient.patch('/notifications/read-all');
    return res.data;
  },
};
