import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatPercent } from "@/lib/formatters";
import { GitCompareArrows, ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface Run {
  id: string;
  scenario_name: string;
  crop_name: string;
  created_at: string;
  yield_kg: number;
  success_probability: number;
  total_cost: number;
  revenue: number;
  net_profit: number;
  roi: number;
  payback_period_years: number;
  electricity_cost: number;
  labour_cost: number;
  nutrient_cost: number;
  infrastructure_cost_per_cycle: number;
  temperature_c: number;
  humidity_pct: number;
  light_hours_per_day: number;
  co2_ppm: number;
  plant_count: number;
}

function CompareIndicator({ a, b, higherIsBetter = true }: { a: number; b: number; higherIsBetter?: boolean }) {
  if (a === b) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const aIsBetter = higherIsBetter ? a > b : a < b;
  return aIsBetter ? <ArrowUp className="h-4 w-4 text-profit" /> : <ArrowDown className="h-4 w-4 text-loss" />;
}

function CompareRow({ label, valA, valB, formatter, higherIsBetter = true }: {
  label: string; valA: number; valB: number; formatter: (v: number) => string; higherIsBetter?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 py-2.5 border-b last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-1.5 text-sm">
        <CompareIndicator a={valA} b={valB} higherIsBetter={higherIsBetter} />
        {formatter(valA)}
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <CompareIndicator a={valB} b={valA} higherIsBetter={higherIsBetter} />
        {formatter(valB)}
      </div>
    </div>
  );
}

function RadarComparisonChart({ a, b }: { a: Run; b: Run }) {
  // Normalize values to 0-100 for radar chart
  const maxYield = Math.max(a.yield_kg, b.yield_kg, 1);
  const maxRevenue = Math.max(a.revenue, b.revenue, 1);
  const maxRoi = Math.max(Math.abs(a.roi), Math.abs(b.roi), 1);

  const data = {
    labels: ["Yield", "Success %", "Revenue", "ROI", "Cost Efficiency"],
    datasets: [
      {
        label: a.scenario_name,
        data: [
          (a.yield_kg / maxYield) * 100,
          a.success_probability * 100,
          (a.revenue / maxRevenue) * 100,
          Math.max(0, (a.roi / maxRoi) * 100),
          a.total_cost > 0 ? (a.revenue / a.total_cost) * 50 : 0,
        ],
        backgroundColor: "hsla(152, 55%, 40%, 0.15)",
        borderColor: "hsl(152, 55%, 40%)",
        borderWidth: 2,
        pointBackgroundColor: "hsl(152, 55%, 40%)",
        pointRadius: 4,
      },
      {
        label: b.scenario_name,
        data: [
          (b.yield_kg / maxYield) * 100,
          b.success_probability * 100,
          (b.revenue / maxRevenue) * 100,
          Math.max(0, (b.roi / maxRoi) * 100),
          b.total_cost > 0 ? (b.revenue / b.total_cost) * 50 : 0,
        ],
        backgroundColor: "hsla(200, 70%, 50%, 0.15)",
        borderColor: "hsl(200, 70%, 50%)",
        borderWidth: 2,
        pointBackgroundColor: "hsl(200, 70%, 50%)",
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          display: false,
        },
        pointLabels: {
          font: { family: "'Inter', sans-serif", size: 11 },
        },
        grid: {
          color: "hsla(140, 15%, 88%, 0.5)",
        },
      },
    },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: { family: "'Inter', sans-serif", size: 11 },
          usePointStyle: true,
        },
      },
    },
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display">Visual Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <Radar data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Compare() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [runA, setRunA] = useState<string>("");
  const [runB, setRunB] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("simulation_runs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setRuns((data as Run[]) || []));
  }, [user]);

  const a = runs.find((r) => r.id === runA);
  const b = runs.find((r) => r.id === runB);
  const fmt = (v: number) => v.toFixed(2);

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <GitCompareArrows className="h-6 w-6 text-primary" />
          Compare Simulations
        </h2>
        <p className="text-muted-foreground mt-1">Select two simulation runs to compare side by side.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Simulation A</label>
          <Select value={runA} onValueChange={setRunA}>
            <SelectTrigger><SelectValue placeholder="Select run A" /></SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id} disabled={r.id === runB}>
                  {r.scenario_name} ({r.crop_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Simulation B</label>
          <Select value={runB} onValueChange={setRunB}>
            <SelectTrigger><SelectValue placeholder="Select run B" /></SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id} disabled={r.id === runA}>
                  {r.scenario_name} ({r.crop_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {a && b ? (
        <div className="space-y-6">
          <RadarComparisonChart a={a} b={b} />

          <Card className="shadow-card">
            <CardHeader>
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                <CardTitle className="text-base font-display">Metric</CardTitle>
                <div>
                  <p className="text-sm font-semibold">{a.scenario_name}</p>
                  <Badge variant="outline" className="text-xs mt-1">{a.crop_name}</Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold">{b.scenario_name}</p>
                  <Badge variant="outline" className="text-xs mt-1">{b.crop_name}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CompareRow label="Yield (kg)" valA={a.yield_kg} valB={b.yield_kg} formatter={fmt} />
              <CompareRow label="Success %" valA={a.success_probability} valB={b.success_probability} formatter={formatPercent} />
              <CompareRow label="Revenue" valA={a.revenue} valB={b.revenue} formatter={formatINR} />
              <CompareRow label="Total Cost" valA={a.total_cost} valB={b.total_cost} formatter={formatINR} higherIsBetter={false} />
              <CompareRow label="Net Profit" valA={a.net_profit} valB={b.net_profit} formatter={formatINR} />
              <CompareRow label="ROI" valA={a.roi} valB={b.roi} formatter={formatPercent} />
              <CompareRow label="Payback (yrs)" valA={a.payback_period_years} valB={b.payback_period_years} formatter={fmt} higherIsBetter={false} />
              <CompareRow label="Electricity Cost" valA={a.electricity_cost} valB={b.electricity_cost} formatter={formatINR} higherIsBetter={false} />
              <CompareRow label="Labour Cost" valA={a.labour_cost} valB={b.labour_cost} formatter={formatINR} higherIsBetter={false} />
              <CompareRow label="Nutrient Cost" valA={a.nutrient_cost} valB={b.nutrient_cost} formatter={formatINR} higherIsBetter={false} />
              <CompareRow label="Temperature (°C)" valA={a.temperature_c} valB={b.temperature_c} formatter={fmt} />
              <CompareRow label="Light (hrs)" valA={a.light_hours_per_day} valB={b.light_hours_per_day} formatter={fmt} />
              <CompareRow label="CO₂ (ppm)" valA={a.co2_ppm} valB={b.co2_ppm} formatter={fmt} />
              <CompareRow label="Plants" valA={a.plant_count} valB={b.plant_count} formatter={(v) => v.toString()} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GitCompareArrows className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">Select Two Runs</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Choose two simulation runs above to see a detailed side-by-side comparison of all metrics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
