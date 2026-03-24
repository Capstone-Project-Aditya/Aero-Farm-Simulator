import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image_base64, mime_type = "image/jpeg" } = body;

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "'image_base64' is required" }),
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

    const prompt = `You are an expert plant pathologist and aeroponic farming specialist.
Analyze this uploaded image of a plant/leaf.

Provide your diagnosis in clear, well-structured markdown. Use these EXACT headers:

## 🩺 Diagnosis & Analysis
What do you see in this image? Identify the specific illness, pest, or nutrient deficiency. If the plant looks healthy, state that it is healthy.

## 🌡️ Severity
Is this a mild, moderate, or severe issue? Will it kill the crop if left untreated?

## 💊 Aeroponic Treatment Plan
Provide 3-4 specific, actionable organic steps to fix this issue in an indoor aeroponic environment. Be specific about pH adjustments, EC changes, biocontrols (like ladybugs or neem oil), or HVAC/humidity fixes.

## ⚠️ Prevention
How can the farmer prevent this from happening in future cycles?`;

    // Strip the "data:image/jpeg;base64," prefix if the frontend sent it
    const base64Data = image_base64.includes(",") ? image_base64.split(",")[1] : image_base64;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mime_type,
                    data: base64Data
                  }
                }
              ]
            }
          ]
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
    } else {
       return new Response(
        JSON.stringify({ error: "Gemini returned no diagnosis." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ diagnosis: rawText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
