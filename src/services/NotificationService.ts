import { NotificationRepository } from '@/repositories/NotificationRepository';

export class NotificationService {
  public static async notifyUser(userId: string, title: string, message: string, type: 'GAME' | 'WALLET' | 'SYSTEM' = 'SYSTEM') {
    return NotificationRepository.create({
      user: userId as any,
      title,
      message,
      type,
      read: false,
    });
  }

  public static async getUserNotifications(userId: string) {
    return NotificationRepository.findByUserId(userId);
  }

  public static async markAllAsRead(userId: string) {
    return NotificationRepository.markAllAsRead(userId);
  }
}
