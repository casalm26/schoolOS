import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { CreateCohortDto } from './dto/create-cohort.dto';
import { ProgrammesService } from './programmes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('programmes')
export class ProgrammesController {
  constructor(private readonly programmesService: ProgrammesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  createProgramme(@Body() dto: CreateProgrammeDto) {
    return this.programmesService.createProgramme(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listProgrammes() {
    return this.programmesService.listProgrammes();
  }

  @Post('cohorts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  createCohort(@Body() dto: CreateCohortDto) {
    return this.programmesService.createCohort(dto);
  }

  @Get('cohorts')
  @UseGuards(JwtAuthGuard)
  listCohorts(@Query('programmeId') programmeId?: string) {
    return this.programmesService.listCohorts(programmeId);
  }
}
