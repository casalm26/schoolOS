import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { ClassesService } from '../classes/classes.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { Assignment, AssignmentDocument } from './schemas/assignment.schema';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name)
    private readonly assignmentModel: Model<AssignmentDocument>,
    private readonly classesService: ClassesService,
  ) {}

  async create(classId: string, dto: CreateAssignmentDto) {
    await this.classesService.getClassById(classId);

    const assignment = new this.assignmentModel({
      classId,
      title: dto.title,
      description: dto.description ?? '',
      type: dto.type ?? 'task',
      dueAt: new Date(dto.dueAt),
      publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
      gradingSchema: dto.gradingSchema ?? 'points',
      maxPoints: dto.maxPoints ?? 100,
    });

    await assignment.save();
    return assignment.toObject();
  }

  async listForClass(classId: string) {
    await this.classesService.getClassById(classId);
    return this.assignmentModel
      .find({ classId })
      .sort({ dueAt: 1 })
      .lean()
      .exec();
  }

  async findById(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Assignment not found');
    }
    const assignment = await this.assignmentModel.findById(id).lean().exec();
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    return assignment;
  }

  async update(assignmentId: string, dto: UpdateAssignmentDto) {
    await this.findById(assignmentId);
    const update: Record<string, any> = {};
    if (dto.title !== undefined) update.title = dto.title;
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.type !== undefined) update.type = dto.type;
    if (dto.dueAt !== undefined) update.dueAt = new Date(dto.dueAt);
    if (dto.publishAt !== undefined)
      update.publishAt = dto.publishAt ? new Date(dto.publishAt) : null;
    if (dto.gradingSchema !== undefined) update.gradingSchema = dto.gradingSchema;
    if (dto.maxPoints !== undefined) update.maxPoints = dto.maxPoints;

    const updated = await this.assignmentModel
      .findByIdAndUpdate(assignmentId, { $set: update }, { new: true })
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException('Assignment not found');
    }
    return updated;
  }
}
