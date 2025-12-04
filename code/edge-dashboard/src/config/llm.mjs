import { ChatOllama } from "@langchain/ollama";
import { env } from "./env.mjs";

let client;

export async function getClassificationModel() {
    if (client) return client;
    client = new ChatOllama({
        model: env.classification.model,
        baseUrl: env.ollama.baseUrl,
        temperature: env.classification.temperature,
    });
    return client;
}