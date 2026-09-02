import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import fs from 'fs';

const ALLOWED_EXTENSIONS = new Set(['.wav', '.flac', '.mp3', '.ogg', '.m4a', '.webm']);
const ALLOWED_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/flac',
  'audio/x-flac',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/x-m4a',
  'audio/m4a',
  'audio/mp4',
  'audio/webm',
  'video/webm',
  'application/octet-stream',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(config.storage.uploadDir)) {
      fs.mkdirSync(config.storage.uploadDir, { recursive: true });
    }
    cb(null, config.storage.uploadDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
      const mime = (file.mimetype || '').toLowerCase();
      if (mime.includes('webm')) ext = '.webm';
      else if (mime.includes('wav')) ext = '.wav';
      else if (mime.includes('flac')) ext = '.flac';
      else if (mime.includes('ogg')) ext = '.ogg';
      else if (mime.includes('mp4') || mime.includes('m4a')) ext = '.m4a';
      else if (mime.includes('mpeg') || mime.includes('mp3')) ext = '.mp3';
      else ext = '.webm';
    }
    const uniqueId = `aud_${uuidv4().replace(/-/g, '')}`;
    cb(null, `${uniqueId}${ext}`);
  },
});

export const audioUpload = multer({
  storage,
  limits: {
    fileSize: config.storage.maxFileSize, // 50MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIME_TYPES.has(mime) || mime.startsWith('audio/')) {
      return cb(null, true);
    }
    return cb(new Error(`Unsupported audio format: ${ext || mime}. Supported: WAV, FLAC, MP3, OGG, M4A, WEBM`));
  },
});
