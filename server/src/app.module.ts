import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  securityConfig,
  throttleConfig,
} from './config/configuration.js';
import { validateEnv } from './config/env.validation.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { UsersModule } from './users/users.module.js';
import { RolesGuard } from './common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [appConfig, databaseConfig, jwtConfig, securityConfig, throttleConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '20', 10),
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
