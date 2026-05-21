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

FORMAT RULES (follow strictly):
- Use proper markdown with ## headings for each section (no emoji in headings)
- Keep paragraphs SHORT (2-3 sentences max). No walls of text.
- Use bullet points for all actionable items
- Use **bold** for key terms, chemical names, and values
- Keep the total response concise and scannable

REQUIRED SECTIONS (use these exact ## headings):

## Diagnosis & Analysis
Identify the specific illness, pest, or nutrient deficiency in 2-3 sentences. Name the exact condition (e.g. **Powdery Mildew**, **Nitrogen Deficiency**, **Spider Mites**). If healthy, state that clearly.

## Severity
State severity as one word: **Mild**, **Moderate**, **Severe**, or **Healthy**. Follow with one sentence explaining the impact if untreated.

## Aeroponic Treatment Plan
Provide 3-4 specific steps as numbered bullet points. Each step should be one concise, actionable sentence. Include specific values for pH, EC, concentrations where applicable.

## Prevention
Provide 3-4 bullet points on how to prevent this in future cycles. Keep each point to one sentence.`;


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
