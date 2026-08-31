import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { BCRYPT_ROUNDS } from './auth.constants';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

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
}
