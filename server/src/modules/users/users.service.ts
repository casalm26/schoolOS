import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument, UserRole, UserStatus } from './schemas/user.schema';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto) {
    const { password, ...rest } = dto;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new this.userModel({
      ...rest,
      passwordHash,
    });
    await user.save();
    return user.toJSON();
  }

  async findAll(filter: Partial<{ role: UserRole; status: UserStatus }> = {}) {
    const users = await this.userModel.find(filter).sort({ name: 1 }).lean().exec();
    return users;
  }

  async findById(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('User not found');
    }
    const user = await this.userModel.findById(id).lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findManyByIds(ids: string[]) {
    const validIds = ids.filter((id) => isValidObjectId(id)).map((id) => new Types.ObjectId(id));
    if (!validIds.length) {
      return [];
    }
    const users = await this.userModel.find({ _id: { $in: validIds } }).lean().exec();
    return users;
  }

  async updateLastLogin(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, { $set: { lastLoginAt: new Date() } }).exec();
  }

  async setPassword(userId: string, password: string) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.userModel.findByIdAndUpdate(userId, { $set: { passwordHash } }).exec();
  }

  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  async countByRole(role: UserRole) {
    return this.userModel.countDocuments({ role }).exec();
  }

  async searchByRole(role: UserRole, query: string, limit = 10) {
    const regex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return this.userModel
      .find({
        role,
        $or: [{ name: regex }, { email: regex }],
      })
      .limit(limit)
      .sort({ name: 1 })
      .lean()
      .exec();
  }
}
