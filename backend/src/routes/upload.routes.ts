import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

// --- Storage Configuration ---

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Creates a multer storage that organizes files into subdirectories.
 * Path format: uploads/{subdir}/{timestamp}-{random}.{ext}
 */
function createStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOADS_DIR, subdir);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, uniqueName);
    },
  });
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
  storage: createStorage('slides'),
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
  storage: createStorage('videos'),
  fileFilter: videoFilter,
  limits: { fileSize: MAX_VIDEO_SIZE },
});

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
    try {
      if (!req.file) {
        sendError(res, 400, 'NO_FILE', 'No file uploaded. Please select a file.');
        return;
      }

      const fileUrl = `/uploads/slides/${req.file.filename}`;

      sendSuccess(res, {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      }, 201);
    } catch (error) {
      next(error);
    }
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
    try {
      if (!req.file) {
        sendError(res, 400, 'NO_FILE', 'No file uploaded. Please select a video file.');
        return;
      }

      const fileUrl = `/uploads/videos/${req.file.filename}`;

      sendSuccess(res, {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      }, 201);
    } catch (error) {
      next(error);
    }
  }
);

export default uploadRouter;
