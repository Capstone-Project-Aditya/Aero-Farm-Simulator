import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { FullResult } from "@/hooks/useSimulator";
import { getCrop, runSimulation, evaluateEconomics } from "@/lib/simulation";
import { formatINR } from "@/lib/formatters";

interface Props {
  result: FullResult;
}

export default function SensitivityAnalysis({ result }: Props) {
  const [open, setOpen] = useState(false);
  const [plantMultiplier, setPlantMultiplier] = useState(100);

  const crop = getCrop(result.cropKey);

  const sensitivityData = useMemo(() => {
    if (!crop) return [];
    const points: { multiplier: number; profit: number; yield_kg: number; roi: number }[] = [];

    for (let m = 25; m <= 200; m += 25) {
      const adjustedEnv = { ...result.env, plant_count: Math.round(result.env.plant_count * m / 100) };
      const sim = runSimulation(crop, adjustedEnv);
      const econ = evaluateEconomics(sim.yield_kg, sim.cycle_days, crop, adjustedEnv, result.econ, sim.total_water_litres);
      points.push({ multiplier: m, profit: econ.net_profit, yield_kg: sim.yield_kg, roi: econ.roi });
    }

    return points;
  }, [crop, result.env, result.econ, result.cropKey]);

  const selectedPoint = useMemo(() => {
    if (!crop) return null;
    const adjustedEnv = { ...result.env, plant_count: Math.round(result.env.plant_count * plantMultiplier / 100) };
    const sim = runSimulation(crop, adjustedEnv);
    const econ = evaluateEconomics(sim.yield_kg, sim.cycle_days, crop, adjustedEnv, result.econ, sim.total_water_litres);
    return { plants: adjustedEnv.plant_count, profit: econ.net_profit, yield_kg: sim.yield_kg, roi: econ.roi };
  }, [crop, result.env, result.econ, plantMultiplier, result.cropKey]);

  if (!crop) return null;

  const maxProfit = Math.max(...sensitivityData.map(d => d.profit));
  const minProfit = Math.min(...sensitivityData.map(d => d.profit));
  const profitRange = maxProfit - minProfit || 1;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="shadow-card border-l-4 border-l-accent">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-2">
            <CardTitle className="flex items-center justify-between text-lg font-display">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-accent" />
                What-If Analysis
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Plant Count Adjustment</Label>
              <Slider
                value={[plantMultiplier]}
                min={25} max={200} step={25}
                onValueChange={([v]) => setPlantMultiplier(v)}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>25%</span>
                <span className="font-medium text-foreground">{plantMultiplier}% ({selectedPoint?.plants ?? 0} plants)</span>
                <span>200%</span>
              </div>
            </div>

            {/* Mini bar chart */}
            <div className="flex items-end gap-1 h-20">
              {sensitivityData.map((point) => {
                const height = ((point.profit - minProfit) / profitRange) * 100;
                const isSelected = point.multiplier === plantMultiplier;
                const isProfitable = point.profit > 0;
                return (
                  <div key={point.multiplier} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        isSelected
                          ? isProfitable ? "bg-primary shadow-glow" : "bg-destructive"
                          : isProfitable ? "bg-primary/40" : "bg-destructive/40"
                      }`}
                      style={{ height: `${Math.max(4, height)}%` }}
                    />
                    <span className={`text-[8px] ${isSelected ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      {point.multiplier}%
                    </span>
                  </div>
                );
              })}
            </div>

            {selectedPoint && (
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Profit</p>
                  <p className={`text-sm font-display font-bold ${selectedPoint.profit > 0 ? "text-profit" : "text-loss"}`}>
                    {formatINR(selectedPoint.profit)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Yield</p>
                  <p className="text-sm font-display font-bold">{selectedPoint.yield_kg.toFixed(1)} kg</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">ROI</p>
                  <p className={`text-sm font-display font-bold ${selectedPoint.roi > 0 ? "text-profit" : "text-loss"}`}>
                    {selectedPoint.roi.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
