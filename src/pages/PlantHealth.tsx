import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, Sparkles, X, Activity } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
      const { data, error } = await supabase.functions.invoke("gemini-vision", {
        body: { 
          image_base64: imageBase64,
          mime_type: imageFile?.type || "image/jpeg"
        }
      });

      if (error) {
        console.error("Function error:", error);
        throw new Error("Failed to scan plant. Ensure the edge function is deployed.");
      }

      if (data?.error) {
         throw new Error(data.error);
      }
      
      if (data?.diagnosis) {
        setDiagnosis(data.diagnosis);
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

        <Card className={`shadow-card ${!diagnosis ? "opacity-50" : ""}`}>
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Diagnosis & Treatment Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diagnosis ? (
              <div className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-table:text-sm prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-secondary/50 prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
