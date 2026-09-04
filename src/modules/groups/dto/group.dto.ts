import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ClientMessageField } from '../../../common/decorators/client-message-field.decorator';
import { POSITION_ABBREVIATIONS } from '../../positions/positions.service';

export class CreateGroupDto {
  @ApiProperty({ example: 'Friday Football' })
  @ClientMessageField('Takım Adı')
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  groupName!: string;

  @ClientMessageField('Ana Pozisyon')
  @IsIn([...POSITION_ABBREVIATIONS])
  @IsNotEmpty()
  mainPosition!: (typeof POSITION_ABBREVIATIONS)[number];

  @ClientMessageField('Alternatif Pozisyon')
  @IsIn([...POSITION_ABBREVIATIONS])
  @IsNotEmpty()
  altPosition!: (typeof POSITION_ABBREVIATIONS)[number];

  @ClientMessageField('Forma Numarası')
  @IsInt()
  @Min(1)
  @Max(99)
  shirtNumber!: number;
}

export class GroupNameDto {
  @ApiProperty({ example: 'Friday Football' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}

export class GroupResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty({ type: [String] }) memberIds!: string[];
  @ApiProperty({ type: [Object] }) members!: GroupMemberResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class GroupMemberResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty({ required: false }) mainPosition?: string;
  @ApiProperty({ required: false }) altPosition?: string;
  @ApiProperty({ required: false }) shirtNumber?: number;
  @ApiProperty({ required: false }) name?: string;
  @ApiProperty({ required: false }) surname?: string;
}
