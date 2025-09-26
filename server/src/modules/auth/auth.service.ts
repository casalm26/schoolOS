import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private sanitize(user: any) {
    if (!user) return null;
    const json = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    delete json.passwordHash;
    delete json.resetToken;
    delete json.resetTokenExpiresAt;
    return json;
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.usersService.verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.updateLastLogin(user.id);

    const payload = { sub: user.id, role: user.role, email: user.email };
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') ?? '12h';
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });

    return {
      accessToken,
      user: this.sanitize(user),
    };
  }

  async registerInitialAdmin(dto: RegisterAdminDto) {
    const adminCount = await this.usersService.countByRole(UserRole.Admin);
    if (adminCount > 0) {
      throw new ConflictException('Admin already exists. Please ask an admin to invite you.');
    }

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      role: UserRole.Admin,
      password: dto.password,
    });

    const payload = { sub: user._id, role: user.role, email: user.email };
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') ?? '12h';
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });

    return {
      accessToken,
      user,
    };
  }
}
