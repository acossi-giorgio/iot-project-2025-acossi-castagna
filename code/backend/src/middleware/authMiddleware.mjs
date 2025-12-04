import { env } from "../config/env.mjs";

export function authMiddleware(req, res, next) {
    const apiKey = env.apiKey;
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: Missing Authorization Header' });
    }

    if (authHeader === apiKey) {
        return next();
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
}
