export interface EnvironmentConfig {
  temperature_c: number;
  humidity_pct: number;
  light_hours_per_day: number;
  light_power_kw: number;
  co2_ppm: number;
  plant_count: number;
  water_ph: number;
  ec_ms_cm: number;
}

export interface EconomicConfig {
  electricity_price_per_kwh: number;  // INR
  labour_cost_per_day: number;        // INR — base fixed cost
  labour_cost_per_plant_per_day: number; // INR — scales with plant count
  nutrient_cost_per_day: number;      // INR — base fixed cost
  nutrient_cost_per_plant_per_day: number; // INR — scales with plant count
  infrastructure_capex: number;       // INR total
  payback_horizon_years: number;
  water_cost_per_litre: number;       // INR
}

export const DEFAULT_ENVIRONMENT: EnvironmentConfig = {
  temperature_c: 22,
  humidity_pct: 70,
  light_hours_per_day: 16,
  light_power_kw: 1.0,
  co2_ppm: 1000,
  plant_count: 1000,
  water_ph: 6.0,
  ec_ms_cm: 1.5,
};

export const DEFAULT_ECONOMICS: EconomicConfig = {
  electricity_price_per_kwh: 8,
  labour_cost_per_day: 150,
  labour_cost_per_plant_per_day: 0.05,
  nutrient_cost_per_day: 50,
  nutrient_cost_per_plant_per_day: 0.1,
  infrastructure_capex: 200000,
  payback_horizon_years: 5,
  water_cost_per_litre: 0.3,
};
