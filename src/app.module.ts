import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GLOBAL_RATE_LIMIT } from './common/security/rate-limit.constants';
import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { DatabaseModule } from './infrastructure/database/database.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { GroupsModule } from './modules/groups/groups.module';
import { HealthModule } from './modules/health/health.module';
import { MatchesModule } from './modules/matches/matches.module';
import { PositionsModule } from './modules/positions/positions.module';
import { UsersModule } from './modules/users/users.module';
import { VotingModule } from './modules/voting/voting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ...GLOBAL_RATE_LIMIT }]),
    DatabaseModule,
    MailModule,
    HealthModule,
    PositionsModule,
    UsersModule,
    AuthModule,
    GroupsModule,
    MatchesModule,
    VotingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
