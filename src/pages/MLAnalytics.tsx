import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FullResult } from "@/hooks/useSimulator";
import { clusterSimulationRuns, ClusterResult } from "@/lib/ml/clustering";
import { DEFAULT_ENVIRONMENT, DEFAULT_ECONOMICS } from "@/lib/simulation";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Loader2 } from "lucide-react";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

export default function MLAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState<ClusterResult[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("simulation_runs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load runs:", error);
        setLoading(false);
        return;
      }

      // Map rows back to the FullResult structure so clustering can read it
      const mappedRuns: FullResult[] = data.map(r => ({
        cropKey: r.crop_key,
        cropName: r.crop_name,
        scenarioName: r.scenario_name || "Unknown",
        env: {
          ...DEFAULT_ENVIRONMENT,
          temperature_c: r.temperature_c,
          humidity_pct: r.humidity_pct,
          light_hours_per_day: r.light_hours_per_day,
          light_power_kw: r.light_power_kw,
          co2_ppm: r.co2_ppm,
          plant_count: r.plant_count,
        },
        econ: {
          ...DEFAULT_ECONOMICS,
        },
        sim: {
          yield_kg: r.yield_kg,
          daily_states: [],
          cycle_days: 30, // Rough estimate, clustering just looks at yield
          success_probability: r.success_probability || 1,
          biomass_history: [],
          total_water_litres: 0,
          total_power_kwh: 0,
        },
        economics: {
          revenue: r.revenue,
          total_cost: r.total_cost,
          net_profit: r.net_profit,
          roi: r.roi,
          payback_period_years: r.payback_period_years,
          cost_per_kg: 0,
          profit_per_kg: 0,
          electricity_cost: 0,
          labour_cost: 0,
          nutrient_cost: 0,
          water_cost: 0,
          infrastructure_cost_per_cycle: 0
        }
      }));

      // Generate K-Means Clusters natively in the browser
      const clustered = clusterSimulationRuns(mappedRuns, 3);
      setClusters(clustered);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Transform data for Recharts Scatter plot
  const chartData = clusters.map((c) => ({
    x: c.run.env.temperature_c,
    y: c.run.sim.yield_kg,
    z: c.run.economics.net_profit,
    cluster: c.cluster,
    name: c.run.scenarioName
  }));

  const clusterGroups = [0, 1, 2].map(clusterId => 
    chartData.filter(d => d.cluster === clusterId)
  );

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          ML Analytics (K-Means)
        </h2>
        <p className="text-muted-foreground mt-1">
          Unsupervised Machine Learning groups your past simulations into 3 mathematical clusters based on environmental inputs and resulting yield/profit profiles.
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Simulation Clusters: Temperature vs Yield</CardTitle>
          <CardDescription>
            Different colors represent mathematical groupings identified by the K-Means algorithm without any human labeling. Bubble size indicates Net Profit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" dataKey="x" name="Temperature" unit="°C" domain={['auto', 'auto']} stroke="#888888" fontSize={12} />
                <YAxis type="number" dataKey="y" name="Yield" unit=" kg" domain={['auto', 'auto']} stroke="#888888" fontSize={12} />
                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Profit" unit=" INR" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} 
                  contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                />
                
                {clusterGroups.map((group, index) => (
                  <Scatter key={`cluster-${index}`} name={`Cluster ${index + 1}`} data={group} fill={COLORS[index % COLORS.length]}>
                    {group.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Scatter>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((clusterId) => {
          const group = clusterGroups[clusterId];
          const avgYield = group.length > 0 ? (group.reduce((acc, curr) => acc + curr.y, 0) / group.length).toFixed(1) : "0";
          const avgTemp = group.length > 0 ? (group.reduce((acc, curr) => acc + curr.x, 0) / group.length).toFixed(1) : "0";
          
          return (
            <Card key={`stats-${clusterId}`} className="border-t-4" style={{ borderTopColor: COLORS[clusterId] }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Cluster {clusterId + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{group.length} <span className="text-lg font-normal text-muted-foreground">runs</span></div>
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Avg Yield:</span>
                    <span className="font-medium text-foreground">{avgYield} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Temp:</span>
                    <span className="font-medium text-foreground">{avgTemp}°C</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
