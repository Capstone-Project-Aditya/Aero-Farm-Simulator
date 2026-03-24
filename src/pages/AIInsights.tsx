import { useState, useEffect } from "react";
import { supabase, supabaseConfig } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Loader2, Sparkles, TrendingUp, AlertTriangle, Cpu, Cloud } from "lucide-react";
import { getCropKeys, CROPS, DEFAULT_ECONOMICS } from "@/lib/simulation";
import { generateLocalRecommendation } from "@/lib/simulation/localAdvisor";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  formatSupabaseError,
  isMissingSupabaseRelationWithStatus,
} from "@/integrations/supabase/errors";

export default function AIInsights() {
  const { user } = useAuth();
  const [selectedCrop, setSelectedCrop] = useState("lettuce");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [runCount, setRunCount] = useState(0);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);
  const [mode, setMode] = useState<"local" | "gemini">("local");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, count, error, status, statusText } = await supabase
        .from("simulation_runs")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        if (isMissingSupabaseRelationWithStatus(error, status, "simulation_runs")) {
          toast.error(
            "Database tables not found (simulation_runs). Apply the Supabase migration to enable AI context + history."
          );
        } else {
          toast.error(`Failed to load simulation history: ${formatSupabaseError(error, status, statusText)}`);
        }
        setRunCount(0);
        return;
      }

      setRunCount(count || 0);
      setSimulationHistory(data || []);
    })();
  }, [user]);

  const getLocalRecommendation = () => {
    setLoading(true);
    setAiResponse("");

    // Small delay for UX feedback
    setTimeout(() => {
      try {
        const recommendation = generateLocalRecommendation(
          selectedCrop,
          DEFAULT_ECONOMICS,
          simulationHistory
        );
        setAiResponse(recommendation);
      } catch (err) {
        console.error("Local advisor error:", err);
        toast.error("Failed to generate local recommendation");
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const getGeminiRecommendation = async () => {
    if (!user) return;

    if (!supabaseConfig.isConfigured) {
      toast.error(
        "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy."
      );
      return;
    }

    setLoading(true);
    setAiResponse("");

    try {
      // supabase.functions.invoke() handles JWT auth + CORS automatically
      const { data, error } = await supabase.functions.invoke("gemini", {
        body: {
          crop_key: selectedCrop,
          simulation_history: simulationHistory,
        },
      });

      if (error) {
        // Extract the actual response body from the error
        let errorBody = "";
        try {
          if (error.context && typeof error.context.json === "function") {
            const body = await error.context.json();
            errorBody = body?.error || JSON.stringify(body);
          } else {
            errorBody = error.message || "Unknown error";
          }
        } catch {
          errorBody = error.message || "Unknown error";
        }
        console.error("Edge Function error:", errorBody, error);

        toast.error(`Gemini AI: ${errorBody}`);

        // Auto-fallback to local
        toast.info("Falling back to Local advisor...");
        const fallback = generateLocalRecommendation(selectedCrop, DEFAULT_ECONOMICS, simulationHistory);
        setAiResponse(fallback);
        setMode("local");
        return;
      }

      const recommendation =
        typeof data?.recommendation === "string" ? data.recommendation : undefined;

      if (!recommendation) {
        toast.error("AI response was empty. Using local advisor instead.");
        const fallback = generateLocalRecommendation(selectedCrop, DEFAULT_ECONOMICS, simulationHistory);
        setAiResponse(fallback);
        setMode("local");
        return;
      }

      setAiResponse(recommendation);
    } catch (err: any) {
      console.error("AI error:", err);
      toast.error("Gemini AI failed. Falling back to Local advisor...");
      const fallback = generateLocalRecommendation(selectedCrop, DEFAULT_ECONOMICS, simulationHistory);
      setAiResponse(fallback);
      setMode("local");
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendation = () => {
    if (mode === "local") {
      getLocalRecommendation();
    } else {
      getGeminiRecommendation();
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          AI Crop Advisor
        </h2>
        <p className="text-muted-foreground mt-1">
          Get smart recommendations based on your simulation history and crop parameters.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Get Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode toggle */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Advisor Mode</label>
                <Tabs value={mode} onValueChange={(v) => setMode(v as "local" | "gemini")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="local" className="gap-1.5">
                      <Cpu className="h-3.5 w-3.5" />
                      Local
                    </TabsTrigger>
                    <TabsTrigger value="gemini" className="gap-1.5">
                      <Cloud className="h-3.5 w-3.5" />
                      Gemini AI
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {mode === "local"
                    ? "Uses simulation engine locally — always works, no API needed"
                    : "Uses Google Gemini AI — requires deployed Edge Function + API key"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Select Crop</label>
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

              <div className="text-xs text-muted-foreground p-3 rounded-lg bg-secondary/50">
                <p className="font-medium mb-1">What the advisor will analyze:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Optimal environment settings for {CROPS[selectedCrop].name}</li>
                  <li>Your past {runCount} simulation results</li>
                  <li>Cost reduction strategies</li>
                  <li>Yield improvement opportunities</li>
                  <li>Alternative crop suggestions</li>
                  <li>Annual revenue projections</li>
                </ul>
              </div>

              <Button className="w-full" onClick={handleGetRecommendation} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : mode === "local" ? (
                  <Cpu className="mr-2 h-4 w-4" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {loading ? "Analyzing..." : mode === "local" ? "Analyze Locally" : "Get Gemini AI Recommendation"}
              </Button>
            </CardContent>
          </Card>

          {runCount === 0 && (
            <Card className="border-warning/30">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Run some simulations first for more personalized recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {aiResponse ? (
            <Card className="shadow-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {mode === "local" ? "Local" : "Gemini AI"} Recommendation for {CROPS[selectedCrop].emoji} {CROPS[selectedCrop].name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-table:text-sm prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-secondary/50 prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {aiResponse}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">Smart Crop Analysis</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Select a crop and click the button to receive optimal settings, cost strategies,
                  yield predictions, and alternative crop suggestions.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  💡 Tip: Use <strong>Local mode</strong> for instant results — no API key required!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
