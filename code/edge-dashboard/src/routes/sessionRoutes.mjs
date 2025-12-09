import express from 'express';
import { startSession, endSession, hasSession } from '../services/sessionService.mjs';
import { deleteMetrics } from '../services/metricsService.mjs';
import { deleteChat } from '../services/chatService.mjs';
import { logger } from '../config/logger.mjs';

export const router = express.Router();

router.post('/', async (req, res) => {
  const logPrefix = '| POST /session |';
  try {
    logger.info(`${logPrefix} Start session request received`);
    const { sessionId, offline } = await startSession();
    return res.status(201).json({id: sessionId, offline});
  } catch (e) {
    logger.error(`${logPrefix} ${e?.name} ${e?.message}`, { stack: e?.stack });
    res.status(500).json({ error: { name: e.name, message: e.message, stack: e.stack } });
  }
});

router.get('/:id', async (req, res) => {
  const logPrefix = '| GET /session/id |';
  try {
    logger.info(`${logPrefix} Check session existence request received`);
    const { id } = req.params;
    const exists = await hasSession(id);
    if (!exists) return res.status(410).json();
    res.status(200).json();
  } catch (e) {
    logger.error(`${logPrefix} ${e?.name} ${e?.message}`, { stack: e?.stack });
    res.status(500).json({ error: { name: e.name, message: e.message, stack: e.stack } });
  }
});

router.delete('/:id', async (req, res) => {
  const logPrefix = '| DELETE /session/id |';
  try {
    logger.info(`${logPrefix} Delete session request received`);
    const { id } = req.params;
    await endSession(id);
    await deleteMetrics(id);
    await deleteChat(id);
    res.status(200).json();
  } catch (e) {
    logger.error(`${logPrefix} ${e?.name} ${e?.message}`, { stack: e?.stack });
    res.status(500).json({ error: { name: e.name, message: e.message, stack: e.stack } });
  }
});
