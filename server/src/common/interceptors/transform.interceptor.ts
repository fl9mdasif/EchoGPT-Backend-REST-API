import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Envelope<T> {
  data: T;
  meta?: unknown;
}

// Not part of @nestjs/common's public exports — the @Sse() decorator sets
// this same literal internally (see its source). Pinned here rather than
// deep-importing a package-internal path; worth re-checking on a Nest
// major-version bump.
const SSE_METADATA = '__sse__';

function isAlreadyEnveloped(value: unknown): value is Envelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value
  );
}

/**
 * Wraps every successful response in a `{ data }` envelope so the API has one
 * consistent success shape, mirroring the `{ statusCode, message, ... }`
 * shape AllExceptionsFilter produces for errors. Paginated results that
 * already return `{ data, meta }` (see common/dto/paginated-result.ts) pass
 * through untouched instead of being double-wrapped. SSE routes (@Sse())
 * are skipped entirely — wrapping would bury MessageEvent's `type` field
 * inside `data`, breaking the `event:` line the SSE stream writer emits.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Envelope<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Envelope<T> | T> {
    const isSse = this.reflector.get<boolean>(SSE_METADATA, context.getHandler());
    if (isSse) return next.handle();

    return next.handle().pipe(
      map((result): Envelope<T> =>
        isAlreadyEnveloped(result) ? (result as Envelope<T>) : { data: result },
      ),
    );
  }
}
