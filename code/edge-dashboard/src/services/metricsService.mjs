import { getRedis } from '../config/redis.mjs';
import { env } from '../config/env.mjs';

function parseMember(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    return JSON.parse(raw);
  }
  return raw;
}

async function zRange(key, cutoffTsMs) {
  const client = await getRedis();
  await client.zRemRangeByScore(key, 0, cutoffTsMs - 1);
  const result = await client.zRangeWithScores(key, cutoffTsMs, '+inf', { BY: 'SCORE' });
  return result.map(({ value: member, score }) => {
    const parsed = parseMember(member) || {};
    const numericValue = Number(parsed.value);
    const ts = parsed.ts ? Date.parse(parsed.ts) : Number(score);
    return {
      value: Number.isFinite(numericValue) ? numericValue : null,
      ts,
      raw: parsed
    };
  }).filter(p => p.ts && Number.isFinite(p.ts));
}

export async function getLastMetrics(minutes) {
  const cutoff = Date.now() - minutes * 60 * 1000;

  const [hr, rr, spo2, temp, gluco, bpSys, bpDia] = await Promise.all([
    zRange(env.data.metrics.hr, cutoff),
    zRange(env.data.metrics.rr, cutoff),
    zRange(env.data.metrics.spo2, cutoff),
    zRange(env.data.metrics.temp, cutoff),
    zRange(env.data.metrics.gluco, cutoff),
    zRange(env.data.metrics.bpSys, cutoff),
    zRange(env.data.metrics.bpDia, cutoff)
  ]);

  const summary = {
    hr: hr.at(-1)?.value ?? null,
    rr: rr.at(-1)?.value ?? null,
    spo2: spo2.at(-1)?.value ?? null,
    temp: temp.at(-1)?.value ?? null,
    gluco: gluco.at(-1)?.value ?? null,
    bp_sys: bpSys.at(-1)?.value ?? null,
    bp_dia: bpDia.at(-1)?.value ?? null
  };

  const getSeries = series => ({
    labels: series.map(p => p.raw?.ts || p.ts),
    data: series.map(p => p.value)
  });

  return {
    summary,
    hr: getSeries(hr),
    rr: getSeries(rr),
    spo2: getSeries(spo2),
    temp: getSeries(temp),
    gluco: getSeries(gluco),
    bp_sys: getSeries(bpSys),
    bp_dia: getSeries(bpDia)
  };
}

export async function deleteMetrics() {
  const client = await getRedis();
  const keys = [
    env.data.metrics.hr,
    env.data.metrics.rr,
    env.data.metrics.spo2,
    env.data.metrics.temp,
    env.data.metrics.gluco,
    env.data.metrics.bpSys,
    env.data.metrics.bpDia
  ].filter(Boolean);
  await Promise.all(keys.map((k) => client.del(k)));
}
