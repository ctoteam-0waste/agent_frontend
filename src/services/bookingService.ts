import apiClient from '../api/apiClient';

export interface BookingItem {
  category: string;
  subCategory: string;
  quantity: number;
}

// The list endpoints have answered both `{ data: [...] }` and a paginated
// `{ data: { items: [...] } }` (agent-jobs from 23 Sep). Reading only the first shape
// made every list come back empty, so accepted jobs vanished from the queue.
function listFrom(body: any): any[] {
  const data = body?.data ?? body;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export const bookingService = {
  /**
   * Fetch all available bookings in the queue.
   * GET /bookings/available
   * Returns the list itself, whichever response shape the server sends.
   */
  getAvailableBookings: async () => {
    try {
      const response = await apiClient.get('/bookings/available');
      return listFrom(response.data);
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to fetch available queue');
      }
      throw new Error(error.message || 'Network error fetching available queue');
    }
  },

  /**
   * Fetch jobs for the active agent.
   * GET /bookings/agent-jobs[?view=active|completed|cancelled]
   * Omitting `view` returns every booking (any status), paginated.
   * Returns the list itself, whichever response shape the server sends.
   */
  getAgentJobs: async (view?: 'active' | 'completed' | 'cancelled') => {
    try {
      const response = await apiClient.get('/bookings/agent-jobs', view ? { params: { view } } : undefined);
      return listFrom(response.data);
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to fetch assigned jobs');
      }
      throw new Error(error.message || 'Network error fetching assigned jobs');
    }
  },

  /**
   * Fetch full details of one specific booking by its ID.
   * GET /bookings/:id
   */
  getBookingDetails: async (id: string) => {
    try {
      const response = await apiClient.get(`/bookings/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to fetch booking details');
      }
      throw new Error(error.message || 'Network error fetching booking details');
    }
  },

  /**
   * Accept an available booking.
   * PATCH /bookings/:id/accept
   */
  acceptBooking: async (id: string) => {
    try {
      const response = await apiClient.patch(`/bookings/${id}/accept`);
      return response.data;
    } catch (error: any) {
      // Keep error.response intact (callers need the status code to tell a
      // real "already taken" 400 apart from a connectivity failure).
      if (error.response && error.response.data) {
        error.message = error.response.data.message || 'Failed to accept booking';
      }
      throw error;
    }
  },

  /**
   * Decline a booking before acceptance.
   * PATCH /bookings/:id/decline
   */
  declineBooking: async (id: string) => {
    try {
      const response = await apiClient.patch(`/bookings/${id}/decline`);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to decline booking');
      }
      throw new Error(error.message || 'Network error declining booking');
    }
  },

  /**
   * Mark that the agent has reached the user's location.
   * PATCH /bookings/:id/reach
   */
  markReached: async (id: string) => {
    try {
      const response = await apiClient.patch(`/bookings/${id}/reach`);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to mark reached state');
      }
      throw new Error(error.message || 'Network error marking reached state');
    }
  },

  /**
   * Verify and weigh items at the user's location.
   * PATCH /bookings/:id/verify
   * body: { items: [{ category, subCategory, quantity }] }
   */
  verifyBooking: async (id: string, items: BookingItem[]) => {
    try {
      const response = await apiClient.patch(`/bookings/${id}/verify`, { items });
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to verify booking items');
      }
      throw new Error(error.message || 'Network error verifying booking items');
    }
  },

  /**
   * Complete the booking at the warehouse.
   * PATCH /bookings/:id/complete
   */
  completeBooking: async (id: string) => {
    try {
      const response = await apiClient.patch(`/bookings/${id}/complete`);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to complete booking');
      }
      throw new Error(error.message || 'Network error completing booking');
    }
  },
};
