import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchesModule } from '../matches/matches.module';
import { VotingController } from './voting.controller';
import { VotingService } from './voting.service';
import { Vote, VoteSchema } from './schemas/vote.schema';
@Module({
  imports: [
    MatchesModule,
    MongooseModule.forFeature([{ name: Vote.name, schema: VoteSchema }]),
  ],
  controllers: [VotingController],
  providers: [VotingService],
})
export class VotingModule {}
