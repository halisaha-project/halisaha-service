import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MongoIdPipe } from '../../common/pipes/mongo-id.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateVoteDto } from './dto/vote.dto';
import { VotingService } from './voting.service';
@ApiTags('voting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'groups/:groupId/matches/:matchId/votes', version: '1' })
export class VotingController {
  constructor(private readonly service: VotingService) {}
  @Post()
  create(
    @Param('groupId', MongoIdPipe) g: string,
    @Param('matchId', MongoIdPipe) m: string,
    @Body() d: CreateVoteDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(g, m, d, u.userId);
  }
  @Get()
  list(
    @Param('groupId', MongoIdPipe) g: string,
    @Param('matchId', MongoIdPipe) m: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.list(g, m, u.userId);
  }
  @Get('results')
  results(
    @Param('groupId', MongoIdPipe) g: string,
    @Param('matchId', MongoIdPipe) m: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.results(g, m, u.userId);
  }
}
