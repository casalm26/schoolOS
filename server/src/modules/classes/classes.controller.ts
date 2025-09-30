import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  createClass(@Body() dto: CreateClassDto) {
    return this.classesService.createClass(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  listClasses(
    @CurrentUser() user: RequestUser,
    @Query('cohortId') cohortId?: string,
    @Query('instructorId') instructorId?: string,
  ) {
    const filters: Record<string, string | undefined> = { cohortId };
    if (user.role === UserRole.Teacher) {
      filters.instructorId = user.userId;
    } else if (instructorId) {
      filters.instructorId = instructorId;
    }
    return this.classesService.listClasses(filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getClass(@Param('id') id: string) {
    return this.classesService.getClassById(id);
  }

  @Post(':id/enrollments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  enrollStudent(
    @Param('id') classId: string,
    @Body() dto: EnrollStudentDto,
    @CurrentUser() user: RequestUser,
  ) {
    const options =
      user.role === UserRole.Teacher
        ? { restrictToInstructorId: user.userId }
        : undefined;
    return this.classesService.enrollStudent(classId, dto, options);
  }

  @Get(':id/enrollments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  listEnrollments(@Param('id') classId: string, @CurrentUser() user: RequestUser) {
    const options =
      user.role === UserRole.Teacher
        ? { restrictToInstructorId: user.userId }
        : undefined;
    return this.classesService.listEnrollments(classId, options);
  }
}
