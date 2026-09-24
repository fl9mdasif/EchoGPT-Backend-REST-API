import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import type { CurrentUserPayload } from '../../auth/interfaces/jwt-payload.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';

// Not part of @nestjs/common's public exports — @HttpCode() sets this same
// literal internally (see its source). Pinned here rather than deep-
// importing a package-internal path; worth re-checking on a Nest major bump.
const HTTP_CODE_METADATA = '__httpCode__';

/**
 * Fire-and-forget request logging into ApiUsageLog, feeding the admin
 * usage-analytics endpoints. Uses finalize() (not map/tap) so it never
 * touches the emitted value — safe for SSE routes too, unlike a naive
 * response-wrapping interceptor (see the Phase 7 TransformInterceptor fix).
 */
@Injectable()
export class UsageLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const start = Date.now();
    let statusCode = this.resolveDefaultStatus(context, request.method);

    return next.handle().pipe(
      catchError((error: unknown) => {
        statusCode = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        return throwError(() => error);
      }),
      finalize(() => {
        const user = request.user as CurrentUserPayload | undefined;
        this.prisma.apiUsageLog
          .create({
            data: {
              userId: user?.userId,
              endpoint: request.originalUrl ?? request.url,
              method: request.method,
              statusCode,
              latencyMs: Date.now() - start,
            },
          })
          .catch(() => {
            // Logging must never break the request it's logging.
          });
      }),
    );
  }

  private resolveDefaultStatus(context: ExecutionContext, method: string): number {
    const explicit = this.reflector.get<number>(HTTP_CODE_METADATA, context.getHandler());
    if (explicit !== undefined) return explicit;
    return method === 'POST' ? HttpStatus.CREATED : HttpStatus.OK;
  }
}
