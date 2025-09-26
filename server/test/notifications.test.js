require('ts-node/register/transpile-only');

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { NotificationsService } = require('../src/modules/notifications/notifications.service');
const {
  NotificationStatus,
} = require('../src/modules/notifications/schemas/notification.schema');

describe('NotificationsService', () => {
  it('queues grade release notifications and marks them as sent', async () => {
    const savedPayloads = [];

    class FakeNotificationModel {
      constructor(payload) {
        Object.assign(this, payload);
      }

      async save() {
        savedPayloads.push({
          userId: this.userId,
          type: this.type,
          status: this.status,
          payload: this.payload,
        });
        return this;
      }

      toJSON() {
        return {
          userId: this.userId,
          type: this.type,
          status: this.status,
          payload: this.payload,
        };
      }
    }

    const service = new NotificationsService(FakeNotificationModel);

    const result = await service.notifyGradeRelease({
      studentId: 'student123',
      assignmentTitle: 'Project 1',
      classId: 'class123',
      score: 95,
      letterGrade: 'A',
    });

    assert.equal(savedPayloads.length >= 2, true);
    const lastSave = savedPayloads.at(-1);
    assert.equal(lastSave.status, NotificationStatus.Sent);
    assert.deepEqual(result.payload.assignmentTitle, 'Project 1');
  });
});
