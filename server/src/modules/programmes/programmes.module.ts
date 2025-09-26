import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProgrammesController } from './programmes.controller';
import { ProgrammesService } from './programmes.service';
import { Programme, ProgrammeSchema } from './schemas/programme.schema';
import { Cohort, CohortSchema } from './schemas/cohort.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Programme.name, schema: ProgrammeSchema },
      { name: Cohort.name, schema: CohortSchema },
    ]),
  ],
  controllers: [ProgrammesController],
  providers: [ProgrammesService],
  exports: [ProgrammesService, MongooseModule],
})
export class ProgrammesModule {}
