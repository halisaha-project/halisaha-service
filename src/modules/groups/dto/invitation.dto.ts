import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ClientMessageField } from '../../../common/decorators/client-message-field.decorator';
import { POSITION_ABBREVIATIONS } from '../../positions/positions.service';

export class InviteUserDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export interface InvitationCreatedResponseDto {
  invited: true;
  developmentToken?: string;
  developmentCode?: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ example: 'invitation-token', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  token?: string;

  @ApiProperty({ example: '483271', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  code?: string;

  @ClientMessageField('Ana Pozisyon')
  @IsIn([...POSITION_ABBREVIATIONS])
  @IsNotEmpty()
  mainPosition?: (typeof POSITION_ABBREVIATIONS)[number];

  @ClientMessageField('Alternatif Pozisyon')
  @IsIn([...POSITION_ABBREVIATIONS])
  @IsNotEmpty()
  altPosition?: (typeof POSITION_ABBREVIATIONS)[number];

  @ClientMessageField('Forma Numarası')
  @IsInt()
  @Min(1)
  @Max(99)
  shirtNumber?: number;
}
