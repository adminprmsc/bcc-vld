import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MobileUploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    response.status(400).json({ msg: exception.message });
  }
}

export function assertMulterFileFilterError(err: unknown): void {
  if (err instanceof Error && err.message === 'Unsupported file type') {
    throw new BadRequestException({ msg: err.message });
  }
}
