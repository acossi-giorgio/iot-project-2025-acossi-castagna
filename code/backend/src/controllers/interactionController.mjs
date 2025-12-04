import { constant } from "../config/constat.mjs";
import { getMongoDb } from "../config/database.mjs";
import { getDevice } from "../repositories/devicesRepository.mjs";
import { createInteraction, getInteractions } from "../repositories/interactionsRepository.mjs";
import { getSession } from "../repositories/sessionsRepository.mjs";
import { getVitalsStatistics } from "../services/vitalsService.mjs";
import { validateAskInteractionRequest, validateSubmitInteractionRequest } from "../schemas/interactionSchema.mjs";
import { generateDataAnalysisResponse, generateChatResponse } from "../services/aiService.mjs";
import { getDocuments } from "../repositories/documentRepository.mjs";
import { makeDiagnosis } from "../services/diagnosisService.mjs"; 
import { env } from "../config/env.mjs";
import { logger } from "../config/logger.mjs";


export async function askInteractionHandler(req, res) {
    const logPrefix = "| askInteractionHandler |";
    try {
        logger.info(`${logPrefix} Ask interaction request received`);
        const body = req.body || {};
        const { valid, errors } = validateAskInteractionRequest(body);
        if (!valid) return res.status(400).json({ error: "Invalid request body", details: errors });
        const { deviceId, sessionId, question, dataAnalysis } = body;
        const db = await getMongoDb();
        const device = await getDevice(db, deviceId);

        if (!device) return res.status(400).json({ error: "Device not found" });

        const session = await getSession(db, sessionId);

        if (!session) return res.status(400).json({ error: "Session not found" });
        if (session.status !== constant.sessionStatus.active) return res.status(400).json({ error: "Session not inactive" });
        if (session.deviceId !== deviceId) return res.status(400).json({ error: "Session does not belong to device" });

        const interactions = await getInteractions(db, session._id, env.rag.nHistory);
        const documents = await getDocuments(db);
        const sources = documents.map(doc => doc.name);

        let payload = {};
        if(dataAnalysis) {
            logger.info(`${logPrefix} Performing Data Analysis interaction`);
            const vitalsStatistics = await getVitalsStatistics(deviceId);
            logger.debug(`${logPrefix} vitalsStatistics: ${JSON.stringify(vitalsStatistics)}`);
            const diagnosis = makeDiagnosis(vitalsStatistics);
            const { rephrasedQuestion, answer, chunks } = await generateDataAnalysisResponse(
                question, 
                sources, 
                vitalsStatistics, 
                interactions, 
                diagnosis
            );
            
            await createInteraction(
                db, 
                constant.interactionType.dataAnalysis,
                sessionId, 
                deviceId, 
                question, 
                rephrasedQuestion, 
                answer, 
                chunks, 
                vitalsStatistics, 
                diagnosis
            );

            payload = { 
                question, 
                rephrasedQuestion, 
                answer, 
                chunks, 
                vitalsStatistics, 
                diagnosis 
            }
        } else {
            logger.info(`${logPrefix} Performing RAG interaction`);
            const { rephrasedQuestion, answer, chunks } = await generateChatResponse(
                question,
                sources,
                interactions
            );

            await createInteraction(
                db,
                constant.interactionType.rag,
                sessionId,
                deviceId,
                question,
                rephrasedQuestion,
                answer,
                chunks,
                null,
                null
            );

            payload = {
                question,
                rephrasedQuestion,
                answer,
                chunks
            };
        }
        
        logger.info(`${logPrefix} Interaction processed successfully`);
        return res.status(200).json(payload);
    } catch (err) {
        logger.error(`${logPrefix} ${err?.name} ${err?.message}`, { stack: err?.stack });
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function submitInteractionHandler(req, res) {
    const logPrefix = "| submitInteractionHandler |";
    try {
        logger.info(`${logPrefix} Submit interaction request received`);
        const body = req.body || {};
        const { valid, errors } = validateSubmitInteractionRequest(body);
        if (!valid) return res.status(400).json({ error: "Invalid request body", details: errors });
        const { deviceId, sessionId, question, answer } = body;
        
        const db = await getMongoDb();
        const device = await getDevice(db, deviceId);

        if (!device) return res.status(400).json({ error: "Device not found" });

        const session = await getSession(db, sessionId);

        if (!session) return res.status(400).json({ error: "Session not found" });
        if (session.status !== constant.sessionStatus.active) return res.status(400).json({ error: "Session not inactive" });
        if (session.deviceId !== deviceId) return res.status(400).json({ error: "Session does not belong to device" });

        await createInteraction(db, constant.interactionType.edge, sessionId, deviceId, question, '', answer);
        logger.info(`${logPrefix} Interaction processed successfully`);
        return res.status(200).json();

    } catch (err) {
        logger.error(`${logPrefix} ${err?.name} ${err?.message}`, { stack: err?.stack });
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
