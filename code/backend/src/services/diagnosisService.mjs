import { constant } from "../config/constat.mjs";

export function makeDiagnosis(vitalsStatistics) {
    if (!vitalsStatistics || typeof vitalsStatistics !== 'object')
        return [];

    const getStat = (key) => {
        const stat = vitalsStatistics[key];
        const defaults = { min: null, max: null, mean: null, latest: null };
        if (!stat) return defaults;
        return {
            min: stat.min ?? null,
            max: stat.max ?? null,
            mean: stat.mean ?? null,
            latest: stat.latest ?? null
        };
    };

    const hr = getStat(constant.sensorType.heartRate);
    const rr = getStat(constant.sensorType.respirationRate);
    const sbp = getStat(constant.sensorType.systolicBloodPressure);
    const dbp = getStat(constant.sensorType.diastolicBloodPressure);
    const temp = getStat(constant.sensorType.temperature);
    const spo2 = getStat(constant.sensorType.oxygenSaturation);
    const glucose = getStat(constant.sensorType.glucose);

    const computeMAP = (s, d) => (s != null && d != null ? (s + 2 * d) / 3 : null);
    const shockIndex = (h, s) => (h != null && s != null && s > 0 ? h / s : null);

    const MAP_latest = computeMAP(sbp.latest, dbp.latest);
    const SI_latest = shockIndex(hr.latest, sbp.latest);

    const codes = new Set();

    // ---------------------------------------------------------
    // 1. GLUCOSE (Hierarchy: DKA > Hyper | Severe Hypo > Hypo)
    // ---------------------------------------------------------
    
    // Hyperglycemia / DKA
    if (glucose.latest !== null && rr.latest !== null && glucose.latest > 200 && rr.latest > 24) {
        codes.add("DiabeticKetoacidosisRisk"); // Implies Hyperglycemia
    } else if (glucose.max !== null && glucose.max >= 200) {
        codes.add("Hyperglycemia");
    }

    // Hypoglycemia
    if (glucose.min !== null && glucose.min < 55) {
        codes.add("SevereHypoglycemia"); // Takes precedence over standard hypoglycemia
    } else if (glucose.min !== null && glucose.min < 70) {
        codes.add("Hypoglycemia");
    }

    // ---------------------------------------------------------
    // 2. TEMPERATURE (Hierarchy: HeatStroke/Pneumonia > Fever)
    // ---------------------------------------------------------
    let tempIssueFound = false;

    // Heat Stroke Risk (High fever + Tachycardia)
    if (temp.max !== null && hr.mean !== null && temp.max >= 40.0 && hr.mean > 100) {
        codes.add("HeatStrokeRisk");
        tempIssueFound = true;
    } 
    // Pneumonia Risk (Fever + Tachypnea + Hypoxia)
    else if (temp.max !== null && rr.mean !== null && spo2.mean !== null && 
             temp.max > 38 && rr.mean > 24 && spo2.mean < 94) {
        codes.add("PneumoniaRisk");
        tempIssueFound = true; 
    }

    // Generic Fever (Only if no specific severe condition was found)
    if (!tempIssueFound && temp.max !== null && temp.max >= 38.0) {
        codes.add("FeverSyndrome");
    }

    // Hypothermia (Independent check)
    if (temp.min !== null && temp.min < 35.0) {
        codes.add("Hypothermia");
    }

    // ---------------------------------------------------------
    // 3. RESPIRATORY (Hierarchy: Depression/Failure > Mild Hypoxia)
    // ---------------------------------------------------------
    let severeRespFound = false;

    // Respiratory Depression (e.g., Opioid overdose pattern)
    if (rr.latest !== null && spo2.latest !== null && rr.latest < 10 && spo2.latest < 92) {
        codes.add("RespiratoryDepression");
        severeRespFound = true;
    }
    // General Respiratory Failure
    else if ((spo2.min !== null && spo2.min < 90) || (rr.max !== null && rr.max >= 30)) {
        codes.add("RespiratoryFailure");
        severeRespFound = true;
    }

    // Mild Hypoxia (Only checked if no failure/severe depression exists)
    if (!severeRespFound && spo2.mean !== null && spo2.mean >= 91 && spo2.mean <= 94) {
        codes.add("HypoxiaMild");
    }

    // ---------------------------------------------------------
    // 4. CARDIOVASCULAR / BLOOD PRESSURE
    // ---------------------------------------------------------
    
    // Flag to suppress generic BP codes if a complex specific emergency is identified
    let cardiacEmergency = false;

    // Possible Myocardial Infarction (Abnormal HR + BP + Respiratory distress)
    const cardiacDistress = (hr.latest !== null && (hr.latest > 100 || hr.latest < 60));
    const bpDistress = (sbp.latest !== null && (sbp.latest < 90 || sbp.latest > 160));
    const respDistress = (rr.latest !== null && rr.latest > 24) || (spo2.latest !== null && spo2.latest < 93);
    
    if (cardiacDistress && bpDistress && respDistress) {
        codes.add("PossibleMyocardialInfarction");
        cardiacEmergency = true;
    }

    // Cushing's Triad (Intracranial Hypertension)
    if (!cardiacEmergency && sbp.latest !== null && hr.latest !== null && sbp.latest > 160 && hr.latest < 60) {
        codes.add("CushingsTriadRisk");
        cardiacEmergency = true; // Overrides generic hypertension
    }

    // Neurogenic Shock
    if (MAP_latest !== null && hr.latest !== null && MAP_latest < 65 && hr.latest < 60) {
        codes.add("NeurogenicShockRisk");
        cardiacEmergency = true; // Overrides generic hypotension
    }

    // ---------------------------------------------------------
    // 5. COMBINED RISKS & ARRHYTHMIAS
    // ---------------------------------------------------------

    // Arrhythmias Logic
    const isTachy = (hr.mean !== null && hr.mean > 100) || (hr.max !== null && hr.max > 130);
    const isBrady = (hr.mean !== null && hr.mean < 50);

    // Suppress generic Tachyarrhythmia if the high HR is a known symptom of another identified condition
    const knownTachycardiaCause = codes.has("HeatStrokeRisk") || codes.has("PanicAttackRisk") || codes.has("DehydrationRisk");

    if (isTachy && !knownTachycardiaCause) {
        codes.add("Tachyarrhythmia");
    }
    
    // Suppress generic Bradyarrhythmia if explained by Neurogenic Shock or Cushing's
    if (isBrady && !codes.has("NeurogenicShockRisk") && !codes.has("CushingsTriadRisk")) {
        codes.add("Bradyarrhythmia");
    }

    if(codes.length === 0) {
        codes.add("Healthy");
    }
    return Array.from(codes);
}