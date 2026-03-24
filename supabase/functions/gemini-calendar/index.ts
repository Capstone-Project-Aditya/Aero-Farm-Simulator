import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CROP_INFO: Record<string, string> = {
  lettuce: "Lettuce: 35-day cycle",
  strawberry: "Strawberry: 90-day cycle",
  saffron: "Saffron: 120-day cycle",
  basil: "Basil: 28-day cycle",
  spinach: "Spinach: 40-day cycle",
  tomato: "Tomato: 80-day cycle",
  pepper: "Bell Pepper: 75-day cycle",
  cucumber: "Cucumber: 50-day cycle",
  mint: "Mint: 30-day cycle",
  kale: "Kale: 45-day cycle",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const cropKey = body.crop_key;

    if (!cropKey) {
      return new Response(
        JSON.stringify({ error: "'crop_key' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing GEMINI_API_KEY in Supabase secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cropContext = CROP_INFO[cropKey] || `Crop: ${cropKey}`;

    const prompt = `You are an expert indoor aeroponic farming advisor.
I am starting a new aeroponic cycle for ${cropContext}.

Provide a day-by-day action plan for the entire growth cycle. 
Output ONLY a valid JSON array of objects. Do not wrap it in markdown code blocks like \`\`\`json. Just the raw array.

Every object in the array must have exactly these keys:
- "day_offset" (number): The day number of the cycle (e.g., 1 for Day 1, 14 for Day 14).
- "title" (string): Short action title (e.g., "Sow Seeds", "Adjust pH").
- "description" (string): 1-2 sentences detailing the action.

Example format:
[
  { "day_offset": 1, "title": "Sow Seeds", "description": "Place seeds in rockwool cubes and mist lightly." },
  { "day_offset": 7, "title": "Transfer to Net Pots", "description": "Move seedlings to aeroponic towers." }
]

Ensure important milestones like germination, vegetative growth adjustments, and expected harvest day are included. Keep it realistic for an aeroponic setup. Give about 8 to 12 milestone tasks spaced across the cycle.`;

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
          generationConfig: {
            temperature: 0.2, // Low temperature for more deterministic structured output
            responseMimeType: "application/json", // Force JSON output
          }
        }),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${data.error.message}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rawText = "";
    if (data.candidates?.length) {
      rawText = data.candidates[0].content.parts.map((p: any) => p.text).join("");
    }

    let tasks = [];
    try {
      tasks = JSON.parse(rawText);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini response as JSON", raw: rawText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ tasks }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
