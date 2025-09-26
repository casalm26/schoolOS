import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { AssignmentsService } from '../assignments/assignments.service';
import { Assignment, AssignmentDocument } from '../assignments/schemas/assignment.schema';
import { Enrollment, EnrollmentDocument } from '../classes/schemas/enrollment.schema';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReleaseGradeDto } from './dto/release-grade.dto';
import { UpsertGradeDto } from './dto/upsert-grade.dto';
import { Grade, GradeDocument, GradeStatus } from './schemas/grade.schema';

@Injectable()
export class GradesService {
  constructor(
    @InjectModel(Grade.name)
    private readonly gradeModel: Model<GradeDocument>,
    @InjectModel(Assignment.name)
    private readonly assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<EnrollmentDocument>,
    private readonly assignmentsService: AssignmentsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async upsertGrade(assignmentId: string, dto: UpsertGradeDto & { actorId?: string }) {
    const assignment = await this.assignmentsService.findById(assignmentId);
    await this.usersService.findById(dto.studentId);

    const enrollment = await this.enrollmentModel
      .findOne({ classId: assignment.classId, studentId: dto.studentId })
      .lean()
      .exec();
    if (!enrollment) {
      throw new NotFoundException('Student is not enrolled in this class');
    }

    const status = dto.status ?? GradeStatus.Draft;
    const now = new Date();

    const grade = await this.gradeModel
      .findOneAndUpdate(
        { assignmentId, studentId: dto.studentId },
        {
          $set: {
            score: dto.score ?? null,
            letterGrade: dto.letterGrade ?? null,
            feedback: dto.feedback ?? '',
            status,
          },
          $setOnInsert: { assignmentId, studentId: dto.studentId },
          $push: {
            history: {
              status,
              score: dto.score ?? null,
              letterGrade: dto.letterGrade ?? null,
              feedback: dto.feedback ?? '',
              actorId: dto.actorId ?? null,
              changedAt: now,
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean()
      .exec();

    return grade;
  }

  async listGradesForAssignment(assignmentId: string) {
    await this.assignmentsService.findById(assignmentId);
    const grades = await this.gradeModel.find({ assignmentId }).lean().exec();
    if (!grades.length) {
      return [];
    }

    const studentIds = Array.from(
      new Set(grades.map((grade) => grade.studentId.toString())),
    );
    const students = await this.usersService.findManyByIds(studentIds);
    const studentsById = new Map(students.map((student) => [student._id.toString(), student]));

    return grades.map((grade) => ({
      ...grade,
      student: studentsById.get(grade.studentId.toString()) ?? null,
    }));
  }

  async listGradesForStudent(studentId: string) {
    await this.usersService.findById(studentId);
    return this.gradeModel.find({ studentId }).lean().exec();
  }

  async releaseGrade(gradeId: string, dto: ReleaseGradeDto & { actorId?: string }) {
    if (!isValidObjectId(gradeId)) {
      throw new NotFoundException('Grade not found');
    }

    const grade = await this.gradeModel.findById(gradeId).exec();
    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    const releaseAt = dto.releaseAt ? new Date(dto.releaseAt) : new Date();
    grade.status = GradeStatus.Released;
    grade.releasedAt = releaseAt;
    if (dto.feedback !== undefined) {
      grade.feedback = dto.feedback;
    }
    grade.history.push({
      status: GradeStatus.Released,
      score: grade.score ?? null,
      letterGrade: grade.letterGrade ?? null,
      feedback: dto.feedback ?? grade.feedback ?? '',
      actorId: dto.actorId ?? null,
      changedAt: releaseAt,
    });

    await grade.save();
    const assignment = await this.assignmentModel.findById(grade.assignmentId).lean().exec();
    if (assignment) {
      await this.notificationsService.notifyGradeRelease({
        studentId: grade.studentId.toString(),
        assignmentTitle: assignment.title,
        classId: assignment.classId.toString(),
        score: grade.score ?? null,
        letterGrade: grade.letterGrade ?? null,
      });
    }

    return grade.toObject();
  }

  async getStudentAssignmentOverview(studentId: string) {
    await this.usersService.findById(studentId);

    const enrollments = await this.enrollmentModel
      .find({ studentId })
      .lean()
      .exec();

    if (enrollments.length === 0) {
      return [];
    }

    const classIds = enrollments.map((enrollment) => enrollment.classId);

    const assignments = await this.assignmentModel
      .find({ classId: { $in: classIds } })
      .lean()
      .exec();

    if (assignments.length === 0) {
      return [];
    }

    const assignmentIds = assignments.map((assignment) => assignment._id);

    const grades = await this.gradeModel
      .find({ assignmentId: { $in: assignmentIds }, studentId })
      .lean()
      .exec();

    const gradeMap = new Map<string, any>();
    grades.forEach((grade) => {
      gradeMap.set(String(grade.assignmentId), grade);
    });

    return assignments
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
      .map((assignment) => {
        const grade = gradeMap.get(String(assignment._id)) ?? null;
        return {
          assignmentId: String(assignment._id),
          classId: String(assignment.classId),
          title: assignment.title,
          description: assignment.description,
          dueAt: assignment.dueAt,
          publishAt: assignment.publishAt,
          gradingSchema: assignment.gradingSchema,
          maxPoints: assignment.maxPoints,
          status: grade ? grade.status : GradeStatus.Pending,
          grade,
        };
      });
  }
}
