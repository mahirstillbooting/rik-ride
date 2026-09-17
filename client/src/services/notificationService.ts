import { AuthStorage } from '../context/AuthStorage';
import { env } from '../config/env';

export interface AppNotification {
  _id: string;
  recipientId: string;
  title: string;
  message: string;
  type: 'RIDE_UPDATE' | 'GARAGE_UPDATE' | 'SAFETY_ALERT' | 'SYSTEM';
  readStatus: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface NotificationFeedResponse {
  success: boolean;
  notifications?: AppNotification[];
  unreadCount?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
}

class ClientNotificationService {
  private async getHeaders(): Promise<Record<string, string>> {
    const token = await AuthStorage.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Fetch paginated notifications for current user
   */
  async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationFeedResponse> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${env.apiUrl}/api/notifications?page=${page}&limit=${limit}`, {
        headers,
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to fetch notifications' };
    }
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${env.apiUrl}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers,
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to mark notification read' };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ success: boolean; modifiedCount?: number; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${env.apiUrl}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to mark all notifications read' };
    }
  }
}

export const clientNotificationService = new ClientNotificationService();
