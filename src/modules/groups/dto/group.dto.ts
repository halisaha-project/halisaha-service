import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ClientMessageField } from '../../../common/decorators/client-message-field.decorator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Friday Football' })
  @ClientMessageField('Takım Adı')
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  groupName!: string;
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
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
