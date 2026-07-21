import apiClient from '../api/apiClient';

export interface BookingItem {
  category: string;
  subCategory: string;
  quantity: number;
}

export const bookingService = {
  /**
   * Fetch all available bookings in the queue.
   * GET /bookings/available
   */
  getAvailableBookings: async () => {
    try {
      const response = await apiClient.get('/bookings/available');
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to fetch available queue');
      }
      throw new Error(error.message || 'Network error fetching available queue');
    }
  },

  /**
   * Fetch jobs currently assigned to the active agent.
   * GET /bookings/agent-jobs
   */
  getAgentJobs: async () => {
    try {
      const response = await apiClient.get('/bookings/agent-jobs');
      return response.data;
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
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to accept booking');
      }
      throw new Error(error.message || 'Network error accepting booking');
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
