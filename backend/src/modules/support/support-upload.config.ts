import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const SUPPORT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'support');

export const SUPPORT_ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

ensureDir(SUPPORT_UPLOAD_DIR);

export const supportUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      ensureDir(SUPPORT_UPLOAD_DIR);
      cb(null, SUPPORT_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname) || '';
      cb(null, `support-${timestamp}-${random}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (SUPPORT_ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Unsupported attachment type. Allowed formats: pdf, images, word, excel, txt.'));
  },
};
