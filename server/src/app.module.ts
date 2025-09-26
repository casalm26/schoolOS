import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './modules/users/users.module';
import { ProgrammesModule } from './modules/programmes/programmes.module';
import { ClassesModule } from './modules/classes/classes.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { GradesModule } from './modules/grades/grades.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const uri =
          configService.get<string>('MONGODB_URI') ??
          'mongodb://127.0.0.1:27017/schoolos';
        return {
          uri,
          dbName: configService.get<string>('MONGODB_DB', 'schoolos'),
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    ProgrammesModule,
    ClassesModule,
    AssignmentsModule,
    GradesModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
