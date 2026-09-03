import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  IsMongoId,
  ArrayMaxSize,
  Equals,
} from 'class-validator';
import { MatchStatus } from '../schemas/match.schema';
export class CreateMatchDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
  @ApiProperty() @IsDateString() scheduledAt!: string;
}
export class UpdateMatchDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;
  @ApiProperty({ required: false }) @IsDateString() scheduledAt?: string;
}
export class ParticipantsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsMongoId({ each: true })
  participantUserIds!: string[];
}
export class MatchStatusDto {
  @ApiProperty({ example: 'completed' })
  @IsString()
  @Equals(MatchStatus.COMPLETED)
  status!: MatchStatus.COMPLETED;
}
export class MatchResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() groupId!: string;
  @ApiProperty() createdByUserId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() scheduledAt!: Date;
  @ApiProperty() status!: string;
  @ApiProperty({ type: [String] }) participantUserIds!: string[];
  @ApiProperty({ type: [String] }) homeTeamUserIds!: string[];
  @ApiProperty({ type: [String] }) awayTeamUserIds!: string[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
