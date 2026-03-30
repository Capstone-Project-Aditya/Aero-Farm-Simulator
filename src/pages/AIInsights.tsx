import { useState, useEffect } from "react";
import { supabase, supabaseConfig } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Loader2, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { getCropKeys, CROPS } from "@/lib/simulation/crops";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  formatSupabaseError,
  isMissingSupabaseRelationWithStatus,
} from "@/integrations/supabase/errors";

function getFunctionErrorDetails(error: unknown): {
  status?: number;
  statusText?: string;
  message?: string;
  bodyText?: string;
} {
  if (!error || typeof error !== "object") return {};
  const anyErr = error as Record<string, unknown>;

  const status = typeof anyErr.status === "number" ? anyErr.status : undefined;
  const message = typeof anyErr.message === "string" ? anyErr.message : undefined;

  const ctx = anyErr.context as any;
  const ctxStatus = typeof ctx?.status === "number" ? ctx.status : undefined;
  const ctxStatusText = typeof ctx?.statusText === "string" ? ctx.statusText : undefined;

  let bodyText: string | undefined;
  const body = ctx?.body;
  if (typeof body === "string") bodyText = body;
  else if (body && typeof body === "object") {
    try {
      bodyText = JSON.stringify(body);
    } catch {
      bodyText = undefined;
    }
  }

  return {
    status: status ?? ctxStatus,
    statusText: ctxStatusText,
    message,
    bodyText,
  };
}

function getEdgeFunctionUrl(functionName: string): string | null {
  if (!supabaseConfig.url) return null;
  try {
    const base = supabaseConfig.url.replace(/\/+$/, "");
    return `${base}/functions/v1/${functionName}`;
  } catch {
    return null;
  }
}

export default function AIInsights() {
  const { user } = useAuth();
  const [selectedCrop, setSelectedCrop] = useState("lettuce");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [runCount, setRunCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count, error, status, statusText } = await supabase
        .from("simulation_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

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
    })();
  }, [user]);

  const getAIRecommendation = async () => {
    if (!user) return;

    if (!supabaseConfig.isConfigured) {
      toast.error(
        "Supabase environment variables are missing in this build. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (preferred) or VITE_SUPABASE_PUBLISHABLE_KEY, then redeploy."
      );
      console.error("Supabase is not configured:", supabaseConfig);
      return;
    }

    setLoading(true);
    setAiResponse("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        toast.error(`Failed to read auth session: ${formatSupabaseError(sessionError)}`);
        return;
      }

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Your session is missing/expired. Please sign out and sign in again.");
        return;
      }

      // Fetch user's simulation history for context
      const { data: runs, error: runsError, status, statusText } = await supabase
        .from("simulation_runs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (runsError) {
        if (isMissingSupabaseRelationWithStatus(runsError, status, "simulation_runs")) {
          toast.error(
            "Database tables not found (simulation_runs). Apply the Supabase migration first."
          );
        } else {
          toast.error(`Failed to load history: ${formatSupabaseError(runsError, status, statusText)}`);
        }
        return;
      }

      const fnUrl = getEdgeFunctionUrl("ai-crop-advisor");
      if (!fnUrl) {
        toast.error("Could not compute Edge Function URL. Check VITE_SUPABASE_URL.");
        return;
      }

      // Use direct fetch so we can read the raw response body for non-2xx.
      const response = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseConfig.anonKey ?? "",
        },
        body: JSON.stringify({
          crop_key: selectedCrop,
          simulation_history: runs || [],
        }),
      });

      const rawText = await response.text();
      const parsedBody = (() => {
        try {
          return rawText ? JSON.parse(rawText) : null;
        } catch {
          return null;
        }
      })();

      if (!response.ok) {
        const status = response.status;
        const msg = `${rawText || ""}`.toLowerCase();

        if (msg.includes("failed to send a request to the edge function")) {
          toast.error(
            "Could not reach the Edge Function endpoint. Check VITE_SUPABASE_URL (must be your https://*.supabase.co URL), confirm the function is deployed, and ensure the request isn’t blocked by network/CORS."
          );
          console.error("Edge Function invoke network failure", {
            functionUrl: fnUrl,
            supabaseUrl: supabaseConfig.url,
            anonKeyPresent: supabaseConfig.anonKeyPresent,
            status,
            body: rawText,
          });
          return;
        }

        if (status === 404 || msg.includes("not found")) {
          toast.error(
            "AI function is not deployed in Supabase (ai-crop-advisor). Deploy the Edge Function and try again."
          );
        } else if (status === 500) {
          console.error("Edge Function internal error", { status, body: rawText });

          if (msg.includes("gemini_api_key") || msg.includes("not configured")) {
            toast.error(
              "GEMINI_API_KEY is missing in Supabase Edge Function secrets. Set it and redeploy the function."
            );
          } else {
            const extra = rawText ? ` — ${rawText}` : "";
            toast.error(`AI request failed (HTTP 500). Check Supabase Edge Function logs.${extra}`);
          }
        } else if (status === 401 || status === 403) {
          console.error("Edge Function unauthorized", { status, body: rawText });

          if (msg.includes("invalid api key") || msg.includes("apikey") || msg.includes("invalid key")) {
            toast.error(
              "Unauthorized: Supabase API key is invalid. Use your Supabase anon public key (starts with eyJ...) in VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) and redeploy."
            );
          } else if (msg.includes("jwt") || msg.includes("token") || msg.includes("authorization")) {
            toast.error(
              "Unauthorized: your session token was rejected. Sign out/in again; also confirm VITE_SUPABASE_URL points to the same Supabase project as your login."
            );
          } else {
            const extra = rawText ? ` — ${rawText}` : "";
            toast.error(
              `AI request was not authorized (HTTP ${status ?? "?"}). Check Vercel env vars and login.${extra}`
            );
          }
        } else if (status === 429 || msg.includes("429") || msg.includes("rate limit")) {
          toast.error("Rate limit reached. Please try again in a moment.");
        } else if (status === 402 || msg.includes("402") || msg.includes("payment required")) {
          toast.error("AI credits exhausted. Please add credits in your workspace settings.");
        } else if (msg.includes("gemini_api_key") || msg.includes("not configured")) {
          toast.error("GEMINI_API_KEY is missing in Supabase Edge Function secrets. Set it and redeploy the function.");
        } else {
          toast.error(`AI request failed (HTTP ${status}): ${rawText || "Unknown error"}`);
        }
        return;
      }

      const recommendation =
        typeof parsedBody?.recommendation === "string" ? parsedBody.recommendation : undefined;

      if (!recommendation) {
        toast.error("AI response was empty. Check Supabase Edge Function logs.");
        return;
      }

      setAiResponse(recommendation);
    } catch (err: any) {
      console.error("AI error:", err);
      toast.error(`Failed to get AI recommendation: ${formatSupabaseError(err)}`);
    } finally {
      setLoading(false);
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
          Get AI-powered recommendations based on your simulation history and crop parameters.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Get Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Select Crop</label>
                <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getCropKeys().map((k) => (
                      <SelectItem key={k} value={k}>{CROPS[k].name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground p-3 rounded-lg bg-secondary/50">
                <p className="font-medium mb-1">What AI will analyze:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Optimal environment settings for {CROPS[selectedCrop].name}</li>
                  <li>Your past {runCount} simulation results</li>
                  <li>Cost reduction strategies</li>
                  <li>Yield improvement opportunities</li>
                </ul>
              </div>

              <Button className="w-full" onClick={getAIRecommendation} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {loading ? "Analyzing..." : "Get AI Recommendation"}
              </Button>
            </CardContent>
          </Card>

          {runCount === 0 && (
            <Card className="border-warning/30">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Run some simulations first for more personalized AI recommendations.
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
                  AI Recommendation for {CROPS[selectedCrop].name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">AI-Powered Insights</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Select a crop and click "Get AI Recommendation" to receive optimal settings, cost strategies, and yield predictions based on your data.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
