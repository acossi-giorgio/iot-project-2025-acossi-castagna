import { env } from "../config/env.mjs";

export async function getDocuments(db){
  const devices = db.collection(env.mongo.collections.documents);
  return await devices.find().toArray();
}

export async function createDocument(db, name) {
  const documents = db.collection(env.mongo.collections.documents);
  const result = await documents.insertOne({ name, createdAt: new Date() });
  return result.insertedId;
}

export async function getDocument(db, documentName){
  const devices = db.collection(env.mongo.collections.documents);
  return await devices.findOne({ name: documentName });
}