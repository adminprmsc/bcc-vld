import { existsSync, mkdirSync, unlink } from 'fs';
import { diskStorage } from 'multer';
import { extname, join, posix } from 'path';
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
} from './water-quality.constants';

export const SAMPLE_UPLOAD_DIR = join(process.cwd(), 'uploads', 'water-quality');

export function ensureUploadDirectory(): void {
  if (!existsSync(SAMPLE_UPLOAD_DIR)) {
    mkdirSync(SAMPLE_UPLOAD_DIR, { recursive: true });
  }
}

ensureUploadDirectory();

export const waterQualityUploadOptions = {
  storage: diskStorage({
    destination(_req, _file, cb) {
      ensureUploadDirectory();
      cb(null, SAMPLE_UPLOAD_DIR);
    },
    filename(_req, file, cb) {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname) || '';
      cb(null, `sample-${timestamp}-${random}${ext}`);
    },
  }),
  fileFilter(
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) {
    if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      cb(new Error('Unsupported attachment type.'), false);
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: MAX_UPLOAD_FILES,
  },
};

export function storedNameForFile(filename: string): string {
  return posix.join('water-quality', filename);
}

export function cleanupFiles(files: Express.Multer.File[] | undefined): void {
  if (!Array.isArray(files)) {
    return;
  }
  files.forEach((file) => {
    if (file?.path) {
      unlink(file.path, () => undefined);
    }
  });
}

export const WATER_QUALITY_FILES_INTERCEPTOR = {
  fieldName: 'attachments',
  maxCount: MAX_UPLOAD_FILES,
};
