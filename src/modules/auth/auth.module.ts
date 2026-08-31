import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
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
})
export class AuthModule {}
