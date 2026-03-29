import * as tf from '@tensorflow/tfjs';
import { EnvironmentConfig, CropConfig } from '@/lib/simulation';

export interface MLPrediction {
  predictedYield: number;
  predictedStress: number;
}

// A simple Dense Neural Network to predict Yield and Stress based on 6 inputs
export function buildModel(): tf.Sequential {
  const model = tf.sequential();
  
  // Input layer: 6 features (temp, humidity, light_hours, light_power, co2, plant_count)
  model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [6] }));
  model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
  
  // Output layer: 2 features (yield_kg, stress_factor)
  model.add(tf.layers.dense({ units: 2, activation: 'linear' }));

  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: 'meanSquaredError',
    metrics: ['mse'],
  });

  return model;
}

// Helper to convert env state into a normalized tensor array
export function createInputTensor(env: EnvironmentConfig): tf.Tensor2D {
  // Normalize inputs roughly to [0, 1] for stable training
  const temp = env.temperature_c / 40;
  const hum = env.humidity_pct / 100;
  const lightH = env.light_hours_per_day / 24;
  const lightP = env.light_power_kw / 5;
  const co2 = env.co2_ppm / 2000;
  const plants = env.plant_count / 10000;

  return tf.tensor2d([[temp, hum, lightH, lightP, co2, plants]]);
}

// Predict using a trained model
export function predictYieldAndStress(model: tf.LayersModel, env: EnvironmentConfig): MLPrediction {
  return tf.tidy(() => {
    const input = createInputTensor(env);
    const prediction = model.predict(input) as tf.Tensor;
    const data = prediction.dataSync(); // [yield_kg, stress_factor]
    
    // De-normalize (e.g. assume max yield ~ 100kg, max stress ~ 1.0)
    return {
      predictedYield: Math.max(0, data[0] * 100),
      predictedStress: Math.max(0, Math.min(1, data[1]))
    };
  });
}
