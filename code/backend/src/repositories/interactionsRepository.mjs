import { env } from "../config/env.mjs";

export async function getInteractions(db, sessionId, limit) {
  const col = db.collection(env.mongo.collections.interactions);
  const rows = await col.find({ sessionId }).sort({ createdAt: -1 }).limit(limit).toArray();
  return rows.reverse();
}

export async function createInteraction(db, type, sessionId, deviceId, question, rephrasedQuestion, answer, chunks = [], vitals = [], diagnosis = []) {
  const col = db.collection(env.mongo.collections.interactions);
    const interaction = {
        type,
        sessionId,
        deviceId,
        question,
        rephrasedQuestion,
        answer,
        chunks,
        vitals,
        diagnosis,
        createdAt: new Date(),
    }
    await col.insertOne(interaction);
}
