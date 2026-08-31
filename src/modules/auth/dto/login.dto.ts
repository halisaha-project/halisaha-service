import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'murat@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({ example: 'secure-password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
