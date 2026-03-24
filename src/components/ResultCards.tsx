import { FullResult } from "@/hooks/useSimulator";
import { formatINR, formatPercent, formatKg, formatYears } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import {
  Leaf, TrendingUp, TrendingDown, DollarSign, Clock,
  Target, BarChart3, Scale, Droplets
} from "lucide-react";

interface Props {
  result: FullResult;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant?: "default" | "profit" | "loss";
}

function MetricCard({ label, value, icon, variant = "default" }: MetricCardProps) {
  const colorClass = variant === "profit"
    ? "text-profit"
    : variant === "loss"
    ? "text-loss"
    : "text-foreground";

  return (
    <Card className="shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 group">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={`text-lg font-display font-semibold ${colorClass}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResultCards({ result }: Props) {
  const { sim, economics, cropName } = result;
  const isProfitable = economics.net_profit > 0;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-semibold">
        Results: {cropName} — {result.scenarioName}
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="Crop Cycle"
          value={`${sim.cycle_days} days`}
          icon={<Leaf className="h-5 w-5 text-primary" />}
        />
        <MetricCard
          label="Success Probability"
          value={formatPercent(sim.success_probability * 100)}
          icon={<Target className="h-5 w-5 text-primary" />}
        />
        <MetricCard
          label="Expected Yield"
          value={formatKg(sim.yield_kg)}
          icon={<Scale className="h-5 w-5 text-primary" />}
        />
        <MetricCard
          label="Revenue"
          value={formatINR(economics.revenue)}
          icon={<DollarSign className="h-5 w-5 text-primary" />}
        />
        <MetricCard
          label="Total Cost"
          value={formatINR(economics.total_cost)}
          icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
        />
        <MetricCard
          label="Net Profit"
          value={formatINR(economics.net_profit)}
          icon={isProfitable ? <TrendingUp className="h-5 w-5 text-profit" /> : <TrendingDown className="h-5 w-5 text-loss" />}
          variant={isProfitable ? "profit" : "loss"}
        />
        <MetricCard
          label="ROI"
          value={formatPercent(economics.roi)}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          variant={economics.roi > 0 ? "profit" : "loss"}
        />
        <MetricCard
          label="Payback Period"
          value={formatYears(economics.payback_period_years)}
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
        />
        <MetricCard
          label="Water Cost"
          value={formatINR(economics.water_cost)}
          icon={<Droplets className="h-5 w-5 text-info" />}
        />
        <MetricCard
          label="Cost / kg"
          value={formatINR(economics.cost_per_kg)}
          icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
        />
      </div>
    </div>
  );
}
