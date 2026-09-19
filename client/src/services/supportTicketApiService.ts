import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5000/api';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface CreateTicketPayload {
  requestType?: 'IDENTITY_CHANGE' | 'GENERAL_SUPPORT' | 'GARAGE_CHANGE' | 'ACCOUNT_INQUIRY';
  requestedField: 'name' | 'dateOfBirth' | 'nidNumber' | 'address' | 'other';
  proposedValue: string;
  reason: string;
  supportingDocumentRef?: string;
}

export const supportTicketApiService = {
  createTicket: async (payload: CreateTicketPayload) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/support-tickets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to submit support ticket.' };
    }
  },

  getMyTickets: async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/support-tickets/my-tickets`, {
        method: 'GET',
        headers,
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch tickets.' };
    }
  },

  getAdminTickets: async (query?: { status?: string; requestType?: string; search?: string; page?: number; limit?: number }) => {
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (query?.status) params.append('status', query.status);
      if (query?.requestType) params.append('requestType', query.requestType);
      if (query?.search) params.append('search', query.search);
      if (query?.page) params.append('page', String(query.page));
      if (query?.limit) params.append('limit', String(query.limit));

      const res = await fetch(`${API_BASE_URL}/support-tickets/admin/all?${params.toString()}`, {
        method: 'GET',
        headers,
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch admin support tickets queue.' };
    }
  },

  resolveTicket: async (ticketId: string, action: 'APPROVE' | 'REJECT', resolutionReason?: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/support-tickets/admin/${ticketId}/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, resolutionReason }),
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to resolve support ticket.' };
    }
  },
};
