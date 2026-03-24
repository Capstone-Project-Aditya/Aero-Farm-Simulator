import { CropConfig } from "./crops";
import { EnvironmentConfig } from "./environment";

export interface DailyState {
  day: number;
  biomass_per_plant_g: number;
  biomass_total_kg: number;
  stress_factor: number;
  growth_stage: string;
  nutrient_uptake_g: number;
  water_usage_litres: number;
}

export interface SimulationResult {
  daily_states: DailyState[];
  yield_kg: number;
  success_probability: number;
  cycle_days: number;
  total_water_litres: number;
}

function computeBaseStress(env: EnvironmentConfig, crop: CropConfig): number {
  // Temperature stress
  let tempStress = 0;
  if (env.temperature_c < crop.optimal_temp_min) {
    tempStress = Math.min(1, (crop.optimal_temp_min - env.temperature_c) / 10);
  } else if (env.temperature_c > crop.optimal_temp_max) {
    tempStress = Math.min(1, (env.temperature_c - crop.optimal_temp_max) / 10);
  }

  // Light stress
  const lightDiff = Math.abs(env.light_hours_per_day - crop.optimal_light_hours);
  const lightStress = Math.min(1, lightDiff / 8);

  // CO2 stress
  const co2Diff = Math.abs(env.co2_ppm - crop.optimal_co2_ppm);
  const co2Stress = Math.min(1, co2Diff / 500);

  // pH stress
  let phStress = 0;
  if (env.water_ph < crop.water_ph_min) {
    phStress = Math.min(1, (crop.water_ph_min - env.water_ph) / 2);
  } else if (env.water_ph > crop.water_ph_max) {
    phStress = Math.min(1, (env.water_ph - crop.water_ph_max) / 2);
  }

  // EC stress
  let ecStress = 0;
  if (env.ec_ms_cm < crop.ec_min) {
    ecStress = Math.min(1, (crop.ec_min - env.ec_ms_cm) / 1.5);
  } else if (env.ec_ms_cm > crop.ec_max) {
    ecStress = Math.min(1, (env.ec_ms_cm - crop.ec_max) / 1.5);
  }

  // Weighted combination
  return Math.min(1, tempStress * 0.3 + lightStress * 0.25 + co2Stress * 0.2 + phStress * 0.15 + ecStress * 0.1);
}

function getGrowthStage(day: number, totalDays: number): string {
  const fraction = day / totalDays;
  if (fraction < 0.2) return "Germination";
  if (fraction < 0.5) return "Vegetative";
  if (fraction < 0.8) return "Maturation";
  return "Harvest-ready";
}

// Simple seeded random for reproducible but varied daily stress
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function runSimulation(
  crop: CropConfig,
  env: EnvironmentConfig
): SimulationResult {
  const { cycle_days, max_biomass_g, growth_rate } = crop;
  const baseStress = computeBaseStress(env, crop);

  const daily_states: DailyState[] = [];
  let biomass = max_biomass_g * 0.01; // start at 1% of max
  let totalStress = 0;
  let totalWater = 0;

  for (let day = 1; day <= cycle_days; day++) {
    // Daily stress with ±5% random perturbation for realism
    const perturbation = (seededRandom(day * 17 + env.plant_count) - 0.5) * 0.1;
    const dailyStress = Math.max(0, Math.min(1, baseStress + perturbation));

    const effectiveGrowthRate = growth_rate * (1 - dailyStress);

    // Logistic growth: dB/dt = r * B * (1 - B/K)
    const growth = effectiveGrowthRate * biomass * (1 - biomass / max_biomass_g);
    biomass = Math.min(max_biomass_g, biomass + growth);

    const biomass_total_kg = (biomass * env.plant_count) / 1000;
    totalStress += dailyStress;

    // Nutrient uptake correlates with growth
    const nutrient_uptake_g = Math.max(0, growth * 0.15 * env.plant_count);

    // Water usage per day
    const water_usage_litres = crop.water_litres_per_plant_per_day * env.plant_count;
    totalWater += water_usage_litres;

    daily_states.push({
      day,
      biomass_per_plant_g: Math.round(biomass * 100) / 100,
      biomass_total_kg: Math.round(biomass_total_kg * 1000) / 1000,
      stress_factor: Math.round(dailyStress * 1000) / 1000,
      growth_stage: getGrowthStage(day, cycle_days),
      nutrient_uptake_g: Math.round(nutrient_uptake_g * 100) / 100,
      water_usage_litres: Math.round(water_usage_litres * 100) / 100,
    });
  }

  const yield_kg = (biomass * env.plant_count) / 1000;
  const avgStress = totalStress / cycle_days;
  const success_probability = Math.max(0, Math.min(1, 1 - avgStress));

  return {
    daily_states,
    yield_kg: Math.round(yield_kg * 1000) / 1000,
    success_probability: Math.round(success_probability * 1000) / 1000,
    cycle_days,
    total_water_litres: Math.round(totalWater * 100) / 100,
  };
}
