import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';
import { REQUISITION_UPLOAD_DIR } from './requisition.constants';

const uploadDir = join(process.cwd(), REQUISITION_UPLOAD_DIR);

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

export const requisitionDiskStorage = diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export function getRequisitionUploadPath(fileName: string): string {
  return join(uploadDir, fileName);
}
