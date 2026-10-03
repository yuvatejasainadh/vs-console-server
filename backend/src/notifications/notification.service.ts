import { v4 as uuidv4 } from 'uuid';
import { DataStore, NotificationEntity } from '../database/data-store';
import { PaginatedResult, PaginationQuery, AuthenticatedUser } from '../common/types';
import { NotFoundError } from '../common/errors';

export class NotificationService {
  private static instance: NotificationService;
  private store = DataStore.getInstance();

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async notify(
    userId: string,
    title: string,
    message: string,
    type: string,
    data?: Record<string, any>
  ): Promise<NotificationEntity> {
    const notification: NotificationEntity = {
      id: uuidv4(),
      user_id: userId,
      title,
      message,
      type,
      read: false,
      data,
      created_at: new Date().toISOString(),
    };

    this.store.notifications.set(notification.id, notification);
    return notification;
  }

  async list(
    user: AuthenticatedUser,
    query: PaginationQuery & { read?: boolean }
  ): Promise<PaginatedResult<NotificationEntity>> {
    let items = Array.from(this.store.notifications.values()).filter(
      (n) => n.user_id === user.id
    );

    if (query.read !== undefined) {
      items = items.filter((n) => n.read === query.read);
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const pagedData = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: pagedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async markAsRead(user: AuthenticatedUser, id: string): Promise<NotificationEntity> {
    const notification = this.store.notifications.get(id);
    if (!notification || notification.user_id !== user.id) {
      throw new NotFoundError('Notification not found');
    }

    notification.read = true;
    return notification;
  }

  async markAllAsRead(user: AuthenticatedUser): Promise<{ updatedCount: number }> {
    let count = 0;
    for (const notif of this.store.notifications.values()) {
      if (notif.user_id === user.id && !notif.read) {
        notif.read = true;
        count++;
      }
    }
    return { updatedCount: count };
  }
}
