import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InviteUserDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
export class AcceptInvitationDto {
  @ApiProperty({ example: 'invitation-token' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
