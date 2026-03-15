import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatPercent } from "@/lib/formatters";
import { downloadCSV } from "@/lib/export";
import { FileText, Download, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FullResult } from "@/hooks/useSimulator";
import {
  formatSupabaseError,
  isMissingSupabaseRelationWithStatus,
} from "@/integrations/supabase/errors";

interface RunRow {
  id: string;
  created_at: string;
  scenario_name: string;
  crop_key: string;
  crop_name: string;
  yield_kg: number;
  success_probability: number;
  total_cost: number;
  revenue: number;
  net_profit: number;
  roi: number;
  payback_period_years: number;
  temperature_c: number;
  humidity_pct: number;
  light_hours_per_day: number;
  light_power_kw: number;
  co2_ppm: number;
  plant_count: number;
  electricity_price_per_kwh: number;
  labour_cost_per_day: number;
  nutrient_cost_per_day: number;
  infrastructure_capex: number;
  payback_horizon_years: number;
  electricity_cost: number;
  labour_cost: number;
  nutrient_cost: number;
  infrastructure_cost_per_cycle: number;
  cycle_days: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<RunRow[]>([]);

  const fetchRuns = async () => {
    if (!user) return;
    const { data, error, status, statusText } = await supabase
      .from("simulation_runs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to fetch runs:", { error, status, statusText });
      if (isMissingSupabaseRelationWithStatus(error, status, "simulation_runs")) {
        toast.error(
          "Database tables not found (simulation_runs). Apply the Supabase migration to enable saving/reports."
        );
      } else {
        toast.error(`Failed to load reports: ${formatSupabaseError(error, status, statusText)}`);
      }
      setRuns([]);
      return;
    }

    setRuns((data as RunRow[]) || []);
  };

  useEffect(() => { fetchRuns(); }, [user]);

  const handleExportCSV = async (run: RunRow) => {
    const { data: states, error } = await supabase
      .from("daily_states")
      .select("*")
      .eq("run_id", run.id)
      .order("day");

    if (error) {
      console.error("Failed to fetch daily states:", error);
      toast.error(`Failed to export: ${formatSupabaseError(error)}`);
      return;
    }

    const fullResult: FullResult = {
      cropKey: run.crop_key,
      cropName: run.crop_name,
      scenarioName: run.scenario_name,
      env: { temperature_c: run.temperature_c, humidity_pct: run.humidity_pct, light_hours_per_day: run.light_hours_per_day, light_power_kw: run.light_power_kw, co2_ppm: run.co2_ppm, plant_count: run.plant_count },
      econ: { electricity_price_per_kwh: run.electricity_price_per_kwh, labour_cost_per_day: run.labour_cost_per_day, nutrient_cost_per_day: run.nutrient_cost_per_day, infrastructure_capex: run.infrastructure_capex, payback_horizon_years: run.payback_horizon_years },
      sim: { daily_states: (states || []).map(s => ({ day: s.day, biomass_per_plant_g: s.biomass_per_plant_g, biomass_total_kg: s.biomass_total_kg, stress_factor: s.stress_factor, growth_stage: s.growth_stage })), yield_kg: run.yield_kg, success_probability: run.success_probability, cycle_days: run.cycle_days },
      economics: { electricity_cost: run.electricity_cost, labour_cost: run.labour_cost, nutrient_cost: run.nutrient_cost, infrastructure_cost_per_cycle: run.infrastructure_cost_per_cycle, total_cost: run.total_cost, revenue: run.revenue, net_profit: run.net_profit, roi: run.roi, payback_period_years: run.payback_period_years, cost_per_kg: run.total_cost / Math.max(run.yield_kg, 0.001), profit_per_kg: run.net_profit / Math.max(run.yield_kg, 0.001) },
    };
    downloadCSV(fullResult);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("simulation_runs").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Run deleted");
      setRuns(runs.filter(r => r.id !== id));
    }
  };

  const handleEmailReport = (run: RunRow) => {
    const subject = encodeURIComponent(`AeroFarm Report: ${run.scenario_name}`);
    const body = encodeURIComponent(
      `Simulation Report: ${run.scenario_name}\nCrop: ${run.crop_name}\nYield: ${run.yield_kg.toFixed(2)} kg\nRevenue: ₹${run.revenue.toFixed(0)}\nNet Profit: ₹${run.net_profit.toFixed(0)}\nROI: ${(run.roi * 100).toFixed(1)}%`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Reports
        </h2>
        <p className="text-muted-foreground mt-1">View, export, and manage all your simulation reports.</p>
      </div>

      {runs.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">No Reports Yet</h3>
            <p className="text-sm text-muted-foreground">Run simulations to generate reports.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <Card key={run.id} className="shadow-card">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm truncate">{run.scenario_name}</p>
                    <Badge variant={run.net_profit > 0 ? "default" : "destructive"} className="text-xs shrink-0">
                      {run.net_profit > 0 ? "Profit" : "Loss"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {run.crop_name} • {new Date(run.created_at).toLocaleDateString()} •
                    Yield: {run.yield_kg.toFixed(2)} kg •
                    Revenue: {formatINR(run.revenue)} •
                    Profit: <span className={run.net_profit > 0 ? "text-profit" : "text-loss"}>{formatINR(run.net_profit)}</span> •
                    ROI: {formatPercent(run.roi)}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleExportCSV(run)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEmailReport(run)}>
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(run.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
