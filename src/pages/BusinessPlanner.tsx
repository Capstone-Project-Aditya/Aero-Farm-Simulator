import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCropKeys, CROPS, DEFAULT_ECONOMICS, evaluateEconomics, runSimulation } from "@/lib/simulation";
import { PieChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Calculator, TrendingUp, IndianRupee, Space as SpaceIcon, Sprout, AlertCircle } from "lucide-react";
// Mock formatCurrency if the util isn't exporting it directly
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function BusinessPlanner() {
  const [budget, setBudget] = useState(500000); // 5 Lakhs default
  const [spaceSqFt, setSpaceSqFt] = useState(500); // 500 sqft default
  const [selectedCrop, setSelectedCrop] = useState("lettuce");
  
  // Basic Aeroponic Tower Assumptions
  // 1 Tower takes ~4 sq ft and holds ~20 plants
  const SQFT_PER_TOWER = 4;
  const PLANTS_PER_TOWER = 20;
  
  // Cost Assumptions
  const BASE_INFRA_COST = 50000; // Base HVAC, reservoir, etc.
  const COST_PER_TOWER = 3000; // Physical tower + LED + pumps
  
  const crop = CROPS[selectedCrop];

  const analysis = useMemo(() => {
    // 1. Calculate Space Constraint
    const maxTowersBySpace = Math.floor(spaceSqFt / SQFT_PER_TOWER);
    const maxPlantsBySpace = maxTowersBySpace * PLANTS_PER_TOWER;
    
    // 2. Calculate Budget Constraint
    const availableForTowers = budget - BASE_INFRA_COST;
    const maxTowersByBudget = Math.max(0, Math.floor(availableForTowers / COST_PER_TOWER));
    const maxPlantsByBudget = maxTowersByBudget * PLANTS_PER_TOWER;
    
    // 3. Final feasible size
    const actualTowers = Math.min(maxTowersBySpace, maxTowersByBudget);
    const actualPlants = actualTowers * PLANTS_PER_TOWER;
    const actualCapex = BASE_INFRA_COST + (actualTowers * COST_PER_TOWER);
    
    if (actualPlants === 0) {
      return null; // Not enough budget or space
    }

    // 4. Run Economics per cycle
    // Assume optimal environment
    const targetEnv = {
      temperature_c: (crop.optimal_temp_min + crop.optimal_temp_max) / 2,
      humidity_pct: 60,
      light_hours_per_day: crop.optimal_light_hours,
      co2_ppm: crop.optimal_co2_ppm,
      water_ph: (crop.water_ph_min + crop.water_ph_max) / 2,
      ec_ms_cm: (crop.ec_min + crop.ec_max) / 2,
      light_power_kw: (actualTowers * 0.05),
      plant_count: actualPlants
    };

    const simResult = runSimulation(crop, targetEnv);
    
    const econ = evaluateEconomics(
      simResult.yield_kg,
      simResult.cycle_days,
      crop,
      targetEnv,
      { 
        ...DEFAULT_ECONOMICS, 
        infrastructure_capex: actualCapex,
        labour_cost_per_plant_per_day: 0.05,
        nutrient_cost_per_plant_per_day: 0.1
      }
    );

    const cyclesPerYear = Math.floor(365 / crop.cycle_days);
    const annualRevenue = econ.revenue * cyclesPerYear;
    const annualOpex = econ.total_cost * cyclesPerYear;
    const annualProfit = econ.net_profit * cyclesPerYear;
    
    // 5. Build 5-Year Projection Chart Data
    const chartData = [];
    let cumulative = -actualCapex;
    chartData.push({ year: "Year 0", cashFlow: cumulative, label: "Initial Investment" });
    
    for (let yr = 1; yr <= 5; yr++) {
      cumulative += annualProfit;
      chartData.push({ 
        year: `Year ${yr}`, 
        cashFlow: cumulative,
        profit: annualProfit
      });
    }

    const breakEvenMonths = actualCapex / (annualProfit / 12);
    
    return {
      actualTowers,
      actualPlants,
      actualCapex,
      cyclesPerYear,
      annualRevenue,
      annualOpex,
      annualProfit,
      breakEvenMonths,
      simResult,
      econPerCycle: econ,
      chartData,
      bottleneck: maxTowersByBudget < maxTowersBySpace ? "Budget" : "Space"
    };

  }, [budget, spaceSqFt, selectedCrop, crop]);

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Financial ROI Planner
        </h2>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Input your starting capital and available real estate. We'll calculate the optimal farm size, operational costs, and 5-year payback period.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* INPUTS PANEL */}
        <Card className="shadow-smooth md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-display">Farm Constraints</CardTitle>
            <CardDescription>Setup your business limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                Initial Budget (₹)
              </label>
              <Input 
                type="number" 
                value={budget} 
                onChange={e => setBudget(Number(e.target.value))}
                min={100000}
                step={50000}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <SpaceIcon className="h-4 w-4 text-muted-foreground" />
                Available Space (sq. ft.)
              </label>
              <Input 
                type="number" 
                value={spaceSqFt} 
                onChange={e => setSpaceSqFt(Number(e.target.value))}
                min={50}
                step={50}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sprout className="h-4 w-4 text-muted-foreground" />
                Target Crop
              </label>
              <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getCropKeys().map((k) => (
                    <SelectItem key={k} value={k}>
                      {CROPS[k].emoji} {CROPS[k].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* RESULTS PANEL */}
        <div className="md:col-span-2 space-y-6">
          {!analysis ? (
             <Card className="bg-destructive/10 border-destructive/20 shadow-none">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                <h3 className="font-medium text-destructive">Insufficient Resources</h3>
                <p className="text-sm text-destructive/80 mt-1 max-w-sm">
                  With a base infrastructure cost of {formatCurrency(BASE_INFRA_COST)}, your current budget and space cannot support a commercial aeroponic setup. Increase your budget or space.
                </p>
              </CardContent>
             </Card>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Plants</p>
                    <p className="text-2xl font-bold font-display mt-1">{analysis.actualPlants.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">in {analysis.actualTowers} Towers</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Required CAPEX</p>
                    <p className="text-2xl font-bold font-display mt-1 text-primary">{formatCurrency(analysis.actualCapex)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Limited by {analysis.bottleneck}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Annual Profit</p>
                    <p className={`text-2xl font-bold font-display mt-1 ${analysis.annualProfit > 0 ? "text-green-600 dark:text-green-500" : "text-destructive"}`}>
                      {formatCurrency(analysis.annualProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{analysis.cyclesPerYear} harvests/year</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Break-Even</p>
                    <p className="text-2xl font-bold font-display mt-1">
                      {analysis.annualProfit > 0 ? `${(analysis.breakEvenMonths).toFixed(1)} mo` : 'Never'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Payback period</p>
                  </CardContent>
                </Card>
              </div>

              {/* CHART */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    5-Year Cash Flow Projection
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysis.chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-muted" />
                      <XAxis dataKey="year" className="text-xs" tick={{fill: 'currentColor', opacity: 0.6}} />
                      <YAxis 
                        tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} 
                        className="text-xs" 
                        tick={{fill: 'currentColor', opacity: 0.6}}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), "Cumulative"]}
                        labelClassName="text-foreground font-medium mb-2"
                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px' }}
                      />
                      <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.5} strokeDasharray="3 3" />
                      <Line 
                        type="monotone" 
                        dataKey="cashFlow" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: "#ffffff", stroke: "#10b981" }}
                        activeDot={{ r: 6, fill: "#10b981", stroke: "#ffffff" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* OPEX BREAKDOWN */}
               <Card className="shadow-sm">
                <CardContent className="p-4 text-sm flex justify-between items-center text-muted-foreground">
                  <span><strong>Per Cycle Yield:</strong> {analysis.simResult.yield_kg.toFixed(0)} kg</span>
                  <span><strong>Cost per kg:</strong> {formatCurrency(analysis.econPerCycle.cost_per_kg)}/kg</span>
                  <span><strong>Market Price:</strong> {formatCurrency(crop.price_per_kg)}/kg</span>
                </CardContent>
              </Card>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
