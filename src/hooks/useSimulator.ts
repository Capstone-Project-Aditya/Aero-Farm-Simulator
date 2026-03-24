import { useState, useCallback } from "react";
import {
  CROPS,
  getCrop,
  getCropKeys,
  DEFAULT_ENVIRONMENT,
  DEFAULT_ECONOMICS,
  EnvironmentConfig,
  EconomicConfig,
  SimulationResult,
  EconomicResult,
  DailyState,
  runSimulation,
  evaluateEconomics,
  findBestSetup,
} from "@/lib/simulation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  formatSupabaseError,
  isMissingSupabaseRelationWithStatus,
} from "@/integrations/supabase/errors";

export interface FullResult {
  cropKey: string;
  cropName: string;
  scenarioName: string;
  env: EnvironmentConfig;
  econ: EconomicConfig;
  sim: SimulationResult;
  economics: EconomicResult;
}

export function useSimulator() {
  const { user } = useAuth();
  const [cropKey, setCropKey] = useState("lettuce");
  const [scenarioName, setScenarioName] = useState("");
  const [env, setEnv] = useState<EnvironmentConfig>({ ...DEFAULT_ENVIRONMENT });
  const [econ, setEcon] = useState<EconomicConfig>({ ...DEFAULT_ECONOMICS });
  const [externalTemp, setExternalTemp] = useState<number | undefined>();
  const [result, setResult] = useState<FullResult | null>(null);
  const [loading, setLoading] = useState(false);

  const saveRun = useCallback(
    async (r: FullResult) => {
      if (!user) return { ok: false as const, reason: "not-authenticated" as const };
      const crop = getCrop(r.cropKey)!;

      const {
        data: run,
        error: runError,
        status: runStatus,
        statusText: runStatusText,
      } = await supabase
        .from("simulation_runs")
        .insert({
          user_id: user.id,
          scenario_name: r.scenarioName || "Untitled",
          crop_key: r.cropKey,
          crop_name: crop.name,
          temperature_c: r.env.temperature_c,
          humidity_pct: r.env.humidity_pct,
          light_hours_per_day: r.env.light_hours_per_day,
          light_power_kw: r.env.light_power_kw,
          co2_ppm: r.env.co2_ppm,
          plant_count: r.env.plant_count,
          electricity_price_per_kwh: r.econ.electricity_price_per_kwh,
          labour_cost_per_day: r.econ.labour_cost_per_day,
          nutrient_cost_per_day: r.econ.nutrient_cost_per_day,
          infrastructure_capex: r.econ.infrastructure_capex,
          payback_horizon_years: r.econ.payback_horizon_years,
          cycle_days: r.sim.cycle_days,
          yield_kg: r.sim.yield_kg,
          success_probability: r.sim.success_probability,
          electricity_cost: r.economics.electricity_cost,
          labour_cost: r.economics.labour_cost,
          nutrient_cost: r.economics.nutrient_cost,
          infrastructure_cost_per_cycle: r.economics.infrastructure_cost_per_cycle,
          total_cost: r.economics.total_cost,
          revenue: r.economics.revenue,
          net_profit: r.economics.net_profit,
          roi: r.economics.roi,
          payback_period_years: r.economics.payback_period_years,
        } as any)
        .select()
        .single();

      if (runError) {
        console.error("Failed to save run:", { runError, runStatus, runStatusText });
        if (isMissingSupabaseRelationWithStatus(runError, runStatus, "simulation_runs")) {
          toast.error(
            "Database tables not found (simulation_runs). Apply the Supabase migration before saving runs."
          );
        } else {
          toast.error(
            `Failed to save simulation: ${formatSupabaseError(runError, runStatus, runStatusText)}`
          );
        }
        return { ok: false as const, reason: "save-failed" as const };
      }

      // Save daily states in batches
      const states = r.sim.daily_states.map((s) => ({
        run_id: run.id,
        day: s.day,
        biomass_per_plant_g: s.biomass_per_plant_g,
        biomass_total_kg: s.biomass_total_kg,
        stress_factor: s.stress_factor,
        growth_stage: s.growth_stage,
      }));

      const batchSize = 50;
      for (let i = 0; i < states.length; i += batchSize) {
        const {
          error: statesError,
          status: statesStatus,
          statusText: statesStatusText,
        } = await supabase
          .from("daily_states")
          .insert(states.slice(i, i + batchSize));
        if (statesError) {
          console.error("Failed to save daily states:", {
            statesError,
            statesStatus,
            statesStatusText,
          });
          if (isMissingSupabaseRelationWithStatus(statesError, statesStatus, "daily_states")) {
            toast.error(
              "Database tables not found (daily_states). Apply the Supabase migration before saving runs."
            );
          } else {
            toast.error(
              `Failed to save daily states: ${formatSupabaseError(statesError, statesStatus, statesStatusText)}`
            );
          }
          return { ok: false as const, reason: "save-failed" as const };
        }
      }

      return { ok: true as const, runId: run.id };
    },
    [user]
  );

  const simulate = useCallback(async () => {
    setLoading(true);
    const crop = getCrop(cropKey);
    if (!crop) {
      toast.error("Invalid crop selected");
      setLoading(false);
      return;
    }

    const sim = runSimulation(crop, env);
    const economics = evaluateEconomics(sim.yield_kg, sim.cycle_days, crop, env, econ, sim.total_water_litres, externalTemp);

    const fullResult: FullResult = {
      cropKey,
      cropName: crop.name,
      scenarioName: scenarioName || `${crop.name} simulation`,
      env: { ...env },
      econ: { ...econ },
      sim,
      economics,
    };

    setResult(fullResult);
    const saveResult = await saveRun(fullResult);
    if (saveResult.ok) toast.success("Simulation saved!");
    else if (saveResult.reason === "not-authenticated") {
      toast.info("Simulation complete (not saved — please log in)");
    } else {
      toast.error("Simulation completed but could not be saved");
    }
    setLoading(false);
  }, [cropKey, env, econ, externalTemp, scenarioName, saveRun]);

  const recommend = useCallback(async () => {
    setLoading(true);
    const crop = getCrop(cropKey);
    if (!crop) {
      toast.error("Invalid crop selected");
      setLoading(false);
      return;
    }

    const best = findBestSetup(crop, econ);
    const newScenario = `Recommended setup (${crop.name})`;

    // Update form with recommended values
    setEnv(best.bestEnv);
    setScenarioName(newScenario);

    const fullResult: FullResult = {
      cropKey,
      cropName: crop.name,
      scenarioName: newScenario,
      env: best.bestEnv,
      econ: { ...econ },
      sim: best.simResult,
      economics: best.econResult,
    };

    setResult(fullResult);
    const saveResult = await saveRun(fullResult);
    if (saveResult.ok) toast.success("Best setup found and saved!");
    else if (saveResult.reason === "not-authenticated") {
      toast.info("Recommendation complete (not saved — please log in)");
    } else {
      toast.error("Recommendation completed but could not be saved");
    }
    setLoading(false);
  }, [cropKey, econ, saveRun]);

  const loadRun = useCallback(
    async (runId: string) => {
      const { data: run } = await supabase
        .from("simulation_runs")
        .select("*")
        .eq("id", runId)
        .single();

      if (!run) return;

      const { data: states } = await supabase
        .from("daily_states")
        .select("*")
        .eq("run_id", runId)
        .order("day");

      const crop = getCrop(run.crop_key);
      if (!crop) return;

      const loadedEnv: EnvironmentConfig = {
        temperature_c: run.temperature_c,
        humidity_pct: run.humidity_pct,
        light_hours_per_day: run.light_hours_per_day,
        light_power_kw: run.light_power_kw,
        co2_ppm: run.co2_ppm,
        plant_count: run.plant_count,
        water_ph: 6.0,
        ec_ms_cm: 1.5,
      };

      const loadedEcon: EconomicConfig = {
        electricity_price_per_kwh: run.electricity_price_per_kwh,
        labour_cost_per_day: run.labour_cost_per_day,
        labour_cost_per_plant_per_day: 0.05,
        nutrient_cost_per_day: run.nutrient_cost_per_day,
        nutrient_cost_per_plant_per_day: 0.1,
        infrastructure_capex: run.infrastructure_capex,
        payback_horizon_years: run.payback_horizon_years,
        water_cost_per_litre: 0.3,
      };

      setCropKey(run.crop_key);
      setScenarioName(run.scenario_name);
      setEnv(loadedEnv);
      setEcon(loadedEcon);

      const dailyStates: DailyState[] = (states || []).map((s) => ({
        day: s.day,
        biomass_per_plant_g: s.biomass_per_plant_g,
        biomass_total_kg: s.biomass_total_kg,
        stress_factor: s.stress_factor,
        growth_stage: s.growth_stage,
        nutrient_uptake_g: 0,
        water_usage_litres: 0,
      }));

      setResult({
        cropKey: run.crop_key,
        cropName: run.crop_name,
        scenarioName: run.scenario_name,
        env: loadedEnv,
        econ: loadedEcon,
        sim: {
          daily_states: dailyStates,
          yield_kg: run.yield_kg,
          success_probability: run.success_probability,
          cycle_days: run.cycle_days,
          total_water_litres: 0,
        },
        economics: {
          electricity_cost: run.electricity_cost,
          labour_cost: run.labour_cost,
          nutrient_cost: run.nutrient_cost,
          water_cost: 0,
          infrastructure_cost_per_cycle: run.infrastructure_cost_per_cycle,
          total_cost: run.total_cost,
          revenue: run.revenue,
          net_profit: run.net_profit,
          roi: run.roi,
          payback_period_years: run.payback_period_years,
          cost_per_kg: run.total_cost / Math.max(run.yield_kg, 0.001),
          profit_per_kg: run.net_profit / Math.max(run.yield_kg, 0.001),
        },
      });

      toast.info(`Loaded: ${run.scenario_name}`);
    },
    []
  );

  return {
    cropKey, setCropKey,
    scenarioName, setScenarioName,
    env, setEnv,
    econ,
    setEcon,
    externalTemp,
    setExternalTemp,
    result,
    loading,
    simulate,
    recommend,
    loadRun,
  };
}
