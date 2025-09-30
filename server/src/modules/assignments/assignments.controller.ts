import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@Controller()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('classes/:classId/assignments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  createAssignment(
    @Param('classId') classId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    const options =
      user.role === UserRole.Teacher
        ? { restrictToInstructorId: user.userId }
        : undefined;
    return this.assignmentsService.create(classId, dto, options);
  }

  @Get('classes/:classId/assignments')
  @UseGuards(JwtAuthGuard)
  listAssignments(@Param('classId') classId: string) {
    return this.assignmentsService.listForClass(classId);
  }

  @Get('assignments/:id')
  @UseGuards(JwtAuthGuard)
  getAssignment(@Param('id') id: string) {
    return this.assignmentsService.findById(id);
  }

  @Patch('assignments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  updateAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    const options =
      user.role === UserRole.Teacher
        ? { restrictToInstructorId: user.userId }
        : undefined;
    return this.assignmentsService.update(id, dto, options);
  }
}
