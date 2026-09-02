import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { DetectionRepository, AuditRepository } from '../models/repository.js';
import { enqueueDetection, processDetectionJob } from '../queue/index.js';
import { mlService } from '../services/mlService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class DetectionController {
  static async createDetection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FILE', message: 'An audio file must be uploaded' },
        });
        return;
      }

      const file = req.file;
      const fileBuffer = await fs.promises.readFile(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const requestId = `req_${uuidv4().replace(/-/g, '')}`;
      const userId = req.user?.id || null;

      // 1. Create database record for request
      const detectionReq = await DetectionRepository.createRequest({
        request_id: requestId,
        user_id: userId,
        file_name: file.originalname,
        file_size_bytes: file.size,
        mime_type: file.mimetype,
        file_hash_sha256: fileHash,
        status: 'queued',
      });

      // 2. Audit log
      await AuditRepository.log({
        user_id: userId,
        action: 'AUDIO_UPLOAD_FOR_DETECTION',
        resource: 'detection_requests',
        resource_id: requestId,
        metadata_json: { filename: file.originalname, size: file.size },
        ip_address: req.ip,
      });

      const isSync = req.query.sync === 'true';

      if (isSync) {
        // Execute synchronously and return full prediction
        const result = await processDetectionJob({
          requestId,
          userId,
          filePath: file.path,
          fileName: file.originalname,
          fileSize: file.size,
        });

        res.status(200).json({
          success: true,
          status: 'completed',
          data: result,
        });
        return;
      }

      // Enqueue asynchronous job
      await enqueueDetection({
        requestId,
        userId,
        filePath: file.path,
        fileName: file.originalname,
        fileSize: file.size,
      });

      res.status(202).json({
        success: true,
        status: 'queued',
        message: 'Audio analysis request queued for processing',
        data: {
          request_id: requestId,
          filename: file.originalname,
          file_size_bytes: file.size,
          status: 'queued',
          status_url: `/api/v1/detection/${requestId}`,
          websocket_topic: `request:${requestId}`,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDetectionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const request = await DetectionRepository.findRequestById(id);

      if (!request) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Detection request ${id} not found` },
        });
        return;
      }

      const result = await DetectionRepository.getResultByRequestId(id);

      res.status(200).json({
        success: true,
        data: {
          request_id: request.request_id,
          file_name: request.file_name,
          file_size_bytes: request.file_size_bytes,
          status: request.status,
          error_message: request.error_message,
          created_at: request.created_at,
          result: result || null,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async validateAudio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FILE', message: 'An audio file must be uploaded' },
        });
        return;
      }

      const validation = await mlService.validateAudio(req.file.path, req.file.originalname);
      // Clean up temporary preflight file
      try {
        await fs.promises.unlink(req.file.path);
      } catch {}

      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getModelInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const info = await mlService.getModelInfo();
      res.status(200).json({
        success: true,
        data: info,
      });
    } catch (err) {
      next(err);
    }
  }
}
