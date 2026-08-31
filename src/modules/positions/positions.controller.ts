import { Controller, Get, Param, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MongoIdPipe } from '../../common/pipes/mongo-id.pipe';
import { PositionResponseDto } from './dto/position-response.dto';
import { PositionsService } from './positions.service';

@ApiTags('positions')
@Controller({ path: 'positions', version: '1' })
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  @ApiOperation({ summary: 'List available player positions' })
  @ApiResponse({ status: 200, type: PositionResponseDto, isArray: true })
  findAll() {
    return this.positionsService.findAll();
  }

  @Get(':positionId')
  @UsePipes(MongoIdPipe)
  @ApiOperation({ summary: 'Get a player position by ID' })
  @ApiParam({ name: 'positionId', example: '6658a63e957fdc8261e8912a' })
  @ApiResponse({ status: 200, type: PositionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid MongoDB identifier' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  findById(@Param('positionId') positionId: string) {
    return this.positionsService.findById(positionId);
  }
}
