import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string; headers: Record<string, string> }>();
    const res = http.getResponse<{ setHeader: (key: string, value: string) => void }>();

    const incoming = req.headers?.['x-request-id'];
    const requestId = incoming && String(incoming).trim() ? String(incoming) : randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);

    return next.handle();
  }
}
