import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ requestId?: string }>();
    const res = ctx.getResponse<{ status: (n: number) => any; json: (v: any) => any }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = exception instanceof HttpException ? exception.getResponse() : { message: 'Internal server error' };
    const message = typeof response === 'string' ? response : (response as any).message || 'Internal server error';

    res.status(status).json({
      error: message,
      requestId: req.requestId,
      statusCode: status,
    });
  }
}
