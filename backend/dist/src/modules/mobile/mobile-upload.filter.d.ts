import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { MulterError } from 'multer';
export declare class MobileUploadExceptionFilter implements ExceptionFilter {
    catch(exception: MulterError, host: ArgumentsHost): void;
}
export declare function assertMulterFileFilterError(err: unknown): void;
