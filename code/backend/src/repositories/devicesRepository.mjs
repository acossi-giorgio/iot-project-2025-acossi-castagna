import { env } from "../config/env.mjs";

export async function getDevice(db, deviceId){
  const devices = db.collection(env.mongo.collections.devices);
  return await devices.findOne({ _id: deviceId });
}

export async function updateDevice(db, deviceId, data){
  const devices = db.collection(env.mongo.collections.devices);
  await devices.updateOne({ _id: deviceId }, { $set: data });
}

