import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentsModule } from '../assignments/assignments.module';
import { Assignment, AssignmentSchema } from '../assignments/schemas/assignment.schema';
import { Enrollment, EnrollmentSchema } from '../classes/schemas/enrollment.schema';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { Grade, GradeSchema } from './schemas/grade.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Grade.name, schema: GradeSchema },
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
    AssignmentsModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}
