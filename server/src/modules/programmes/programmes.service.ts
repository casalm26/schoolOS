import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { CreateCohortDto } from './dto/create-cohort.dto';
import { Programme, ProgrammeDocument } from './schemas/programme.schema';
import { Cohort, CohortDocument } from './schemas/cohort.schema';

@Injectable()
export class ProgrammesService {
  constructor(
    @InjectModel(Programme.name)
    private readonly programmeModel: Model<ProgrammeDocument>,
    @InjectModel(Cohort.name)
    private readonly cohortModel: Model<CohortDocument>,
  ) {}

  async createProgramme(dto: CreateProgrammeDto) {
    const programme = new this.programmeModel(dto);
    await programme.save();
    return programme.toObject();
  }

  async listProgrammes() {
    return this.programmeModel.find().sort({ name: 1 }).lean().exec();
  }

  async createCohort(dto: CreateCohortDto) {
    const programme = await this.programmeModel.findById(dto.programmeId).lean().exec();
    if (!programme) {
      throw new NotFoundException('Programme not found');
    }
    const cohort = new this.cohortModel({
      ...dto,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
    });
    await cohort.save();
    return cohort.toObject();
  }

  async listCohorts(programmeId?: string) {
    const filter = programmeId ? { programmeId } : {};
    return this.cohortModel.find(filter).sort({ startAt: 1 }).lean().exec();
  }

  async findCohortById(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Cohort not found');
    }
    const cohort = await this.cohortModel.findById(id).lean().exec();
    if (!cohort) {
      throw new NotFoundException('Cohort not found');
    }
    return cohort;
  }
}
