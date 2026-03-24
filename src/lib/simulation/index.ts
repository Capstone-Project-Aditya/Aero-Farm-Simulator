export { CROPS, getCrop, getCropKeys, type CropConfig } from "./crops";
export {
  DEFAULT_ENVIRONMENT,
  DEFAULT_ECONOMICS,
  type EnvironmentConfig,
  type EconomicConfig,
} from "./environment";
export { runSimulation, type DailyState, type SimulationResult } from "./simulation";
export { evaluateEconomics, type EconomicResult } from "./economics";
export { findBestSetup, type RecommendationResult } from "./optimizer";
export { generateLocalRecommendation } from "./localAdvisor";
