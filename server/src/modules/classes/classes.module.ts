import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProgrammesModule } from '../programmes/programmes.module';
import { UsersModule } from '../users/users.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { ClassEntity, ClassSchema } from './schemas/class.schema';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClassEntity.name, schema: ClassSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
    ProgrammesModule,
    UsersModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService, MongooseModule],
})
export class ClassesModule {}
