import express from 'express';
import { requireSession } from '../middleware/sessionMiddleware.mjs';
import { getMessages } from '../services/chatService.mjs';

export const router = express.Router();

router.get(['/', '/session'], (req, res) => {
  res.render('session', { 
    pageTitle : 'Session',
    hideDock: true 
  });
});

router.get('/dashboard', requireSession, (req, res) => {
  const sessionId = res.locals.sessionId;
  const offline = req.query.offline === 'true';
  res.render('dashboard', { 
    pageTitle : 'Dashboard',
    sessionId: sessionId, 
    hideDock: false,
    offline: offline
  });
});

router.get('/chat', requireSession, async (req, res) => {
  const sessionId = res.locals.sessionId;
  const offline = req.query.offline === 'true';
  const messages = await getMessages(sessionId);
    res.render('chat', {
      pageTitle : 'Chat',
      sessionId: sessionId,
      messages: messages,
      hideDock: false,
      offline: offline
    });
});
