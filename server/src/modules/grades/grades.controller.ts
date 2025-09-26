import { Body, Controller, Get, Param, Post, UseGuards, ForbiddenException } from '@nestjs/common';
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
    return this.gradesService.upsertGrade(assignmentId, { ...dto, actorId: user.userId });
  }

  @Get('assignments/:assignmentId/grades')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  listGrades(@Param('assignmentId') assignmentId: string) {
    return this.gradesService.listGradesForAssignment(assignmentId);
  }

  @Post('grades/:gradeId/release')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  releaseGrade(
    @Param('gradeId') gradeId: string,
    @Body() dto: ReleaseGradeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gradesService.releaseGrade(gradeId, {
      ...dto,
      actorId: user.userId,
    });
  }

  @Get('students/:studentId/grades')
  @UseGuards(JwtAuthGuard)
  getStudentGrades(@Param('studentId') studentId: string, @CurrentUser() user: RequestUser) {
    if (user.role === UserRole.Student && user.userId !== studentId) {
      throw new ForbiddenException('Cannot view other students grades');
    }
    return this.gradesService.listGradesForStudent(studentId);
  }

  @Get('students/:studentId/assignments')
  @UseGuards(JwtAuthGuard)
  getStudentAssignments(@Param('studentId') studentId: string, @CurrentUser() user: RequestUser) {
    if (user.role === UserRole.Student && user.userId !== studentId) {
      throw new ForbiddenException('Cannot view other students assignments');
    }
    return this.gradesService.getStudentAssignmentOverview(studentId);
  }
}
