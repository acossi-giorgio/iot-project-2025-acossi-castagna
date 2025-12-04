import express from 'express';
import { getLastMetrics } from '../services/metricsService.mjs';
import { env } from '../config/env.mjs';
import { logger } from '../config/logger.mjs';

export const router = express.Router();

router.get('/recent', async (req, res) => {
  const logPrefix = '| GET /metrics/recent |';
  try {
    logger.info(`${logPrefix} Get metrics request received`);
  const data = await getLastMetrics(env.metricsWindowMinutes);
  res.status(200).json({ ...data, windowMinutes: env.metricsWindowMinutes });
  } catch (e) {
    logger.error(`${logPrefix} ${e?.name} ${e?.message}`, { stack: e?.stack });
    res.status(500).json({ error: { name: e.name, message: e.message, stack: e.stack } });
  }
});