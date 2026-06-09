import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { storageService } from '../services/storage.service.js';

// --- Storage Configuration ---

const memoryStorage = multer.memoryStorage();

function buildObjectKey(folder: string, originalName: string): { key: string; filename: string } {
  const ext = path.extname(originalName).toLowerCase();
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const prefix = env.S3_KEY_PREFIX.replace(/^\/+|\/+$/g, '');
  const key = [prefix, folder, filename].filter(Boolean).join('/');

  return { key, filename };
}

// --- Slides Upload ---

const SLIDES_EXTENSIONS = ['.pptx', '.ppt', '.pdf'];
const MAX_SLIDES_SIZE = 50 * 1024 * 1024; // 50MB

const slidesFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (SLIDES_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: ${SLIDES_EXTENSIONS.join(', ')}`));
  }
};

const slidesUpload = multer({
  storage: memoryStorage,
  fileFilter: slidesFilter,
  limits: { fileSize: MAX_SLIDES_SIZE },
});

// --- Video Upload ---

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB

const videoFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (VIDEO_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: ${VIDEO_EXTENSIONS.join(', ')}`));
  }
};

const videoUpload = multer({
  storage: memoryStorage,
  fileFilter: videoFilter,
  limits: { fileSize: MAX_VIDEO_SIZE },
});

// --- Image Upload ---

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext) && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: ${IMAGE_EXTENSIONS.join(', ')}`));
  }
};

const imageUpload = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
});

async function handleS3Upload(
  req: Request,
  res: Response,
  next: NextFunction,
  options: { folder: string; missingMessage: string }
): Promise<void> {
  try {
    if (!req.file) {
      sendError(res, 400, 'NO_FILE', options.missingMessage);
      return;
    }

    const { key, filename } = buildObjectKey(options.folder, req.file.originalname);
    const uploaded = await storageService.uploadFile({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
    });

    sendSuccess(res, {
      url: uploaded.url,
      key: uploaded.key,
      filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    }, 201);
  } catch (error) {
    next(error);
  }
}

// --- Router ---

const uploadRouter = Router();

// All upload routes require authentication
uploadRouter.use(authenticate);

/**
 * POST /api/uploads/slides
 * Upload a slides file (pptx, ppt, pdf). Max 50MB.
 * Returns the public URL to access the file.
 */
uploadRouter.post(
  '/slides',
  slidesUpload.single('file'),
  (req: Request, res: Response, next: NextFunction): void => {
    void handleS3Upload(req, res, next, {
      folder: 'slides',
      missingMessage: 'No file uploaded. Please select a file.',
    });
  }
);

/**
 * POST /api/uploads/video
 * Upload a video file (mp4, webm, ogg, mov, avi, mkv). Max 20MB.
 * Returns the public URL to access the file.
 */
uploadRouter.post(
  '/video',
  videoUpload.single('file'),
  (req: Request, res: Response, next: NextFunction): void => {
    void handleS3Upload(req, res, next, {
      folder: 'videos',
      missingMessage: 'No file uploaded. Please select a video file.',
    });
  }
);

/**
 * POST /api/uploads/images
 * Upload an image file (png, jpg, jpeg, webp). Max 5MB.
 * Returns the public URL to access the file.
 */
uploadRouter.post(
  '/images',
  imageUpload.single('file'),
  (req: Request, res: Response, next: NextFunction): void => {
    void handleS3Upload(req, res, next, {
      folder: 'images',
      missingMessage: 'No file uploaded. Please select an image file.',
    });
  }
);

export default uploadRouter;
