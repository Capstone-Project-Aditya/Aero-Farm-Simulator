import { useState, useRef } from "react";
import { supabase, supabaseConfig } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, Sparkles, X, Activity, Stethoscope, Gauge, Pill, ShieldCheck, Bug, Droplets, Leaf } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/* ---------- Section icon mapping ---------- */
function getSectionIcon(text: string) {
  const t = text.toLowerCase();
  if (t.includes("diagnosis") || t.includes("analysis")) return <Stethoscope className="h-5 w-5" />;
  if (t.includes("severity")) return <Gauge className="h-5 w-5" />;
  if (t.includes("treatment") || t.includes("remedy")) return <Pill className="h-5 w-5" />;
  if (t.includes("prevention") || t.includes("prevent")) return <ShieldCheck className="h-5 w-5" />;
  if (t.includes("pest") || t.includes("insect")) return <Bug className="h-5 w-5" />;
  if (t.includes("nutrient") || t.includes("deficiency")) return <Droplets className="h-5 w-5" />;
  return <Leaf className="h-5 w-5" />;
}

/* ---------- Severity badge ---------- */
function SeverityBadge({ text }: { text: string }) {
  const t = text.toLowerCase();
  if (t.includes("severe") || t.includes("critical") || t.includes("high")) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">🔴 Severe</span>;
  }
  if (t.includes("moderate") || t.includes("medium")) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">🟡 Moderate</span>;
  }
  if (t.includes("mild") || t.includes("low") || t.includes("minor")) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">🟢 Mild</span>;
  }
  if (t.includes("healthy") || t.includes("no issue") || t.includes("normal")) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">✅ Healthy</span>;
  }
  return null;
}

/* ---------- Custom Markdown components ---------- */
const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1
      className="text-2xl font-bold font-display text-foreground mb-4 pb-3 border-b-2 border-primary/20"
      {...props}
    >
      {children}
    </h1>
  ),

  h2: ({ children, ...props }) => {
    const text = typeof children === "string" ? children : String(children ?? "");
    // Strip emoji from display text for icon matching
    const cleanText = text.replace(/[\u{1F000}-\u{1FFFF}]/gu, "").trim();
    return (
      <div className="flex items-center gap-3 mt-8 mb-4 first:mt-0">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
          {getSectionIcon(cleanText)}
        </div>
        <h2
          className="text-xl font-bold font-display text-foreground m-0"
          {...props}
        >
          {cleanText}
        </h2>
      </div>
    );
  },

  h3: ({ children, ...props }) => (
    <h3
      className="text-base font-semibold font-display text-foreground mt-5 mb-2 pl-3 border-l-[3px] border-primary/30"
      {...props}
    >
      {children}
    </h3>
  ),

  h4: ({ children, ...props }) => (
    <h4
      className="text-sm font-semibold font-display mt-4 mb-1.5 uppercase tracking-wide text-muted-foreground"
      {...props}
    >
      {children}
    </h4>
  ),

  p: ({ children, ...props }) => {
    const text = typeof children === "string" ? children : "";
    const badge = <SeverityBadge text={text} />;
    return (
      <p className="text-sm leading-relaxed text-foreground/85 mb-3 last:mb-0" {...props}>
        {badge && <span className="mr-2">{badge}</span>}
        {children}
      </p>
    );
  },

  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),

  ul: ({ children, ...props }) => (
    <ul className="space-y-1.5 my-3 ml-1" {...props}>
      {children}
    </ul>
  ),

  ol: ({ children, ...props }) => (
    <ol className="space-y-2 my-3 ml-1 list-none counter-reset-step" {...props}>
      {children}
    </ol>
  ),

  li: ({ children, ...props }) => (
    <li className="flex items-start gap-2 text-sm leading-relaxed text-foreground/85" {...props}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  ),

  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-accent/50 bg-accent/5 rounded-r-lg px-4 py-3 my-4 text-sm italic text-foreground/80"
      {...props}
    >
      {children}
    </blockquote>
  ),

  table: ({ children, ...props }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),

  thead: ({ children, ...props }) => (
    <thead className="bg-secondary/70 text-foreground" {...props}>
      {children}
    </thead>
  ),

  tbody: ({ children, ...props }) => (
    <tbody className="divide-y divide-border" {...props}>
      {children}
    </tbody>
  ),

  tr: ({ children, ...props }) => (
    <tr className="transition-colors hover:bg-secondary/30" {...props}>
      {children}
    </tr>
  ),

  th: ({ children, ...props }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground" {...props}>
      {children}
    </th>
  ),

  td: ({ children, ...props }) => (
    <td className="px-4 py-2.5 text-sm text-foreground/85" {...props}>
      {children}
    </td>
  ),

  hr: (props) => (
    <hr className="my-6 border-t border-border/50" {...props} />
  ),

  code: ({ children, className, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded-md bg-secondary text-primary font-mono text-xs font-medium"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`${className} text-xs`} {...props}>
        {children}
      </code>
    );
  },

  pre: ({ children, ...props }) => (
    <pre
      className="my-4 rounded-lg bg-secondary/50 border border-border p-4 overflow-x-auto text-xs"
      {...props}
    >
      {children}
    </pre>
  ),
};

export default function PlantHealth() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be smaller than 5MB");
        return;
      }
      
      setImageFile(file);
      setDiagnosis(null); // Clear previous
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImageBase64(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
    setDiagnosis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleScanPlant = async () => {
    if (!imageBase64) return;
    
    setIsScanning(true);
    toast.loading("AI is analyzing your plant...", { id: "vision-scan" });

    try {
      // Build the edge function URL the same way AI Insights does
      const baseUrl = supabaseConfig.url?.replace(/\/+$/, "");
      if (!baseUrl) {
        throw new Error("Supabase URL is not configured.");
      }
      const fnUrl = `${baseUrl}/functions/v1/gemini-vision`;

      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          apikey: supabaseConfig.anonKey ?? "",
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          mime_type: imageFile?.type || "image/jpeg",
        }),
      });

      const rawText = await response.text();
      let parsed: any;
      try {
        parsed = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        console.error("gemini-vision error:", response.status, rawText);
        throw new Error(parsed?.error || `Scan failed (HTTP ${response.status})`);
      }

      if (parsed?.error) {
        throw new Error(parsed.error);
      }
      
      if (parsed?.diagnosis) {
        setDiagnosis(parsed.diagnosis);
        toast.success("Scan complete!", { id: "vision-scan" });
      } else {
        throw new Error("Invalid response from AI.");
      }

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred during analysis.", { id: "vision-scan" });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          AI Plant Scanner
        </h2>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Upload a photo of a sick leaf, yellowing stem, or suspected pest. 
          Gemini Vision will analyze it and prescribe an aeroponic treatment plan.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[400px_1fr]">
        <Card className="shadow-smooth h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-display">Upload Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!imagePreview ? (
              <div 
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <UploadCloud className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Click to upload photo</h3>
                <p className="text-xs text-muted-foreground mb-4">JPEG, PNG, or WebP (max 5MB)</p>
                <Button variant="secondary" size="sm">Select File</Button>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border bg-black/5 aspect-square flex items-center justify-center group">
                <img 
                  src={imagePreview} 
                  alt="Plant preview" 
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={handleClearImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs bg-black/60 text-white px-2 py-1 rounded backdrop-blur-sm">
                    {imageFile?.name}
                  </span>
                </div>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/jpeg,image/png,image/webp"
              className="hidden" 
            />

            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleScanPlant} 
              disabled={!imagePreview || isScanning}
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Vision Data...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Ask Gemini Vision
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className={`shadow-card transition-opacity duration-300 ${!diagnosis ? "opacity-50" : ""}`}>
          <CardHeader className={diagnosis ? "pb-2 border-b border-border/50" : ""}>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              {diagnosis ? (
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                  <Stethoscope className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
              <div>
                <span className="block">Diagnosis & Treatment Plan</span>
                {diagnosis && (
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                    AI-powered plant pathology report
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className={diagnosis ? "pt-6" : ""}>
            {diagnosis ? (
              <div className="ai-recommendation-content animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {diagnosis}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-xl bg-muted/20">
                <Activity className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
                <p className="text-muted-foreground text-sm max-w-[250px]">
                  Upload a photo and run the scanner to see your customized pathology report here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
