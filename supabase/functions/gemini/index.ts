import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Crop database for building rich prompts
const CROP_INFO: Record<string, string> = {
  lettuce: "Lettuce: 35-day cycle, optimal 18-24°C, 16h light, 1000ppm CO2, ₹120/kg",
  strawberry: "Strawberry: 90-day cycle, optimal 15-22°C, 14h light, 900ppm CO2, ₹400/kg",
  saffron: "Saffron: 120-day cycle, optimal 15-20°C, 12h light, 800ppm CO2, ₹300,000/kg",
  basil: "Basil: 28-day cycle, optimal 20-28°C, 14h light, 1000ppm CO2, ₹250/kg",
  spinach: "Spinach: 40-day cycle, optimal 15-22°C, 14h light, 900ppm CO2, ₹80/kg",
  tomato: "Tomato: 80-day cycle, optimal 20-28°C, 16h light, 1000ppm CO2, ₹60/kg",
  pepper: "Bell Pepper: 75-day cycle, optimal 20-28°C, 14h light, 900ppm CO2, ₹150/kg",
  cucumber: "Cucumber: 50-day cycle, optimal 22-28°C, 14h light, 1000ppm CO2, ₹40/kg",
  mint: "Mint: 30-day cycle, optimal 18-24°C, 14h light, 800ppm CO2, ₹200/kg",
  kale: "Kale: 45-day cycle, optimal 15-22°C, 14h light, 900ppm CO2, ₹150/kg",
};

function buildPrompt(cropKey: string, history: any[]): string {
  const cropInfo = CROP_INFO[cropKey] || `Crop: ${cropKey}`;

  let historyContext = "";
  if (history && history.length > 0) {
    const summary = history
      .slice(0, 10)
      .map((r: any) => {
        const scenario = r?.scenario_name || "Unnamed";
        const cropName = r?.crop_name || "Unknown";
        const roi = typeof r?.roi === "number" ? (r.roi * 100).toFixed(1) : "n/a";
        return `- ${scenario} (${cropName}): Yield=${r?.yield_kg?.toFixed?.(2) || "n/a"}kg, ROI=${roi}%, Profit=₹${Math.round(r?.net_profit || 0)}, Temp=${r?.temperature_c || "n/a"}°C, Light=${r?.light_hours_per_day || "n/a"}h, CO2=${r?.co2_ppm || "n/a"}ppm, Plants=${r?.plant_count || "n/a"}`;
      })
      .join("\n");
    historyContext = `\n\nUser's simulation history (most recent first):\n${summary}`;
  }

  return `You are an expert indoor aeroponic farming advisor for the Indian market.

Selected crop: ${cropInfo}
${historyContext}

Provide your recommendation in well-structured markdown. Use these EXACT section headers and format:

## 🌱 Optimal Setup for [Crop Name]

### 🔧 Optimal Environment Settings
| Parameter | Recommended | Why |
|-----------|-------------|-----|
| Temperature | X°C | reason |
| Light Hours | Xh/day | reason |
| CO₂ | X ppm | reason |
| Water pH | X | reason |
| EC | X mS/cm | reason |
| Light Power | X kW | reason |
| Plant Count | X | reason |

### 📊 Predicted Performance (Per Cycle)
| Metric | Value |
|--------|-------|
| Expected Yield | X kg |
| Revenue | ₹X |
| Total Cost | ₹X |
| **Net Profit** | **₹X** |
| ROI | X% |
| Cost per kg | ₹X |

### 💰 Annual Projection
| Metric | Value |
|--------|-------|
| Cycles/Year | X |
| Annual Yield | X kg |
| Annual Revenue | ₹X |
| Annual Profit | ₹X |
| Payback Period | X years |

### 📉 Cost Optimization Tips
Provide 3-4 specific, actionable cost reduction strategies.

### ⚠️ Risk Assessment
List the top 3 risks and how to mitigate them.

### 🔄 Alternative Crops to Consider
| Crop | Price/kg | Cycle | Why Consider |
|------|----------|-------|--------------|
| crop1 | ₹X | X days | reason |
| crop2 | ₹X | X days | reason |

Use INR (₹) for all currency. Be specific with numbers. Make sure the recommended setup is PROFITABLE.`;
}


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Support both formats: { prompt } or { crop_key, simulation_history }
    let prompt: string;
    if (body.prompt) {
      prompt = body.prompt;
    } else if (body.crop_key) {
      prompt = buildPrompt(body.crop_key, body.simulation_history || []);
    } else {
      return new Response(
        JSON.stringify({ error: "Either 'prompt' or 'crop_key' is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing GEMINI_API_KEY in Supabase secrets" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini status:", response.status);

    let text = "No response from Gemini";
    if (data.candidates?.length) {
      text = data.candidates[0].content.parts
        .map((p: any) => p.text)
        .join(" ");
    } else if (data.error) {
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${data.error.message || JSON.stringify(data.error)}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ recommendation: text }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
