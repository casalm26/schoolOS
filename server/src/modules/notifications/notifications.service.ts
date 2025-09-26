import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationChannel, NotificationDocument, NotificationStatus } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async queueNotification(params: {
    userId: string;
    type: string;
    payload: Record<string, unknown>;
    channel?: NotificationChannel;
  }) {
    const notification = new this.notificationModel({
      userId: params.userId,
      type: params.type,
      payload: params.payload,
      channel: params.channel ?? NotificationChannel.Email,
      status: NotificationStatus.Pending,
    });
    await notification.save();

    // Simulate immediate delivery for MVP
    this.logger.log(
      `Notification queued for user ${params.userId} [${params.type}]: ${JSON.stringify(params.payload)}`,
    );

    notification.status = NotificationStatus.Sent;
    notification.sentAt = new Date();
    await notification.save();

    return notification.toJSON();
  }

  async notifyGradeRelease(options: {
    studentId: string;
    assignmentTitle: string;
    classId: string;
    score?: number | null;
    letterGrade?: string | null;
  }) {
    return this.queueNotification({
      userId: options.studentId,
      type: 'grade_released',
      payload: {
        assignmentTitle: options.assignmentTitle,
        classId: options.classId,
        score: options.score ?? null,
        letterGrade: options.letterGrade ?? null,
      },
    });
  }
}
