import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { CreateStudentGroupDto } from './dto/create-student-group.dto';
import { UpdateStudentGroupMembersDto } from './dto/update-student-group-members.dto';
import { CreateGraderGroupDto } from './dto/create-grader-group.dto';
import { UpdateGraderGroupDto } from './dto/update-grader-group.dto';
import { CreateGroupBundleDto } from './dto/create-group-bundle.dto';
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
  @Roles(UserRole.Admin, UserRole.Teacher)
  createClass(@Body() dto: CreateClassDto, @CurrentUser() user: RequestUser) {
    return this.classesService.createClass(dto, {
      userId: user.userId,
      role: user.role as UserRole,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listClasses(
    @CurrentUser() user: RequestUser,
    @Query('cohortId') cohortId?: string,
    @Query('instructorId') instructorId?: string,
  ) {
    const filters: Record<string, string | undefined> = { cohortId };
    if (user?.role === UserRole.Teacher && !instructorId) {
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
  enrollStudent(@Param('id') classId: string, @Body() dto: EnrollStudentDto) {
    return this.classesService.enrollStudent(classId, dto);
  }

  @Get(':id/enrollments')
  @UseGuards(JwtAuthGuard)
  listEnrollments(@Param('id') classId: string) {
    return this.classesService.listEnrollments(classId);
  }

  @Post(':id/student-groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  createStudentGroup(@Param('id') classId: string, @Body() dto: CreateStudentGroupDto) {
    return this.classesService.createStudentGroup(classId, dto);
  }

  @Get(':id/student-groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  listStudentGroups(@Param('id') classId: string) {
    return this.classesService.listStudentGroups(classId);
  }

  @Post(':id/student-groups/:groupId/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  updateStudentGroupMembers(
    @Param('id') classId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateStudentGroupMembersDto,
  ) {
    return this.classesService.updateStudentGroupMembers(classId, groupId, dto);
  }

  @Post(':id/grader-groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  createGraderGroup(@Param('id') classId: string, @Body() dto: CreateGraderGroupDto) {
    return this.classesService.createGraderGroup(classId, dto);
  }

  @Get(':id/grader-groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  listGraderGroups(@Param('id') classId: string) {
    return this.classesService.listGraderGroups(classId);
  }

  @Patch(':id/grader-groups/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  updateGraderGroup(
    @Param('id') classId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGraderGroupDto,
  ) {
    return this.classesService.updateGraderGroup(classId, groupId, dto);
  }

  @Post(':id/group-bundles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  createGroupBundle(@Param('id') classId: string, @Body() dto: CreateGroupBundleDto) {
    return this.classesService.createGroupBundle(classId, dto);
  }

  @Get(':id/group-bundles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  listGroupBundles(@Param('id') classId: string) {
    return this.classesService.listGroupBundles(classId);
  }
}
