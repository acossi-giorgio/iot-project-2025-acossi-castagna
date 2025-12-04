import { hasSession } from '../services/sessionService.mjs';

export async function requireSession(req, res, next) {
  const id = req.query.sessionId || req.headers['x-session-id'];
  if (!id) {
    return res.redirect('/session');
  }
  try {
    const ok = await hasSession(id);
    if (!ok) return res.redirect('/session');
    res.locals.sessionId = id;
    next();
  } catch (e) {
    return res.redirect('/session');
  }
}
