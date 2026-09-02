import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { mlService } from '../services/mlService.js';
import { DetectionRepository } from '../models/repository.js';
import { InvestigationRepository, EvidenceRepository, ChainOfCustodyRepository } from '../models/investigation_repository.js';
import { wsManager } from '../websocket/index.js';
import { storageService } from '../services/storageService.js';
import fs from 'fs';

export interface MLJobData {
  requestId: string;
  userId?: string | null;
  filePath: string;
  fileName: string;
  fileSize: number;
}

let redisConnection: Redis | null = null;
let detectionQueue: Queue | null = null;
let detectionWorker: Worker | null = null;
let useMemoryQueue = true;

// In-memory fallback async worker queue
const inMemoryQueue: MLJobData[] = [];
let isProcessingMemoryQueue = false;

export async function initQueue(): Promise<void> {
  if (config.redis.enabled) {
    try {
      redisConnection = new Redis(config.redis.url, {
        maxRetriesPerRequest: null,
        connectTimeout: 3000,
      });

      await redisConnection.ping();
      useMemoryQueue = false;

      detectionQueue = new Queue('detection-jobs', { connection: redisConnection });
      detectionWorker = new Worker(
        'detection-jobs',
        async (job: Job<MLJobData>) => {
          await processDetectionJob(job.data);
        },
        { connection: redisConnection, concurrency: 5 }
      );

      console.log('[Queue] Connected to Redis. BullMQ workers active.');
    } catch (err: any) {
      console.warn(`[Queue] Redis unavailable (${err.message}). Using resilient in-memory asynchronous worker.`);
      useMemoryQueue = true;
    }
  } else {
    console.log('[Queue] Redis disabled. Using in-memory asynchronous job worker.');
    useMemoryQueue = true;
  }
}

export async function enqueueDetection(data: MLJobData): Promise<void> {
  if (!useMemoryQueue && detectionQueue) {
    await detectionQueue.add('process-audio', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
  } else {
    // Process asynchronously via event loop
    inMemoryQueue.push(data);
    processNextInMemoryJob();
  }
}

async function processNextInMemoryJob() {
  if (isProcessingMemoryQueue || inMemoryQueue.length === 0) return;
  isProcessingMemoryQueue = true;

  const jobData = inMemoryQueue.shift();
  if (jobData) {
    try {
      await processDetectionJob(jobData);
    } catch (err) {
      console.error(`[Queue] Error processing in-memory job ${jobData.requestId}:`, err);
    }
  }

  isProcessingMemoryQueue = false;
  if (inMemoryQueue.length > 0) {
    setImmediate(processNextInMemoryJob);
  }
}

export async function processDetectionJob(jobData: MLJobData): Promise<any> {
  const { requestId, userId, filePath, fileName } = jobData;
  console.log(`[Queue] Processing detection request ${requestId} for file ${fileName}...`);

  try {
    // 1. Execute ML Inference via FastAPI service
    const prediction = await mlService.predict(filePath, fileName, requestId);

    // 2. Save result in Database
    const savedResult = await DetectionRepository.saveResult({
      request_id: requestId,
      user_id: userId,
      prediction: prediction.prediction,
      confidence: prediction.confidence,
      risk_score: prediction.risk_score,
      fraud_risk: prediction.fraud_risk,
      spoof_probability: prediction.spoof_probability,
      bona_fide_probability: prediction.bona_fide_probability,
      raw_probability: prediction.raw_probability,
      processing_time_ms: prediction.processing_time_ms,
      model_name: prediction.model_name,
      model_version: prediction.model_version,
      checkpoint_hash: prediction.checkpoint_hash,
      forensics_json: prediction.forensics,
      explainability_json: prediction.explainability,
    });

    // 3. Emit Realtime WebSocket Notifications
    wsManager.notifyRequest(requestId, 'DETECTION_COMPLETED', savedResult);
    if (userId) {
      wsManager.notifyUser(userId, 'DETECTION_COMPLETED', savedResult);
    }

    // Only emit high risk broadcast if confirmed SPOOF with high risk score (>=70)
    if (savedResult.risk_score >= 70 && savedResult.prediction === 'SPOOF') {
      wsManager.broadcast('HIGH_RISK_DETECTED', {
        requestId,
        riskScore: savedResult.risk_score,
        confidence: savedResult.confidence,
        prediction: savedResult.prediction,
        timestamp: new Date().toISOString(),
      });
      
      // Auto-create Investigation Case for Law Enforcement Mode
      try {
        const fraudIndicators = [];
        if (savedResult.spoof_probability > 90) fraudIndicators.push('HIGH_AI_PROBABILITY');
        if (savedResult.risk_score > 85) fraudIndicators.push('EXTREME_FRAUD_RISK');
        
        const newCase = await InvestigationRepository.createCase({
          incident_id: requestId,
          caller_identifier: 'UNKNOWN', 
          risk_score: savedResult.risk_score,
          voice_ai_probability: savedResult.spoof_probability,
          voice_clone_probability: savedResult.spoof_probability * 0.9, // approximation for now
          fraud_indicators: fraudIndicators,
          status: 'OPEN'
        });
        
        const evidence = await EvidenceRepository.addEvidence({
          case_id: newCase.case_id,
          source: 'VOICESHIELD_ML_PIPELINE',
          collector: 'SYSTEM_AUTO',
          sha256_hash: savedResult.checkpoint_hash || 'NO_HASH',
          mime_type: 'application/json',
          size_bytes: JSON.stringify(savedResult).length,
          storage_reference: `DETECTION_${requestId}`,
          chain_of_custody_id: `coc_${Date.now()}`,
          evidence_type: 'ML_ANALYSIS'
        });
        
        await ChainOfCustodyRepository.logEvent({
          case_id: newCase.case_id,
          evidence_id: evidence.evidence_id,
          action: 'EVIDENCE_CREATED',
          actor_id: 'SYSTEM_AUTO',
          reason: 'Automatic case generation due to high fraud risk score',
        });
        
        console.log(`[Queue] Auto-generated Investigation Case ${newCase.case_id} for request ${requestId}`);
      } catch (caseErr) {
        console.error(`[Queue] Failed to auto-generate Investigation Case for request ${requestId}:`, caseErr);
      }
    }

    console.log(`[Queue] Detection completed for ${requestId}: ${savedResult.prediction} (${savedResult.confidence}%, Risk: ${savedResult.risk_score})`);
    return savedResult;
  } catch (err: any) {
    console.error(`[Queue] Failed to process detection request ${requestId}:`, err);

    // Update request status to failed
    const req = await DetectionRepository.findRequestById(requestId);
    if (req) {
      req.status = 'failed';
      req.error_message = err.message || 'ML Inference failed';
    }

    wsManager.notifyRequest(requestId, 'DETECTION_FAILED', {
      requestId,
      error: err.message || 'ML Inference error',
    });

    throw err;
  }
}

export function getQueueDepth(): number {
  return inMemoryQueue.length;
}
