import { kmeans } from 'ml-kmeans';
import { FullResult } from '@/hooks/useSimulator';

export interface ClusterResult {
  cluster: number;
  run: FullResult;
}

// We normalize the dimensions so K-Means isn't biased by large numbers (like plant count)
function extractFeatures(run: FullResult): number[] {
  return [
    run.env.temperature_c / 40,
    run.env.humidity_pct / 100,
    run.env.light_hours_per_day / 24,
    run.env.co2_ppm / 2000,
    run.sim.yield_kg / 100, 
    run.economics.net_profit > 0 ? 1 : 0 // Binary profit marker
  ];
}

export function clusterSimulationRuns(runs: FullResult[], k: number = 3): ClusterResult[] {
  if (runs.length < k) {
    // Not enough data to cluster meaningfully, just assign cluster 0
    return runs.map(run => ({ cluster: 0, run }));
  }

  const data = runs.map(extractFeatures);
  
  // Run K-Means
  const ans = kmeans(data, k, { initialization: 'kmeans++' });
  
  return runs.map((run, i) => ({
    cluster: ans.clusters[i],
    run
  }));
}
