import apiClient from '../api/apiClient';

// Live catalogue (same source the User app's booking screen uses) — powers the
// verify screen's "Add Item" picker. Read-only + cacheable; fetch once per open.
export const catalogueService = {
  getCatalogue: async () => {
    const res = await apiClient.get('/catalogue');
    return res.data?.data || res.data || [];
  },
};
