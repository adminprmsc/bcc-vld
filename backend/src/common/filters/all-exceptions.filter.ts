import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'msg' in body) {
        response.status(status).json(body);
        return;
      }
      if (typeof body === 'object' && body !== null && 'errors' in body) {
        response.status(status).json(body);
        return;
      }
      response.status(status).json({ msg: exception.message });
      return;
    }

    console.error('Server Error:', {
      message: exception instanceof Error ? exception.message : String(exception),
      stack: process.env.NODE_ENV === 'development' && exception instanceof Error ? exception.stack : undefined,
      path: request?.path,
      method: request?.method,
    });

    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ msg: message });
  }
}
