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
  IsOptional,
  IsInt,
  Min,
  ValidateNested,
  IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MatchStatus } from '../schemas/match.schema';
import { FootballPosition, TeamFormation } from '../team-generator.service';
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
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
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
export class FormationDto implements TeamFormation {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) GK!: number;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) DEF!: number;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) MID!: number;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) FWD!: number;
}
export class GenerateTeamsDto {
  @ApiProperty({ type: () => FormationDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => FormationDto)
  formation!: FormationDto;
}
export class MatchLineupPlayerResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: ['GK', 'DEF', 'MID', 'FWD'] })
  assignedPosition!: FootballPosition;
  @ApiProperty() shirtNumber!: number;
}

export class MatchTeamPlayerResponseDto extends MatchLineupPlayerResponseDto {
  @ApiProperty({ required: false }) name?: string;
  @ApiProperty({ required: false }) surname?: string;
}

export class MatchTeamResponseDto {
  @ApiProperty({ type: () => [MatchTeamPlayerResponseDto] })
  players!: MatchTeamPlayerResponseDto[];
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
  @ApiProperty({ type: () => FormationDto, nullable: true })
  formation!: FormationDto | null;
  @ApiProperty({ type: () => [MatchLineupPlayerResponseDto] })
  homeLineup!: MatchLineupPlayerResponseDto[];
  @ApiProperty({ type: () => [MatchLineupPlayerResponseDto] })
  awayLineup!: MatchLineupPlayerResponseDto[];
  @ApiProperty({ type: () => MatchTeamResponseDto })
  homeTeam!: MatchTeamResponseDto;
  @ApiProperty({ type: () => MatchTeamResponseDto })
  awayTeam!: MatchTeamResponseDto;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
