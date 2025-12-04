import { getVitals } from "../repositories/vitalsRepository.mjs";
import { getInfluxDb } from "../config/database.mjs";
import { env } from "../config/env.mjs";

export async function getVitalsStatistics (deviceId) {

    const influxDb = await getInfluxDb();
    const vitals = await getVitals(influxDb, deviceId, env.vitals.lookbackMinutes);

    const vitalsStatistics = {};

    for (const [type, values] of Object.entries(vitals)) {
        if (!values || values.length === 0) {
            vitalsStatistics[type] = null;
            continue;
        }

        const sorted = [...values].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const sum = sorted.reduce((a, b) => a + b, 0);
        const mean = sum / sorted.length;
        
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

        const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
        const stdDev = Math.sqrt(variance);

        vitalsStatistics[type] = {
            min,
            max,
            mean,
            median,
            stdDev,
            count: values.length,
            latest: values[values.length - 1]
        };
    }

    return vitalsStatistics;
}

export function formatVitals(vitalsStatistics) {
    if (!vitalsStatistics) return "No vitals data available.";

    const readableNames = {
        hr: "Heart Rate (bpm)",
        rr: "Respiration Rate (breaths/min)",
        spo2: "Oxygen Saturation (%)",
        temp: "Body Temperature (°C)",
        sbp: "Systolic Blood Pressure (mmHg)",
        dbp: "Diastolic Blood Pressure (mmHg)",
        glucose: "Blood Glucose (mg/dL)"
    };

    return Object.entries(vitalsStatistics).map(([key, stats]) => {
        const name = readableNames[key] || key.toUpperCase();
        if (!stats) return `- ${name}: No data recorded in the last window.`;
        
        return `
        - ${name}:
            - Latest Value: ${stats.latest}
            - Average: ${stats.mean.toFixed(1)}
            - Range: ${stats.min} - ${stats.max}
            - Variability: ${stats.stdDev.toFixed(2)}`;
    }).join("\n");
}