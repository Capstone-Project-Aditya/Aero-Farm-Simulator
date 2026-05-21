import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatNumber(value: unknown, digits: number): string {
  const n = toFiniteNumber(value);
  return n === null ? "n/a" : n.toFixed(digits);
}

function formatInteger(value: unknown): string {
  const n = toFiniteNumber(value);
  return n === null ? "n/a" : Math.round(n).toString();
}

function getAuthorizationHeader(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header;
}

async function requireSupabaseUser(req: Request) {
  const authorization = getAuthorizationHeader(req);
  if (!authorization) {
    return {
      user: null,
      response: new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    } as const;
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      user: null,
      response: new Response(JSON.stringify({ error: "Supabase env vars missing in function runtime" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    } as const;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    console.error("Auth rejected:", error);
    return {
      user: null,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    } as const;
  }

  return { user: data.user, response: null } as const;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // With verify_jwt disabled at the gateway, enforce auth explicitly here.
    const auth = await requireSupabaseUser(req);
    if (auth.response) return auth.response;

    const { crop_key, simulation_history } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");



    // Build context from simulation history
    let historyContext = "";
    if (simulation_history && simulation_history.length > 0) {
      const summary = simulation_history
        .map((r: any) => {
          const scenario = typeof r?.scenario_name === "string" && r.scenario_name.trim() ? r.scenario_name : "Unnamed run";
          const cropName = typeof r?.crop_name === "string" && r.crop_name.trim() ? r.crop_name : "Unknown crop";

          const roi = toFiniteNumber(r?.roi);
          const roiPercent = roi === null ? "n/a" : (roi * 100).toFixed(1);

          const temp = formatNumber(r?.temperature_c, 1);
          const light = formatNumber(r?.light_hours_per_day, 1);
          const co2 = formatInteger(r?.co2_ppm);
          const plants = formatInteger(r?.plant_count);

          return `- ${scenario} (${cropName}): Yield=${formatNumber(r?.yield_kg, 2)}kg, ROI=${roiPercent}%, Profit=₹${formatInteger(r?.net_profit)}, Temp=${temp}°C, Light=${light}h, CO2=${co2}ppm, Plants=${plants}`;
        })
        .join("\n");
      historyContext = `\n\nUser's simulation history (most recent first):\n${summary}`;
    }

    const systemPrompt = `You are an expert indoor aeroponic farming advisor. You analyze simulation data and provide actionable recommendations to farmers.

Crop database (Indian market):
- Lettuce: 35-day cycle, optimal 18-24°C, 16h light, 1000ppm CO2, ₹120/kg
- Strawberry: 90-day cycle, optimal 15-22°C, 14h light, 900ppm CO2, ₹400/kg  
- Saffron: 120-day cycle, optimal 15-20°C, 12h light, 800ppm CO2, ₹300,000/kg
- Basil: 28-day cycle, optimal 20-28°C, 14h light, 1000ppm CO2, ₹250/kg
- Spinach: 40-day cycle, optimal 15-22°C, 14h light, 900ppm CO2, ₹80/kg

FORMAT RULES (follow these strictly):
- Use proper markdown with clear ## headings for each major section
- Keep paragraphs SHORT (2-3 sentences max). No walls of text.
- Use bullet points for listing parameters, tips, and action items
- Use **bold** for key metrics and values (e.g. **Temperature: 20°C**)
- Use markdown tables (with | header | syntax) for the Risk Assessment section
- Put each environment parameter on its own bullet point
- Keep the overall response concise and scannable — a farmer should grasp key points in 30 seconds

REQUIRED SECTIONS (use these exact ## headings):

## Optimal Environment Settings
List each parameter as a bullet point with the value in bold, followed by a brief reason in parentheses.

## Predicted Performance
Show expected yield, revenue, costs, net profit, and ROI as bullet points. Keep numbers specific.

## Cost Optimization Strategies
Provide 3-5 actionable tips as bullet points. Each tip should be one concise sentence.

## Risk Assessment & Mitigation
Present as a markdown table with columns: Risk | Severity | Mitigation

## Comparison with Past Runs
If simulation history is available, show what changed and expected improvement. If no history, suggest running simulations first.

Use Indian Rupees (₹) for all monetary values. Be specific with numbers. Do NOT write long paragraphs — keep it concise and actionable.`;

    const userPrompt = `Give me a concise, well-structured recommendation for growing "${crop_key}" in an indoor aeroponic system. Follow the format rules exactly. Include specific numbers for all environment settings and economics.${historyContext}`;

    const finalPrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}`;

    // Use the exact same approach as the working gemini/index.ts function
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: finalPrompt }] }],
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini status:", response.status);

    if (!response.ok || data.error) {
      const errMsg = data?.error?.message || JSON.stringify(data?.error) || "Unknown Gemini error";
      console.error("Gemini API error:", response.status, errMsg);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ error: `Gemini API error: ${errMsg}` }),
        {
          status: response.status || 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let recommendation = "Unable to generate recommendation.";
    if (data.candidates?.length) {
      recommendation = data.candidates[0].content.parts
        .map((p: any) => p.text)
        .join(" ");
    }

    return new Response(JSON.stringify({ recommendation, model_used: "gemini-flash-latest" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-crop-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
