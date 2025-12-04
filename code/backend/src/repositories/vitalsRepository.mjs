import { constant } from "../config/constat.mjs";
import { env } from "../config/env.mjs";

export async function getVitals(influxClient, deviceId, minutes) {
    const { queryApi } = influxClient;
    const measurements = Object.keys(constant.influxVitalsMap);
    
    const vitalsData = {};

    const queryPromises = measurements.map(async (measurement) => {
        const fluxQuery = `
            from(bucket: "${env.influx.bucket}")
              |> range(start: -${minutes}m)
              |> filter(fn: (r) => r["device_id"] == "${deviceId}")
              |> filter(fn: (r) => r["_measurement"] == "${measurement}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> sort(columns: ["_time"], desc: false)
        `;
        const results = await queryApi.collectRows(fluxQuery);
        const vitalKey = constant.influxVitalsMap[measurement];
        vitalsData[vitalKey] = results.map(r => r._value);
    });
    
    await Promise.all(queryPromises);
    return vitalsData;
}