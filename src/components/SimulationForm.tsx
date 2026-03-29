import { useState } from "react";
import { EnvironmentConfig, EconomicConfig, CROPS, getCropKeys } from "@/lib/simulation";
import { fetchLiveWeather, CityKey } from "@/lib/simulation/weather";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sprout, Sun, DollarSign, Zap, Lightbulb, Droplets, CloudRain, RotateCcw, Loader2, BrainCircuit } from "lucide-react";
import { toast } from "sonner";

interface Props {
  cropKey: string;
  setCropKey: (v: string) => void;
  scenarioName: string;
  setScenarioName: (v: string) => void;
  env: EnvironmentConfig;
  setEnv: (v: EnvironmentConfig) => void;
  econ: EconomicConfig;
  setEcon: (v: EconomicConfig) => void;
  onSimulate: () => void;
  onRecommend: () => void;
  loading: boolean;
  useML?: boolean;
  setUseML?: (v: boolean) => void;
  mlEpoch?: { current: number; total: number };
}

function OptimalRangeSlider({
  label,
  value,
  min,
  max,
  step,
  optMin,
  optMax,
  onChange,
  unit = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  optMin: number;
  optMax: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  const inRange = value >= optMin && value <= optMax;
  const rangeLeftPct = ((optMin - min) / (max - min)) * 100;
  const rangeWidthPct = ((optMax - optMin) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className={`text-xs font-semibold tabular-nums ${inRange ? "text-profit" : "text-loss"}`}>
          {value}{unit}
        </span>
      </div>
      <div className="relative">
        {/* Optimal range indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full opacity-20 bg-profit pointer-events-none z-0"
          style={{ left: `${rangeLeftPct}%`, width: `${rangeWidthPct}%` }}
        />
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => onChange(v)}
          className="relative z-10"
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span className="text-profit">Optimal: {optMin}–{optMax}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function SimulationForm({
  cropKey, setCropKey, scenarioName, setScenarioName,
  env, setEnv, econ, setEcon,
  externalTemp, setExternalTemp,
  useML, setUseML, mlEpoch,
  onSimulate, onRecommend, loading,
}: Props & { externalTemp?: number, setExternalTemp?: (t: number | undefined) => void }) {
  const [citySync, setCitySync] = useState<CityKey>("delhi");
  const [syncingWeather, setSyncingWeather] = useState(false);
  const crop = CROPS[cropKey];
  const updateEnv = (key: keyof EnvironmentConfig, value: number) => {
    setEnv({ ...env, [key]: value });
  };

  const updateEcon = (key: keyof EconomicConfig, value: number) => {
    setEcon({ ...econ, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Crop Selection */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Sprout className="h-5 w-5 text-primary" />
            Crop & Scenario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Crop</Label>
            <Select value={cropKey} onValueChange={setCropKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getCropKeys().map((k) => (
                  <SelectItem key={k} value={k}>
                    {CROPS[k].emoji} {CROPS[k].name} — {CROPS[k].description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Scenario Name</Label>
            <Input
              placeholder="e.g. Low-cost lettuce trial"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
            />
          </div>
          {crop && (
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{crop.category}</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                crop.difficulty === "Easy" ? "bg-profit/10 text-profit" :
                crop.difficulty === "Medium" ? "bg-accent/10 text-accent-foreground" :
                "bg-destructive/10 text-destructive"
              }`}>{crop.difficulty}</span>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{crop.cycle_days} days</span>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">₹{crop.price_per_kg}/kg</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Weather Sync */}
      <Card className="shadow-card border-l-4 border-l-sky-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <CloudRain className="h-5 w-5 text-sky-500" />
            Live Weather Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Make HVAC cooling costs geographically accurate by syncing with real-time temperature data.
          </p>
          <div className="flex gap-2">
            <Select value={citySync} onValueChange={(v) => setCitySync(v as CityKey)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delhi">New Delhi (Hot)</SelectItem>
                <SelectItem value="dubai">Dubai (Extreme)</SelectItem>
                <SelectItem value="mumbai">Mumbai (Humid)</SelectItem>
                <SelectItem value="bangalore">Bangalore (Mild)</SelectItem>
                <SelectItem value="london">London (Cool)</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              size="icon" 
              variant="outline" 
              className={externalTemp !== undefined ? "bg-sky-50 border-sky-200 text-sky-600 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-400" : ""}
              disabled={syncingWeather}
              onClick={async () => {
                if (externalTemp !== undefined) {
                   setExternalTemp?.(undefined);
                   toast.success("Live weather unlinked. Using isolated indoor HVAC simulation.");
                   return;
                }
                setSyncingWeather(true);
                try {
                  const w = await fetchLiveWeather(citySync);
                  setExternalTemp?.(w.temperature_c);
                  toast.success(`Weather synced! It is currently ${w.temperature_c}°C in ${w.location_name}. HVAC load increased.`);
                } catch (e) {
                  toast.error("Failed to sync weather from Open-Meteo API");
                } finally {
                  setSyncingWeather(false);
                }
              }}
            >
              {syncingWeather ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            </Button>
          </div>
          {externalTemp !== undefined && (
             <div className="text-[11px] font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1.5 bg-sky-50 dark:bg-sky-500/10 p-2 rounded-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                HVAC bound to {externalTemp}°C outside
             </div>
          )}
        </CardContent>
      </Card>

      {/* Environment */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Sun className="h-5 w-5 text-accent" />
            Environment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {crop && (
            <>
              <OptimalRangeSlider
                label="Temperature"
                value={env.temperature_c}
                min={5} max={40} step={0.5}
                optMin={crop.optimal_temp_min} optMax={crop.optimal_temp_max}
                onChange={(v) => updateEnv("temperature_c", v)}
                unit="°C"
              />
              <OptimalRangeSlider
                label="Light Hours / Day"
                value={env.light_hours_per_day}
                min={4} max={24} step={1}
                optMin={Math.max(4, crop.optimal_light_hours - 2)} optMax={Math.min(24, crop.optimal_light_hours + 2)}
                onChange={(v) => updateEnv("light_hours_per_day", v)}
                unit="h"
              />
              <OptimalRangeSlider
                label="CO₂"
                value={env.co2_ppm}
                min={300} max={1500} step={50}
                optMin={Math.max(300, crop.optimal_co2_ppm - 200)} optMax={Math.min(1500, crop.optimal_co2_ppm + 200)}
                onChange={(v) => updateEnv("co2_ppm", v)}
                unit=" ppm"
              />
              <OptimalRangeSlider
                label="Water pH"
                value={env.water_ph}
                min={4.0} max={9.0} step={0.1}
                optMin={crop.water_ph_min} optMax={crop.water_ph_max}
                onChange={(v) => updateEnv("water_ph", v)}
              />
              <OptimalRangeSlider
                label="EC (Nutrient Concentration)"
                value={env.ec_ms_cm}
                min={0.2} max={4.0} step={0.1}
                optMin={crop.ec_min} optMax={crop.ec_max}
                onChange={(v) => updateEnv("ec_ms_cm", v)}
                unit=" mS/cm"
              />
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Humidity (%)</Label>
              <Input type="number" value={env.humidity_pct} onChange={(e) => updateEnv("humidity_pct", +e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Light Power (kW)</Label>
              <Input type="number" step="0.1" value={env.light_power_kw} onChange={(e) => updateEnv("light_power_kw", +e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Plant Count</Label>
              <Input type="number" value={env.plant_count} onChange={(e) => updateEnv("plant_count", +e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Economics */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <DollarSign className="h-5 w-5 text-primary" />
            Economics (INR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Electricity ₹/kWh</Label>
              <Input type="number" step="0.5" value={econ.electricity_price_per_kwh} onChange={(e) => updateEcon("electricity_price_per_kwh", +e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Labour ₹/day (base)</Label>
              <Input type="number" value={econ.labour_cost_per_day} onChange={(e) => updateEcon("labour_cost_per_day", +e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Labour ₹/plant/day</Label>
              <Input type="number" step="0.1" value={econ.labour_cost_per_plant_per_day} onChange={(e) => updateEcon("labour_cost_per_plant_per_day", +e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nutrients ₹/day (base)</Label>
              <Input type="number" value={econ.nutrient_cost_per_day} onChange={(e) => updateEcon("nutrient_cost_per_day", +e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nutrients ₹/plant/day</Label>
              <Input type="number" step="0.1" value={econ.nutrient_cost_per_plant_per_day} onChange={(e) => updateEcon("nutrient_cost_per_plant_per_day", +e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Droplets className="h-3 w-3" /> Water ₹/litre
              </Label>
              <Input type="number" step="0.1" value={econ.water_cost_per_litre} onChange={(e) => updateEcon("water_cost_per_litre", +e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CAPEX (₹)</Label>
              <Input type="number" value={econ.infrastructure_capex} onChange={(e) => updateEcon("infrastructure_capex", +e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payback (years)</Label>
              <Input type="number" step="0.5" value={econ.payback_horizon_years} onChange={(e) => updateEcon("payback_horizon_years", +e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ML Engine Toggle */}
      {setUseML && (
        <Card className="shadow-card border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                  <BrainCircuit className="h-4 w-4" /> TensorFlow.js AI Engine
                </Label>
                <div className="text-xs text-muted-foreground mr-2">
                  Train a Neural Network in your browser instead of math.
                </div>
              </div>
              <Button 
                variant={useML ? "default" : "outline"}
                size="sm"
                onClick={() => setUseML(!useML)}
                className={useML ? "bg-primary text-primary-foreground min-w-[60px]" : "min-w-[60px]"}
              >
                {useML ? "ON" : "OFF"}
              </Button>
            </div>
            {useML && mlEpoch && mlEpoch.total > 0 && (
              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-xs font-medium text-primary">
                  <span>Training ML Model...</span>
                  <span>Epoch {mlEpoch.current} / {mlEpoch.total}</span>
                </div>
                <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out" 
                    style={{ width: `${(mlEpoch.current / mlEpoch.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={onSimulate} disabled={loading} className="flex-1 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Zap className="mr-2 h-4 w-4" />
          {loading ? "Running..." : "Run Simulation"}
        </Button>
        <Button onClick={onRecommend} disabled={loading} variant="outline" className="flex-1">
          <Lightbulb className="mr-2 h-4 w-4" />
          {loading ? "Searching..." : "Recommend Best"}
        </Button>
      </div>
    </div>
  );
}
