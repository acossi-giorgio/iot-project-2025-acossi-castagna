import { validateStartSessionRequest, validateEndSessionRequest } from "../schemas/sessionSchema.mjs";
import { getDevice } from "../repositories/devicesRepository.mjs";
import { getMongoDb } from "../config/database.mjs";
import { createSession, updateSessionStatus, getLastDeviceSession, getSession } from "../repositories/sessionsRepository.mjs";
import { constant } from "../config/constat.mjs";
import { logger } from "../config/logger.mjs";

export async function startSessionHandler(req, res) {
    const logPrefix = "| startSessionHandler |";
    try {
    logger.info(`${logPrefix} Start session request received`);

        const body = req.body || {};
        const { valid, errors } = validateStartSessionRequest(body);
        if (!valid) return res.status(400).json({ error: "Invalid request body", details: errors });
    
        const { deviceId } = body;
        const db = await getMongoDb();
        const device = await getDevice(db, deviceId);

        if (!device) return res.status(400).json({ error: "Device not registered" });

        const lastSession = await getLastDeviceSession(db, deviceId);

        if (lastSession && lastSession.status === constant.sessionStatus.active)
            await updateSessionStatus(db, lastSession._id, constant.sessionStatus.inactive);

        const sessionId = await createSession(db, deviceId);
        logger.info(`${logPrefix} Session ${sessionId} started for device ${deviceId}`);
        return res.status(201).json({ sessionId });

    } catch (err) {

        logger.error(`${logPrefix} ${err?.name} ${err?.message}`, { stack: err?.stack });
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function endSessionHandler(req, res) {
    const logPrefix = "| endSessionHandler |";
    try {
        logger.info(`${logPrefix} End session request received`);

        const body = req.body || {};
        const { valid, errors } = validateEndSessionRequest(body);

        if (!valid)
            return res.status(400).json({ error: "Invalid request body", details: errors });

        const { deviceId, sessionId } = body;
        const db = await getMongoDb();
        const device = await getDevice(db, deviceId);

        if (!device)
            return res.status(400).json({ error: "Device not found" });

        const session = await getSession(db, sessionId);
        if (!session)
            return res.status(400).json({ error: "Session not found" });

        if (session.status === constant.sessionStatus.inactive)
            return res.status(200).json();

        if (session.deviceId !== deviceId)
            return res.status(400).json({ error: "Session does not belong to device" });

        await updateSessionStatus(db, sessionId, constant.sessionStatus.inactive);
        logger.info(`${logPrefix} Session ${sessionId} ended for device ${deviceId}`);
        return res.status(200).json();

    } catch (err) {
        logger.error(`${logPrefix} ${err?.name} ${err?.message}`, { stack: err?.stack });
        return res.status(500).json({ error: "Internal Server Error" });
    }
}