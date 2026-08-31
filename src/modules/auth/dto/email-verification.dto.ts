import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EmailVerificationDto {
  @ApiProperty({ example: 'verification-token' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
