import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, UserStatus } from './schemas/user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  findAll(@Query('role') role?: UserRole, @Query('status') status?: UserStatus) {
    const filter: Record<string, any> = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    return this.usersService.findAll(filter);
  }

  @Get('search/by-role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Teacher)
  async searchByRole(@Query('role') role: UserRole, @Query('query') query: string) {
    if (!role || !query) {
      return [];
    }
    return this.usersService.searchByRole(role, query, 15);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
