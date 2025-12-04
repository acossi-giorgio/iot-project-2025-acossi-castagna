import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, removeAdditional: "failing" });

const startSessionRequestValidator = ajv.compile({
    type: "object",
    additionalProperties: false,
    required: ["deviceId"],
    properties: {
        deviceId: { type: "string" }
    }
});

export function validateStartSessionRequest(data) {
    const valid = startSessionRequestValidator(data);
    if (valid) return { valid: true };
    return {
        valid: false,
        errors: startSessionRequestValidator.errors?.map(e => ({
            field: e.instancePath || e.params.missingProperty || "",
            message: e.message,
            keyword: e.keyword
        })) || []
    };
}

const endSessionRequestValidator = ajv.compile({
    type: "object",
    additionalProperties: false,
    required: ["deviceId", "sessionId"],
    properties: {
        deviceId: { type: "string" },
        sessionId: { type: "string" }
    }
});

export function validateEndSessionRequest(data) {
    const valid = endSessionRequestValidator(data);
    if (valid) return { valid: true };
    return {
        valid: false,
        errors: endSessionRequestValidator.errors?.map(e => ({
            field: e.instancePath || e.params.missingProperty || "",
            message: e.message,
            keyword: e.keyword
        })) || []
    };
}