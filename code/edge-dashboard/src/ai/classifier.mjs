import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getClassificationModel } from "../config/llm.mjs";
import { logger } from "../config/logger.mjs";
import { cleanRawResponse } from "../common/utils.mjs";

const SYSTEM_PROMPT = `
    You are an expert Medical Domain Classifier.
    Your task is to determine if a user's input is related to the biomedical or healthcare domain, CONSIDERING THE CONTEXT of previous user questions.

    ### DOMAIN DEFINITION:
    -   **IN DOMAIN**: Symptoms (e.g., fever, pain, cough, headache), diseases, medications, treatments, anatomy, physiology, mental health, nutrition, fitness, medical devices, healthcare logistics.
    -   **PERMISSIVE RULES**: 
        -   **CRITICAL**: If the input mentions ANY symptom (like "fever", "pain", "hurt", "sick"), it is **ALWAYS IN DOMAIN**.
        -   Questions asking for advice on what to do about a health condition (e.g., "what i could do?") are **IN DOMAIN**.
        -   Greetings, closings, and polite conversation are **IN DOMAIN**.
        -   Follow-up questions (e.g., "Why?", "How much?", "And then?") that relate to previous medical topics are **IN DOMAIN**.
        -   If the input is ambiguous but could plausibly be part of a health conversation, treat it as **IN DOMAIN**.
    -   **OUT OF DOMAIN**: Explicitly unrelated topics like Politics, Sports, Entertainment, Coding, Finance, Mathematics, General Trivia (unless health-related).

    ### OUTPUT FORMAT:
    Return **ONLY** a valid JSON object with the following structure:
    {
        "valid": <boolean>,
        "message": <string>
    }

    ### RULES:
    1.  If **IN DOMAIN**:
        -   "valid": true
        -   "message": "OK"
    2.  If **OUT OF DOMAIN**:
        -   "valid": false
        -   "message": "I can only assist with medical and health-related questions. Please ask about symptoms, treatments, or health data."

    ### OUTPUT FORMAT:
    1.  **Reasoning**: If you perform any internal reasoning, you **MUST** enclose it within \`<think>...</think>\` tags.
    2.  **Final Output**: Return **ONLY** a valid JSON object with keys "valid" (boolean) and "message" (string).
    3.  **Constraints**: **NO** markdown, **NO** explanations, **NO** extra text outside of think tags. Just the JSON.
`;

const HUMAN_TEMPLATE = `
    PREVIOUS USER QUESTIONS:
    {history}

    CURRENT USER QUESTION:
    {question}
    
    Return **ONLY** a valid JSON object. 
    Return ONLY minified JSON: {{"valid": <bool>, "message": <string>}} (no text, no markdown).
    **Reasoning**: If you perform any internal reasoning, you **MUST** enclose it within \`<think>...</think>\` tags.

`;

const llm = await getClassificationModel();

function parseDomain(raw) {
  const text = cleanRawResponse(raw);
  if (!text) {
    return { valid: false, message: "Risposta vuota dal modello" };
  }
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.valid === "boolean" && typeof parsed.message === "string") {
      return parsed;
    }
    return { valid: false, message: "Format not valid" };
  } catch (e) {
    logger.warn(`Failed parse JSON: ${text}`);
    return { valid: false, message: "Response not valid JSON" };
  }
}

export async function classifyDomain(question, history = []) {
  const historyText = history.length > 0 ? history.join("\n") : "None";
  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate('{system}'),
    HumanMessagePromptTemplate.fromTemplate(HUMAN_TEMPLATE)
  ]);
  const chain = prompt.pipe(llm).pipe(new StringOutputParser());
  const raw = await chain.invoke({ system: SYSTEM_PROMPT, question, history: historyText });
  return parseDomain(raw);
}