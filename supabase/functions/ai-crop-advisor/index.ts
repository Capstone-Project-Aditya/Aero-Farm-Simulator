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

    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";

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

Provide recommendations in clear markdown with:
1. **Optimal Environment Settings** — specific temperature, light hours, CO2, and plant count
2. **Predicted Performance** — expected yield, revenue, and profitability  
3. **Cost Optimization** — ways to reduce electricity, labour, and nutrient costs
4. **Risk Assessment** — potential issues and mitigation strategies
5. **Comparison with Past Runs** — how this recommendation improves on their history (if available)

Use Indian Rupees (₹) for all monetary values. Be specific with numbers.`;

    const userPrompt = `Give me an optimal crop recommendation for growing "${crop_key}" in an indoor aeroponic system. Include specific environment settings, expected economics, and actionable tips.${historyContext}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 1200,
      },
    };

    // Google has changed Gemini REST endpoints and available model IDs over time.
    // We try:
    // - API versions: v1beta then v1
    // - Model IDs: configured model first, then common fallbacks
    const candidateModels = Array.from(
      new Set(
        [
          GEMINI_MODEL,
          "gemini-1.5-flash",
          "gemini-1.5-flash-latest",
          "gemini-1.5-pro",
          "gemini-1.5-pro-latest",
        ].filter(Boolean)
      )
    );

    const buildUrls = (model: string) => [
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    ];

    let response: Response | null = null;
    let lastText: string | null = null;
    let lastStatus: number | null = null;
    let modelUsed: string | null = null;

    outer: for (const model of candidateModels) {
      for (const url of buildUrls(model)) {
        const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (r.ok) {
          response = r;
          modelUsed = model;
          break outer;
        }

        const status = r.status;
        const text = await r.text();
        lastStatus = status;
        lastText = text;

        // If the endpoint or model isn't found on this API version, try the next.
        if (status === 404) continue;

        // Any other status (401/403/429/400/5xx) is not a "try next" situation.
        response = new Response(text, {
          status,
          headers: r.headers,
        });
        modelUsed = model;
        break outer;
      }
    }

    if (!response) {
      return new Response(
        JSON.stringify({
          error:
            "Gemini API error: 404 (model or endpoint not found). Check GEMINI_MODEL and ensure the Generative Language API is enabled for your API key.",
          tried_models: candidateModels,
          last_status: lastStatus,
          details: lastText ? lastText.slice(0, 800) : undefined,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("Gemini API error:", status, text ?? lastText);
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (status === 400) {
        return new Response(JSON.stringify({ error: "Bad request to Gemini API" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (status === 404) {
        return new Response(
          JSON.stringify({
            error:
              "Gemini API returned 404 (model not found). Set GEMINI_MODEL to a valid model (for example: gemini-1.5-flash, gemini-1.5-flash-latest, gemini-1.5-pro) and redeploy.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (status === 401 || status === 403) {
        return new Response(JSON.stringify({ error: "Gemini API key is invalid or missing permissions" }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Gemini API error: ${status}`);
    }

    const data = await response.json();
    const recommendation =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => (typeof p?.text === "string" ? p.text : ""))
        .join("")
        .trim() || "Unable to generate recommendation.";

    return new Response(JSON.stringify({ recommendation, model_used: modelUsed ?? GEMINI_MODEL }), {
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
