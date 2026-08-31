import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, IsNotEmpty, Max, Min } from 'class-validator';
export class CreateVoteDto {
  @ApiProperty() @IsMongoId() @IsNotEmpty() targetUserId!: string;
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;
}
export class VoteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() matchId!: string;
  @ApiProperty() targetUserId!: string;
  @ApiProperty() score!: number;
  @ApiProperty() createdAt!: Date;
}
