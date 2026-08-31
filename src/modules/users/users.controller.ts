import { Controller, Get, Param, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MongoIdPipe } from '../../common/pipes/mongo-id.pipe';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':userId')
  @UsePipes(MongoIdPipe)
  @ApiOperation({ summary: 'Get a public user profile' })
  @ApiParam({ name: 'userId', example: '6658a63e957fdc8261e8912a' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid MongoDB identifier' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findById(@Param('userId') userId: string) {
    return this.usersService.findRequiredById(userId);
  }
}
