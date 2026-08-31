import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class PasswordResetCompleteDto {
  @ApiProperty({ example: 'reset-token' })
  @IsString()
  @IsNotEmpty()
  token!: string;
  @ApiProperty({ example: 'new-secure-password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
