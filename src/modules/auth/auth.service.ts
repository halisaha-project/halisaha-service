import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import {
  ACCESS_TOKEN_TYPE,
  BCRYPT_ROUNDS,
  expiresInSeconds,
} from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { JwtService } from '@nestjs/jwt';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCode } from '../../common/errors/error-code';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    return user.toJSON() as unknown as UserResponseDto;
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
    return {
      accessToken,
      expiresIn: expiresInSeconds(
        this.configService.getOrThrow<string>('jwtAccessExpiresIn'),
      ),
    };
  }
}
