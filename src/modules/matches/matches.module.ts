import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsModule } from '../groups/groups.module';
import { MatchesController, MatchesMeController } from './matches.controller';
import { MatchesService } from './matches.service';
import { Match, MatchSchema } from './schemas/match.schema';
import { TeamGeneratorService } from './team-generator.service';
@Module({
  imports: [
    GroupsModule,
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
  ],
  controllers: [MatchesController, MatchesMeController],
  providers: [MatchesService, TeamGeneratorService],
  exports: [MatchesService],
})
export class MatchesModule {}
