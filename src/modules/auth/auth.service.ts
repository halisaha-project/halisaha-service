import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { Model } from 'mongoose';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import {
  ACCESS_TOKEN_TYPE,
  BCRYPT_ROUNDS,
  REFRESH_TOKEN_TYPE,
  expiresInSeconds,
} from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { AuthSession } from './schemas/auth-session.schema';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { EmailVerificationDto } from './dto/email-verification.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { EmailVerification } from './schemas/email-verification.schema';
import { MailService } from '../../infrastructure/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(AuthSession.name)
    private readonly sessionModel?: Model<AuthSession>,
    @InjectModel(EmailVerification.name)
    private readonly verificationModel?: Model<EmailVerification>,
    private readonly mailService?: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<UserResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      surname: dto.surname,
      username: dto.username,
      email: dto.email,
      passwordHash,
    });
    await this.issueVerification(user.email, String(user._id));

    return user.toJSON() as unknown as UserResponseDto;
  }

  async verifyEmail(dto: EmailVerificationDto): Promise<{ verified: true }> {
    const now = new Date();
    const record = await this.verificationModel!.findOneAndUpdate(
      {
        tokenHash: this.hash(dto.token),
        consumedAt: null,
        expiresAt: { $gt: now },
      },
      { $set: { consumedAt: now } },
      { new: true },
    ).exec();
    if (!record)
      throw new ApplicationException(
        400,
        ErrorCode.INVALID_EMAIL_VERIFICATION_TOKEN,
        'Invalid email verification token',
      );
    await this.usersService.markEmailVerified(String(record.userId));
    return { verified: true };
  }

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<{ accepted: true }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (user && !user.emailVerified) {
      await this.verificationModel!.updateMany(
        { userId: user._id, consumedAt: null },
        { $set: { consumedAt: new Date() } },
      ).exec();
      await this.issueVerification(user.email, String(user._id));
    }
    return { accepted: true };
  }

  private async issueVerification(
    email: string,
    userId: string,
  ): Promise<void> {
    if (!this.verificationModel) return;
    const token =
      randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    await this.verificationModel!.create({
      userId,
      tokenHash: this.hash(token),
      expiresAt: new Date(Date.now() + 86400000),
      consumedAt: null,
    });
    await this.mailService?.sendEmailVerification(email, token);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = identifier.includes('@')
      ? await this.usersService.findCredentialsByEmail(identifier)
      : await this.usersService.findCredentialsByUsername(identifier);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new ApplicationException(
        401,
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }
    const accessToken = await this.jwtService.signAsync({
      sub: String(user._id),
      type: ACCESS_TOKEN_TYPE,
    });
    const refreshToken = await this.createRefreshToken(String(user._id));
    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds(
        this.configService.getOrThrow<string>('jwtAccessExpiresIn'),
      ),
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenResponseDto> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const now = new Date();
    const claimed = await this.sessionModel!.findOneAndUpdate(
      {
        sid: payload.sid,
        userId: payload.sub,
        tokenHash: this.hash(dto.refreshToken),
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      { $set: { revokedAt: now } },
      { new: true },
    ).exec();
    if (!claimed) throw this.invalidRefreshError();
    const refreshToken = await this.createRefreshToken(payload.sub);
    const accessToken = await this.jwtService.signAsync({
      sub: payload.sub,
      type: ACCESS_TOKEN_TYPE,
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds(
        this.configService.getOrThrow<string>('jwtAccessExpiresIn'),
      ),
    };
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    try {
      const payload = await this.verifyRefreshToken(dto.refreshToken);
      await this.sessionModel!.updateOne(
        { sid: payload.sid, userId: payload.sub, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      ).exec();
    } catch {
      // Logout is intentionally idempotent.
    }
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const sid = randomUUID();
    const expiresIn = this.configService.getOrThrow<string>(
      'jwtRefreshExpiresIn',
    );
    const token = await new JwtService({
      secret: this.configService.getOrThrow<string>('jwtRefreshSecret'),
    }).signAsync({ sub: userId, type: REFRESH_TOKEN_TYPE, sid }, { expiresIn });
    await this.sessionModel!.create({
      sid,
      userId,
      tokenHash: this.hash(token),
      expiresAt: new Date(Date.now() + expiresInSeconds(expiresIn) * 1000),
      revokedAt: null,
    });
    return token;
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<{ sub: string; sid: string; type: string }> {
    try {
      const payload = await new JwtService({
        secret: this.configService.getOrThrow<string>('jwtRefreshSecret'),
      }).verifyAsync<{ sub: string; sid: string; type: string }>(token);
      if (payload.type !== REFRESH_TOKEN_TYPE || !payload.sub || !payload.sid)
        throw new Error();
      return payload;
    } catch {
      throw this.invalidRefreshError();
    }
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
  private matches(token: string, hash: string): boolean {
    return this.hash(token) === hash;
  }
  private invalidRefreshError(): ApplicationException {
    return new ApplicationException(
      401,
      ErrorCode.INVALID_REFRESH_TOKEN,
      'Invalid refresh token',
    );
  }
}
