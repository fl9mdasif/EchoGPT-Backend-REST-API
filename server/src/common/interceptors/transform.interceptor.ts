import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Envelope<T> {
  data: T;
  meta?: unknown;
}

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
 * through untouched instead of being double-wrapped.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Envelope<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Envelope<T>> {
    return next.handle().pipe(
      map((result): Envelope<T> =>
        isAlreadyEnveloped(result) ? (result as Envelope<T>) : { data: result },
      ),
    );
  }
}
