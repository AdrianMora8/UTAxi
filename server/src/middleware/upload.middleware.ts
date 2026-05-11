import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../config/cloudinary';
import { AppError } from './errorHandler';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const imageOnlyMimes = ['image/jpeg', 'image/png', 'image/webp'];

export const uploadEvidence = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Solo se permiten imágenes (jpeg, png, webp) o PDF'));
    }
  },
}).array('evidence', 3);

const vehiclePhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'utaxi/vehicles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
  } as any,
});

export const uploadVehiclePhoto = multer({
  storage: vehiclePhotoStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (imageOnlyMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Solo se permiten imágenes (jpeg, png, webp)'));
    }
  },
}).single('photo');
