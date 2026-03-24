import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, formatPercent } from "@/lib/formatters";
import { useNavigate } from "react-router-dom";
import { FlaskConical, TrendingUp, Trophy, BarChart3, Sprout, ArrowRight, Droplets, Activity } from "lucide-react";
import { toast } from "sonner";
import {
  formatSupabaseError,
  isMissingSupabaseRelationWithStatus,
} from "@/integrations/supabase/errors";

interface Stats {
  totalRuns: number;
  profitableRuns: number;
  bestRoi: number;
  bestScenario: string;
  totalRevenue: number;
  avgSuccessProb: number;
}

function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setDisplay(current);
      ref.current = current;
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

function StatCard({ title, value, icon, gradient }: {
  title: string; value: React.ReactNode; icon: React.ReactNode; gradient?: string;
}) {
  return (
    <Card className="shadow-card hover:shadow-elevated transition-all duration-300 group relative overflow-hidden">
      {gradient && (
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
      )}
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-display font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data, error, status, statusText } = await supabase
        .from("simulation_runs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch dashboard stats:", { error, status, statusText });
        if (isMissingSupabaseRelationWithStatus(error, status, "simulation_runs")) {
          toast.error(
            "Database tables not found (simulation_runs). Apply the Supabase migration to enable saving/history."
          );
        } else {
          toast.error(
            `Failed to load dashboard data: ${formatSupabaseError(error, status, statusText)}`
          );
        }
        setStats(null);
        setRecentRuns([]);
        return;
      }

      if (!data || data.length === 0) {
        setStats(null);
        setRecentRuns([]);
        return;
      }

      setRecentRuns(data.slice(0, 5));

      const profitableRuns = data.filter((r) => r.net_profit > 0);
      const best = data.reduce((a, b) => (a.roi > b.roi ? a : b));
      setStats({
        totalRuns: data.length,
        profitableRuns: profitableRuns.length,
        bestRoi: best.roi,
        bestScenario: best.scenario_name,
        totalRevenue: data.reduce((s, r) => s + r.revenue, 0),
        avgSuccessProb: data.reduce((s, r) => s + r.success_probability, 0) / data.length,
      });
    };
    fetchStats();
  }, [user]);

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your aeroponic farming simulations</p>
      </div>

      {!stats ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4 animate-pulse">
              <Sprout className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">Welcome to AeroFarm Simulator!</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Run your first simulation to see growth predictions, profitability analysis, and AI-powered recommendations.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/simulator")}>
                <FlaskConical className="mr-2 h-4 w-4" />
                Run First Simulation
              </Button>
              <Button variant="outline" onClick={() => navigate("/crops")}>
                <Sprout className="mr-2 h-4 w-4" />
                Browse Crops
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Simulations"
              icon={<FlaskConical className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-primary/5 to-transparent"
              value={<AnimatedCounter value={stats.totalRuns} />}
            />
            <StatCard
              title="Profitable Runs"
              icon={<TrendingUp className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-profit/5 to-transparent"
              value={
                <span className="text-profit">
                  <AnimatedCounter value={stats.profitableRuns} />
                  <span className="text-lg text-muted-foreground">/{stats.totalRuns}</span>
                </span>
              }
            />
            <StatCard
              title="Best ROI"
              icon={<Trophy className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-accent/5 to-transparent"
              value={
                <div>
                  <AnimatedCounter value={stats.bestRoi} suffix="%" decimals={1} />
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{stats.bestScenario}</p>
                </div>
              }
            />
            <StatCard
              title="Avg Success Rate"
              icon={<Activity className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-info/5 to-transparent"
              value={<AnimatedCounter value={stats.avgSuccessProb * 100} suffix="%" decimals={1} />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Recent Simulations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentRuns.map((run) => (
                    <div key={run.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{run.scenario_name}</p>
                        <p className="text-xs text-muted-foreground">{run.crop_name} • {new Date(run.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-display font-semibold ${run.net_profit > 0 ? "text-profit" : "text-loss"}`}>
                          {formatINR(run.net_profit)}
                        </span>
                        <Badge variant={run.net_profit > 0 ? "default" : "destructive"}>
                          {run.net_profit > 0 ? "Profit" : "Loss"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-glow border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display">
                  <Trophy className="h-5 w-5 text-accent" />
                  Best Performing Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-semibold">{stats.bestScenario}</p>
                <p className="text-sm text-muted-foreground">
                  ROI: <span className="text-profit font-semibold">{formatPercent(stats.bestRoi)}</span> •
                  Total Revenue: <span className="font-semibold">{formatINR(stats.totalRevenue)}</span>
                </p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => navigate("/simulator")}>
                    <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
                    New Simulation
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/ai-insights")}>
                    <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                    AI Insights
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/crops")}>
                    <Sprout className="mr-1.5 h-3.5 w-3.5" />
                    Crops
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
