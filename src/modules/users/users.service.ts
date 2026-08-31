import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { CreateUserData } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findRequiredById(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) {
      throw new ApplicationException(
        404,
        ErrorCode.USER_NOT_FOUND,
        'User not found',
      );
    }
    return user;
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: this.normalizeEmail(email) }).exec();
  }

  findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ username: this.normalizeUsername(username) })
      .exec();
  }

  findCredentialsByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: this.normalizeEmail(email) })
      .select('+passwordHash')
      .exec();
  }

  findCredentialsByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ username: this.normalizeUsername(username) })
      .select('+passwordHash')
      .exec();
  }

  async create(data: CreateUserData): Promise<UserDocument> {
    const user = new this.userModel({
      ...data,
      name: data.name.trim(),
      surname: data.surname.trim(),
      username: this.normalizeUsername(data.username),
      email: this.normalizeEmail(data.email),
    });

    try {
      return await user.save();
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error, 'email')) {
        throw new ApplicationException(
          409,
          ErrorCode.EMAIL_ALREADY_EXISTS,
          'Email already exists',
        );
      }
      if (this.isDuplicateKeyError(error, 'username')) {
        throw new ApplicationException(
          409,
          ErrorCode.USERNAME_ALREADY_EXISTS,
          'Username already exists',
        );
      }
      throw error;
    }
  }

  async markEmailVerified(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { emailVerified: true }, { new: true })
      .exec();
    if (!user) {
      throw new ApplicationException(
        404,
        ErrorCode.USER_NOT_FOUND,
        'User not found',
      );
    }
    return user;
  }

  async updatePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { passwordHash }, { new: true })
      .exec();
    if (!user)
      throw new ApplicationException(
        404,
        ErrorCode.USER_NOT_FOUND,
        'User not found',
      );
    return user;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  private isDuplicateKeyError(error: unknown, field: string): boolean {
    if (!error || typeof error !== 'object') return false;
    const mongoError = error as {
      code?: number;
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };
    return (
      mongoError.code === 11000 &&
      Boolean(mongoError.keyPattern?.[field] ?? mongoError.keyValue?.[field])
    );
  }
}
