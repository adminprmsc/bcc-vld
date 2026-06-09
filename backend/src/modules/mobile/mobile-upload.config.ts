import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { diskStorage } from 'multer';

export const MOBILE_UPLOAD_DIR = join(process.cwd(), 'uploads', 'mobile');

if (!existsSync(MOBILE_UPLOAD_DIR)) {
  mkdirSync(MOBILE_UPLOAD_DIR, { recursive: true });
}

export const mobileMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => cb(null, MOBILE_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname) || '';
      cb(null, `mobile-${timestamp}-${random}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  },
};
