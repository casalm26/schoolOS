import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { ProgrammesService } from '../programmes/programmes.service';
import { UsersService } from '../users/users.service';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { CreateStudentGroupDto } from './dto/create-student-group.dto';
import { UpdateStudentGroupMembersDto } from './dto/update-student-group-members.dto';
import { CreateGraderGroupDto } from './dto/create-grader-group.dto';
import { UpdateGraderGroupDto } from './dto/update-grader-group.dto';
import { CreateGroupBundleDto } from './dto/create-group-bundle.dto';
import { ClassEntity, ClassDocument } from './schemas/class.schema';
import {
  Enrollment,
  EnrollmentDocument,
  EnrollmentStatus,
} from './schemas/enrollment.schema';
import {
  StudentGroup,
  StudentGroupDocument,
} from './schemas/student-group.schema';
import { GraderGroup, GraderGroupDocument } from './schemas/grader-group.schema';
import { GroupBundle, GroupBundleDocument } from './schemas/group-bundle.schema';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(ClassEntity.name)
    private readonly classModel: Model<ClassDocument>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(StudentGroup.name)
    private readonly studentGroupModel: Model<StudentGroupDocument>,
    @InjectModel(GraderGroup.name)
    private readonly graderGroupModel: Model<GraderGroupDocument>,
    @InjectModel(GroupBundle.name)
    private readonly groupBundleModel: Model<GroupBundleDocument>,
    private readonly programmesService: ProgrammesService,
    private readonly usersService: UsersService,
  ) {}

  async createClass(dto: CreateClassDto, currentUser?: { userId: string; role: UserRole }) {
    await this.programmesService.findCohortById(dto.cohortId);

    let instructorIds = dto.instructorIds?.map((id) => id.toString()) ?? [];

    if (currentUser?.role === UserRole.Teacher) {
      instructorIds = [currentUser.userId];
    } else {
      if (!instructorIds.length) {
        throw new BadRequestException('At least one instructor is required');
      }
    }

    instructorIds = Array.from(new Set(instructorIds));
    const instructors = await this.usersService.findManyByIds(instructorIds);
    if (instructors.length !== instructorIds.length) {
      throw new NotFoundException('One or more instructors not found');
    }

    try {
      const created = new this.classModel({
        ...dto,
        instructorIds,
      });
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
    const classes = await this.classModel.find(query).sort({ title: 1 }).lean().exec();
    if (!classes.length) {
      return [];
    }

    const instructorIds = Array.from(
      new Set(classes.flatMap((entry) => (entry.instructorIds ?? []).map((id: any) => id.toString()))),
    );
    const instructors = await this.usersService.findManyByIds(instructorIds);
    const instructorMap = new Map(instructors.map((instructor) => [instructor._id.toString(), instructor]));

    return classes.map((entry) => ({
      ...entry,
      instructors: (entry.instructorIds ?? []).map((id: any) => instructorMap.get(id.toString()) ?? null),
    }));
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

  async enrollStudent(classId: string, dto: EnrollStudentDto) {
    await this.getClassById(classId);

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

  async listEnrollments(classId: string) {
    await this.getClassById(classId);
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

  private async ensureStudentMembership(classId: string, memberIds: string[]) {
    if (!memberIds?.length) return;
    const enrollments = await this.enrollmentModel
      .find({ classId, studentId: { $in: memberIds } })
      .select('studentId')
      .lean()
      .exec();
    const found = new Set(enrollments.map((enrollment) => enrollment.studentId.toString()));
    const missing = memberIds.filter((id) => !found.has(id));
    if (missing.length) {
      throw new NotFoundException('One or more students are not enrolled in this class');
    }
  }

  private async ensureGradersBelongToClass(classRecord: any, graderIds: string[]) {
    if (!graderIds?.length) return;
    const valid = new Set((classRecord.instructorIds ?? []).map((id: any) => id.toString()));
    const invalid = graderIds.filter((id) => !valid.has(id));
    if (invalid.length) {
      throw new NotFoundException('One or more graders are not instructors for this class');
    }
  }

  private async withStudentMembers(groups: any[]) {
    if (!groups.length) {
      return [];
    }
    const memberIds = Array.from(
      new Set(groups.flatMap((group) => group.memberIds?.map((id: any) => id.toString()) ?? [])),
    );
    const members = await this.usersService.findManyByIds(memberIds);
    const memberMap = new Map(members.map((member) => [member._id.toString(), member]));
    return groups.map((group) => ({
      ...group,
      members: (group.memberIds ?? []).map((id: any) => memberMap.get(id.toString()) ?? null),
    }));
  }

  private async withGraders(groups: any[]) {
    if (!groups.length) {
      return [];
    }
    const graderIds = Array.from(
      new Set(groups.flatMap((group) => group.graderIds?.map((id: any) => id.toString()) ?? [])),
    );
    const graders = await this.usersService.findManyByIds(graderIds);
    const graderMap = new Map(graders.map((grader) => [grader._id.toString(), grader]));
    return groups.map((group) => ({
      ...group,
      graders: (group.graderIds ?? []).map((id: any) => graderMap.get(id.toString()) ?? null),
    }));
  }

  async createStudentGroup(classId: string, dto: CreateStudentGroupDto) {
    const classRecord = await this.getClassById(classId);
    const memberIds = dto.memberIds ?? [];
    await this.ensureStudentMembership(classId, memberIds);

    const studentGroup = new this.studentGroupModel({
      classId: classRecord._id,
      name: dto.name,
      description: dto.description ?? '',
      memberIds,
    });
    await studentGroup.save();
    const group = studentGroup.toObject();
    const [result] = await this.withStudentMembers([group]);
    return result;
  }

  async listStudentGroups(classId: string) {
    await this.getClassById(classId);
    const groups = await this.studentGroupModel.find({ classId }).lean().exec();
    return this.withStudentMembers(groups);
  }

  async updateStudentGroupMembers(classId: string, groupId: string, dto: UpdateStudentGroupMembersDto) {
    await this.getClassById(classId);
    await this.ensureStudentMembership(classId, dto.memberIds);

    const updated = await this.studentGroupModel
      .findOneAndUpdate(
        { _id: groupId, classId },
        { $set: { memberIds: dto.memberIds } },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Student group not found');
    }

    const [result] = await this.withStudentMembers([updated]);
    return result;
  }

  async createGraderGroup(classId: string, dto: CreateGraderGroupDto) {
    const classRecord = await this.getClassById(classId);
    await this.ensureGradersBelongToClass(classRecord, dto.graderIds);

    const group = new this.graderGroupModel({
      classId: classRecord._id,
      name: dto.name,
      description: dto.description ?? '',
      graderIds: dto.graderIds,
    });
    await group.save();
    const [result] = await this.withGraders([group.toObject()]);
    return result;
  }

  async listGraderGroups(classId: string) {
    await this.getClassById(classId);
    const groups = await this.graderGroupModel.find({ classId }).lean().exec();
    return this.withGraders(groups);
  }

  async updateGraderGroup(classId: string, groupId: string, dto: UpdateGraderGroupDto) {
    const classRecord = await this.getClassById(classId);
    if (dto.graderIds) {
      await this.ensureGradersBelongToClass(classRecord, dto.graderIds);
    }

    const update: Record<string, any> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.graderIds !== undefined) update.graderIds = dto.graderIds;

    const updated = await this.graderGroupModel
      .findOneAndUpdate({ _id: groupId, classId }, { $set: update }, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Grader group not found');
    }

    const [result] = await this.withGraders([updated]);
    return result;
  }

  async createGroupBundle(classId: string, dto: CreateGroupBundleDto) {
    await this.getClassById(classId);

    const studentGroup = await this.studentGroupModel
      .findOne({ _id: dto.studentGroupId, classId })
      .lean()
      .exec();
    if (!studentGroup) {
      throw new NotFoundException('Student group not found for class');
    }

    const graderGroup = await this.graderGroupModel
      .findOne({ _id: dto.graderGroupId, classId })
      .lean()
      .exec();
    if (!graderGroup) {
      throw new NotFoundException('Grader group not found for class');
    }

    const bundle = new this.groupBundleModel({
      classId,
      studentGroupId: dto.studentGroupId,
      graderGroupId: dto.graderGroupId,
      notes: dto.notes ?? '',
    });
    await bundle.save();

    const [decorated] = await this.decorateBundles([bundle.toObject()]);
    return decorated;
  }

  async listGroupBundles(classId: string) {
    await this.getClassById(classId);
    const bundles = await this.groupBundleModel.find({ classId }).lean().exec();
    return this.decorateBundles(bundles);
  }

  private async decorateBundles(bundles: any[]) {
    if (!bundles.length) {
      return [];
    }

    const studentGroupIds = Array.from(
      new Set(bundles.map((bundle) => bundle.studentGroupId?.toString()).filter(Boolean)),
    );
    const graderGroupIds = Array.from(
      new Set(bundles.map((bundle) => bundle.graderGroupId?.toString()).filter(Boolean)),
    );

    const studentGroups = await this.studentGroupModel
      .find({ _id: { $in: studentGroupIds } })
      .lean()
      .exec();
    const graderGroups = await this.graderGroupModel
      .find({ _id: { $in: graderGroupIds } })
      .lean()
      .exec();

    const decoratedStudents = await this.withStudentMembers(studentGroups);
    const decoratedGraders = await this.withGraders(graderGroups);

    const studentMap = new Map(decoratedStudents.map((group) => [group._id.toString(), group]));
    const graderMap = new Map(decoratedGraders.map((group) => [group._id.toString(), group]));

    return bundles.map((bundle) => ({
      ...bundle,
      studentGroup: studentMap.get(bundle.studentGroupId.toString()) ?? null,
      graderGroup: graderMap.get(bundle.graderGroupId.toString()) ?? null,
    }));
  }
}
