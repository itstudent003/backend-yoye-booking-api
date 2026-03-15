import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const uploadPath = join(process.cwd(), 'image', 'upload', 'events');
mkdirSync(uploadPath, { recursive: true });

export const eventImageStorage = diskStorage({
  destination: uploadPath,
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const imageFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
    return cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'), false);
  }
  cb(null, true);
};
