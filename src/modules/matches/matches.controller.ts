import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MongoIdPipe } from '../../common/pipes/mongo-id.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  CreateMatchDto,
  ParticipantsDto,
  UpdateMatchDto,
} from './dto/match.dto';
import { MatchesService } from './matches.service';
@ApiTags('matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'groups/:groupId/matches', version: '1' })
export class MatchesController {
  constructor(private readonly service: MatchesService) {}
  @Post() @UsePipes(MongoIdPipe) create(
    @Param('groupId') g: string,
    @Body() d: CreateMatchDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(g, d, u.userId);
  }
  @Get() @UsePipes(MongoIdPipe) list(
    @Param('groupId') g: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.list(g, u.userId);
  }
  @Get(':matchId') @UsePipes(MongoIdPipe) get(
    @Param('groupId') g: string,
    @Param('matchId') m: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.get(g, m, u.userId);
  }
  @Patch(':matchId') @UsePipes(MongoIdPipe) update(
    @Param('groupId') g: string,
    @Param('matchId') m: string,
    @Body() d: UpdateMatchDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.update(g, m, d, u.userId);
  }
  @Delete(':matchId') @UsePipes(MongoIdPipe) remove(
    @Param('groupId') g: string,
    @Param('matchId') m: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.remove(g, m, u.userId);
  }
  @Put(':matchId/participants') @UsePipes(MongoIdPipe) participants(
    @Param('groupId') g: string,
    @Param('matchId') m: string,
    @Body() d: ParticipantsDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.participants(g, m, d, u.userId);
  }
  @Post(':matchId/generate-teams') @UsePipes(MongoIdPipe) generate(
    @Param('groupId') g: string,
    @Param('matchId') m: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.generate(g, m, u.userId);
  }
}
