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
  MatchStatusDto,
} from './dto/match.dto';
import { MatchesService } from './matches.service';
@ApiTags('matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'groups/:groupId/matches', version: '1' })
export class MatchesController {
  constructor(private readonly service: MatchesService) {}
  @Patch(':matchId/status')
  updateStatus(
    @Param('groupId', MongoIdPipe) g: string,
    @Param('matchId', MongoIdPipe) m: string,
    @Body() d: MatchStatusDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.updateStatus(g, m, d.status, u.userId);
  }
  @Post()
  create(
    @Param('groupId', MongoIdPipe) g: string,
    @Body() d: CreateMatchDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(g, d, u.userId);
  }
  @Get()
  list(
    @Param('groupId', MongoIdPipe) g: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.list(g, u.userId);
  }
  @Get(':matchId')
  get(
    @Param('groupId', MongoIdPipe) g: string,
    @Param('matchId', MongoIdPipe) m: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.get(g, m, u.userId);
  }
  @Patch(':matchId')
  update(
    @Param('groupId', MongoIdPipe) g: string,
    @Param('matchId', MongoIdPipe) m: string,
    @Body() d: UpdateMatchDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.update(g, m, d, u.userId);
  }
  @Delete(':matchId')
  remove(
    @Param('groupId', MongoIdPipe) g: string,
    @Param('matchId', MongoIdPipe) m: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.remove(g, m, u.userId);
  }
  @Put(':matchId/participants')
  participants(
    @Param('groupId', MongoIdPipe) g: string,
    @Param('matchId', MongoIdPipe) m: string,
    @Body() d: ParticipantsDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.participants(g, m, d, u.userId);
  }
  @Post(':matchId/generate-teams')
  generate(
    @Param('groupId', MongoIdPipe) g: string,
    @Param('matchId', MongoIdPipe) m: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.generate(g, m, u.userId);
  }
}
