import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

export class StorageService {
  constructor() {
    if (!fs.existsSync(config.storage.uploadDir)) {
      fs.mkdirSync(config.storage.uploadDir, { recursive: true });
    }
  }

  getFilePath(fileId: string, extension: string): string {
    return path.join(config.storage.uploadDir, `${fileId}${extension}`);
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`[StorageService] Failed to delete file: ${filePath}`, err);
      return false;
    }
  }

  async cleanupExpiredFiles(): Promise<number> {
    try {
      const files = await fs.promises.readdir(config.storage.uploadDir);
      const now = Date.now();
      const maxAgeMs = config.storage.retentionDays * 24 * 60 * 60 * 1000;
      let count = 0;

      for (const file of files) {
        const fullPath = path.join(config.storage.uploadDir, file);
        const stats = await fs.promises.stat(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.promises.unlink(fullPath);
          count++;
        }
      }
      return count;
    } catch (err) {
      console.error('[StorageService] Cleanup failed:', err);
      return 0;
    }
  }
}

export const storageService = new StorageService();
