import { Types } from 'mongoose';
import { Notification, INotification, NotificationType } from '../models/Notification';

export class NotificationService {
  /**
   * Fetch paginated notifications for a recipient user
   */
  public static async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notifications: INotification[];
    unreadCount: number;
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const skip = (page - 1) * limit;
    const recipientObjectId = new Types.ObjectId(userId);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipientId: recipientObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Notification.countDocuments({ recipientId: recipientObjectId }),
      Notification.countDocuments({ recipientId: recipientObjectId, readStatus: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mark a single notification as read
   */
  public static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.updateOne(
      { _id: new Types.ObjectId(notificationId), recipientId: new Types.ObjectId(userId) },
      { $set: { readStatus: true } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  public static async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      { recipientId: new Types.ObjectId(userId), readStatus: false },
      { $set: { readStatus: true } }
    );
    return result.modifiedCount;
  }

  /**
   * Create and send a new notification to a recipient
   */
  public static async createNotification(
    recipientId: string,
    title: string,
    message: string,
    type: NotificationType,
    metadata?: Record<string, unknown>
  ): Promise<INotification> {
    const notification = await Notification.create({
      recipientId: new Types.ObjectId(recipientId),
      title,
      message,
      type,
      readStatus: false,
      metadata,
    });
    return notification;
  }
}
