import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  MAX_UPLOAD_FILE_SIZE,
  MAX_UPLOAD_FILES,
  PLAN_ALLOWED_MIME_TYPES,
  UPLOAD_SUBDIR,
} from './consultant-plans.constants';

export function getConsultantPlansUploadDir(): string {
  const dir = join(process.cwd(), 'uploads', UPLOAD_SUBDIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export const consultantPlansUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination(_req, _file, cb) {
      cb(null, getConsultantPlansUploadDir());
    },
    filename(_req, file, cb) {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname) || '';
      cb(null, `plan-${timestamp}-${random}${ext}`);
    },
  }),
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE,
    files: MAX_UPLOAD_FILES,
  },
  fileFilter(_req, file, cb) {
    if (PLAN_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new BadRequestException({ msg: 'Unsupported attachment type.' }), false);
  },
};
