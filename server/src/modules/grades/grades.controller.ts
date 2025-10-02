import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { GradesService } from './grades.service';
import { ReleaseGradeDto } from './dto/release-grade.dto';
import { UpsertGradeDto } from './dto/upsert-grade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@Controller()
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post('assignments/:assignmentId/grades')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  upsertGrade(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpsertGradeDto,
    @CurrentUser() user: RequestUser,
  ) {
    const options =
      user.role === UserRole.Teacher
        ? { restrictToInstructorId: user.userId }
        : undefined;
    return this.gradesService.upsertGrade(assignmentId, { ...dto, actorId: user.userId }, options);
  }

  @Get('assignments/:assignmentId/grades')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  listGrades(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const options =
      user.role === UserRole.Teacher
        ? { restrictToInstructorId: user.userId }
        : undefined;
    return this.gradesService.listGradesForAssignment(assignmentId, options);
  }

  @Post('grades/:gradeId/release')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  releaseGrade(
    @Param('gradeId') gradeId: string,
    @Body() dto: ReleaseGradeDto,
    @CurrentUser() user: RequestUser,
  ) {
    const options =
      user.role === UserRole.Teacher
        ? { restrictToInstructorId: user.userId }
        : undefined;
    return this.gradesService.releaseGrade(
      gradeId,
      {
        ...dto,
        actorId: user.userId,
      },
      options,
    );
  }

  @Get('students/:studentId/grades')
  @UseGuards(JwtAuthGuard)
  getStudentGrades(@Param('studentId') studentId: string, @CurrentUser() user: RequestUser) {
    const targetStudentId = this.resolveStudentId(studentId, user, 'grades');
    return this.gradesService.listGradesForStudent(targetStudentId);
  }

  @Get('students/me/grades')
  @UseGuards(JwtAuthGuard)
  getCurrentStudentGrades(@CurrentUser() user: RequestUser) {
    return this.gradesService.listGradesForStudent(this.ensureStudentRole(user));
  }

  @Get('students/:studentId/assignments')
  @UseGuards(JwtAuthGuard)
  getStudentAssignments(
    @Param('studentId') studentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const targetStudentId = this.resolveStudentId(studentId, user, 'assignments');
    return this.gradesService.getStudentAssignmentOverview(targetStudentId);
  }

  @Get('students/me/assignments')
  @UseGuards(JwtAuthGuard)
  getCurrentStudentAssignments(@CurrentUser() user: RequestUser) {
    return this.gradesService.getStudentAssignmentOverview(this.ensureStudentRole(user));
  }

  private resolveStudentId(pathStudentId: string, user: RequestUser, resource: string) {
    if (user.role === UserRole.Student) {
      if (user.userId !== pathStudentId) {
        throw new ForbiddenException(`Cannot view other students ${resource}`);
      }
      return user.userId;
    }
    return pathStudentId;
  }

  private ensureStudentRole(user: RequestUser) {
    if (user.role !== UserRole.Student) {
      throw new ForbiddenException('Only students can access their own shortcut routes');
    }
    return user.userId;
  }
}
