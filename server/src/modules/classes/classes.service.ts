import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { ProgrammesService } from '../programmes/programmes.service';
import { UsersService } from '../users/users.service';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { ClassEntity, ClassDocument } from './schemas/class.schema';
import {
  Enrollment,
  EnrollmentDocument,
  EnrollmentStatus,
} from './schemas/enrollment.schema';

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(ClassEntity.name)
    private readonly classModel: Model<ClassDocument>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<EnrollmentDocument>,
    private readonly programmesService: ProgrammesService,
    private readonly usersService: UsersService,
  ) {}

  async createClass(dto: CreateClassDto) {
    await this.programmesService.findCohortById(dto.cohortId);

    const instructors = await this.usersService.findManyByIds(dto.instructorIds);
    if (instructors.length !== dto.instructorIds.length) {
      throw new NotFoundException('One or more instructors not found');
    }

    try {
      const created = new this.classModel(dto);
      await created.save();
      return created.toObject();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException('Class code must be unique');
      }
      throw error;
    }
  }

  async listClasses(filters: { cohortId?: string; instructorId?: string } = {}) {
    const query: Record<string, any> = {};
    if (filters.cohortId) {
      query.cohortId = filters.cohortId;
    }
    if (filters.instructorId) {
      query.instructorIds = filters.instructorId;
    }
    return this.classModel.find(query).sort({ title: 1 }).lean().exec();
  }

  async getClassById(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Class not found');
    }
    const record = await this.classModel.findById(id).lean().exec();
    if (!record) {
      throw new NotFoundException('Class not found');
    }
    return record;
  }

  async ensureInstructorAccess(classId: string, instructorId: string) {
    const classRecord = await this.getClassById(classId);
    const instructorIds = (classRecord.instructorIds ?? []).map((id: any) =>
      typeof id === 'string' ? id : id.toString(),
    );
    if (!instructorIds.includes(instructorId)) {
      throw new ForbiddenException('You are not assigned to this class');
    }
    return classRecord;
  }

  async enrollStudent(
    classId: string,
    dto: EnrollStudentDto,
    options: { restrictToInstructorId?: string } = {},
  ) {
    if (options.restrictToInstructorId) {
      await this.ensureInstructorAccess(classId, options.restrictToInstructorId);
    } else {
      await this.getClassById(classId);
    }

    let studentId = dto.studentId;
    if (!studentId && dto.studentEmail) {
      const student = await this.usersService.findByEmail(dto.studentEmail);
      if (!student) {
        throw new NotFoundException('Student not found for provided email');
      }
      studentId = student.id;
    }

    if (!studentId) {
      throw new NotFoundException('Student identifier required');
    }

    await this.usersService.findById(studentId);

    const enrollment = await this.enrollmentModel
      .findOneAndUpdate(
        { classId, studentId },
        { $set: { status: dto.status ?? EnrollmentStatus.Active } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean()
      .exec();

    return enrollment;
  }

  async listEnrollments(
    classId: string,
    options: { restrictToInstructorId?: string } = {},
  ) {
    if (options.restrictToInstructorId) {
      await this.ensureInstructorAccess(classId, options.restrictToInstructorId);
    } else {
      await this.getClassById(classId);
    }
    const enrollments = await this.enrollmentModel.find({ classId }).lean().exec();
    if (!enrollments.length) {
      return [];
    }

    const studentIds = enrollments.map((enrollment) => enrollment.studentId.toString());
    const students = await this.usersService.findManyByIds(studentIds);
    const studentsById = new Map(students.map((student) => [student._id.toString(), student]));

    return enrollments.map((enrollment) => ({
      ...enrollment,
      student: studentsById.get(enrollment.studentId.toString()) ?? null,
    }));
  }
}
