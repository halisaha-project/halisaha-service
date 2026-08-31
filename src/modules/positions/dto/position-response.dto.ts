import { ApiProperty } from '@nestjs/swagger';

export class PositionResponseDto {
  @ApiProperty({ example: '6658a63e957fdc8261e8912a' })
  id!: string;

  @ApiProperty({ example: 'Goalkeeper' })
  name!: string;

  @ApiProperty({ example: 'GK' })
  abbreviation!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
