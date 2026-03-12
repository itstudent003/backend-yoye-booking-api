import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IBaseResponseData, IResponseWithPaginate } from '../interfaces/response.interface';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<IBaseResponseData<unknown> | IResponseWithPaginate<unknown>> {
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((data) => {
        const hasPagination = data && (data.meta || data.pagination);

        if (hasPagination) {
          const { data: innerData, meta, pagination, message } = data;
          return {
            statusCode,
            message: message ?? 'success',
            data: innerData,
            ...(meta && { meta }),
            ...(pagination && { pagination }),
          } satisfies IResponseWithPaginate<unknown>;
        }

        return {
          statusCode,
          message: data?.message ?? 'success',
          data: data?.message ? (data.data ?? null) : (data ?? null),
        } satisfies IBaseResponseData<unknown>;
      }),
    );
  }
}
