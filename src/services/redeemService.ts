import apiClient from '../api/apiClient';

export interface RedeemRequestInput {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  coinsToRedeem: number;
}

export interface RedeemHistoryItem {
  _id: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  coinsRedeemed: number;
  amountInRupees: number;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  rejectionReason?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const redeemService = {
  submitRedeem: async (payload: RedeemRequestInput) => {
    try {
      const response = await apiClient.post('/redeem', payload);
      return response.data?.data || response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to submit redeem request');
    }
  },

  getMyHistory: async (): Promise<RedeemHistoryItem[]> => {
    try {
      const response = await apiClient.get('/redeem/my');
      return response.data?.data || response.data || [];
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to fetch redeem history');
    }
  },
};
