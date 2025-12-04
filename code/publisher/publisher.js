const mqtt = require("mqtt");
const fs = require("fs");

const configPath = process.argv[2] || "./config/healthy.json";
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const client = mqtt.connect(config.mqtt_url);

const sensorStates = {};

function initializeSensorState(sensor) {
  if (!sensorStates[sensor.type]) {
    let initialValue;
    if (sensor.distribution === "normal") {
      initialValue = sensor.mean;
    } else if (sensor.distribution === "mixed") {
      initialValue = (sensor.normal_range.min + sensor.normal_range.max) / 2;
    } else {
      initialValue = (sensor.min + sensor.max) / 2;
    }
    
    sensorStates[sensor.type] = {
      currentValue: initialValue,
      targetValue: initialValue,
      trend: 0,
      stepsSinceChange: 0,
      stepsUntilChange: 0, 
      isFirstRun: true
    };
  }
}

function generateValue(sensor) {
  initializeSensorState(sensor);
  const state = sensorStates[sensor.type];

  state.stepsSinceChange++;
  if (state.stepsSinceChange >= state.stepsUntilChange) {
    state.stepsSinceChange = 0;
    if (state.isFirstRun) {
      state.stepsUntilChange = Math.floor(Math.random() * 5) + 3;
      state.isFirstRun = false;
    } else {
      state.stepsUntilChange = Math.floor(Math.random() * 30) + 15;
    }
   
    let newTarget;
    switch (sensor.distribution) {
      case "normal":
        if (sensor.mean === undefined || sensor.std_dev === undefined) {
          newTarget = sensor.min !== undefined ? sensor.min : 0;
        } else {
          const u = 1 - Math.random();
          const v = Math.random();
          const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
          newTarget = z * sensor.std_dev + sensor.mean;
          if (sensor.min !== undefined) newTarget = Math.max(sensor.min, newTarget);
          if (sensor.max !== undefined) newTarget = Math.min(sensor.max, newTarget);
        }
        break;
      case "mixed":
        if (Math.random() < sensor.normal_range.prob) {
          newTarget = sensor.normal_range.min + Math.random() * (sensor.normal_range.max - sensor.normal_range.min);
        } else {
          newTarget = sensor.stress_range.min + Math.random() * (sensor.stress_range.max - sensor.stress_range.min);
        }
        break;
      
      case "uniform":
        newTarget = sensor.min + Math.random() * (sensor.max - sensor.min + 1);
        break;
    
      default:
        newTarget = state.currentValue;
    }
    
    state.targetValue = newTarget;
  }
  

  const distance = Math.abs(state.targetValue - state.currentValue);
  const smoothingFactor = distance > 10 ? 0.3 : 0.15;
  const noise = (Math.random() - 0.5) * (sensor.std_dev || 1) * 0.3;
  
  state.currentValue += (state.targetValue - state.currentValue) * smoothingFactor + noise;

  if (sensor.min !== undefined) state.currentValue = Math.max(sensor.min, state.currentValue);
  if (sensor.max !== undefined) state.currentValue = Math.min(sensor.max, state.currentValue);

  const isInteger = sensor.distribution === "uniform" || 
                    sensor.distribution === "mixed" ||
                    (sensor.mean !== undefined && Number.isInteger(sensor.mean));
  
  return isInteger ? Math.round(state.currentValue) : Number(state.currentValue.toFixed(1));
}

client.on("connect", () => {
  config.sensors.forEach(sensor => {
    setInterval(() => {
      const value = generateValue(sensor);
      const payload = {
        event_ts: new Date().toISOString(),
        type: sensor.type,
        unit: sensor.unit,
        value
      };
      client.publish(sensor.topic, JSON.stringify(payload));
      console.log(`${sensor.type.toUpperCase()}:`, JSON.stringify(payload));
    }, sensor.interval_ms);
  });
});