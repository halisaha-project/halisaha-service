import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '6658a63e957fdc8261e8912a' })
  id!: string;

  @ApiProperty({ example: 'Murat' })
  name!: string;

  @ApiProperty({ example: 'Karadeniz' })
  surname!: string;

  @ApiProperty({ example: 'muratkaradeniz' })
  username!: string;

  @ApiProperty({ example: 'murat@example.com' })
  email!: string;

  @ApiProperty({ example: false })
  emailVerified!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
