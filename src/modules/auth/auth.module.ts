import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthSession, AuthSessionSchema } from './schemas/auth-session.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: AuthSession.name, schema: AuthSessionSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwtAccessSecret'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('jwtAccessExpiresIn'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
