import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatINR, formatPercent } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  formatSupabaseError,
  isMissingSupabaseRelationWithStatus,
} from "@/integrations/supabase/errors";

interface RunSummary {
  id: string;
  created_at: string;
  scenario_name: string;
  crop_name: string;
  yield_kg: number;
  net_profit: number;
  roi: number;
}

interface Props {
  onLoadRun: (id: string) => void;
  refreshKey?: number;
}

export default function RecentRuns({ onLoadRun, refreshKey }: Props) {
  const { user } = useAuth();
  const [runs, setRuns] = useState<RunSummary[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchRuns = async () => {
      const { data, error, status, statusText } = await supabase
        .from("simulation_runs")
        .select("id, created_at, scenario_name, crop_name, yield_kg, net_profit, roi")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Failed to fetch recent runs:", { error, status, statusText });
        if (isMissingSupabaseRelationWithStatus(error, status, "simulation_runs")) {
          toast.error(
            "Database tables not found (simulation_runs). Apply the Supabase migration to enable saving/history."
          );
        } else {
          toast.error(`Failed to load recent runs: ${formatSupabaseError(error, status, statusText)}`);
        }
        setRuns([]);
        return;
      }

      setRuns(data || []);
    };

    fetchRuns();
  }, [user, refreshKey]);

  const bestRun = runs.reduce<RunSummary | null>((best, run) => {
    if (!best || run.roi > best.roi) return run;
    return best;
  }, null);

  if (runs.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          <History className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No simulations yet. Run one to see history!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <History className="h-5 w-5 text-primary" />
            Recent Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {runs.map((run) => (
              <button
                key={run.id}
                onClick={() => onLoadRun(run.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{run.scenario_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {run.crop_name} • {new Date(run.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-sm font-display font-semibold ${run.net_profit > 0 ? "text-profit" : "text-loss"}`}>
                    {formatINR(run.net_profit)}
                  </span>
                  <Badge variant={run.net_profit > 0 ? "default" : "destructive"} className="text-xs">
                    {run.net_profit > 0 ? "Profit" : "Loss"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {bestRun && bestRun.roi > 0 && (
        <Card className="shadow-glow border-primary/30">
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="h-6 w-6 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Best ROI so far</p>
              <p className="text-sm font-semibold font-display truncate">
                {bestRun.scenario_name} — {formatPercent(bestRun.roi)} ROI, {formatINR(bestRun.net_profit)} profit
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
