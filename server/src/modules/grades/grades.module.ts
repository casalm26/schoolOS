import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentsModule } from '../assignments/assignments.module';
import { Assignment, AssignmentSchema } from '../assignments/schemas/assignment.schema';
import { Enrollment, EnrollmentSchema } from '../classes/schemas/enrollment.schema';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClassEntity, ClassSchema } from '../classes/schemas/class.schema';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { Grade, GradeSchema } from './schemas/grade.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Grade.name, schema: GradeSchema },
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: ClassEntity.name, schema: ClassSchema },
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
