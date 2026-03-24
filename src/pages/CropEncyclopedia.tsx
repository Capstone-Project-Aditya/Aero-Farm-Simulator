import { CROPS, getCropKeys, CropConfig } from "@/lib/simulation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { BookOpen, FlaskConical, Thermometer, Sun, Wind, Droplets, Zap } from "lucide-react";

function CropCard({ crop }: { crop: CropConfig }) {
  const navigate = useNavigate();

  return (
    <Card className="shadow-card group hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-primary via-primary/60 to-accent opacity-60 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <span className="text-2xl">{crop.emoji}</span>
              {crop.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{crop.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant="outline" className={`text-[10px] ${
            crop.difficulty === "Easy" ? "border-profit text-profit" :
            crop.difficulty === "Medium" ? "border-accent text-accent-foreground" :
            "border-destructive text-destructive"
          }`}>
            {crop.difficulty}
          </Badge>
          <Badge variant="outline" className="text-[10px]">{crop.category}</Badge>
          <Badge variant="secondary" className="text-[10px]">₹{crop.price_per_kg.toLocaleString("en-IN")}/kg</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-secondary/50">
            <Thermometer className="h-3.5 w-3.5 text-destructive/70" />
            <div>
              <p className="text-muted-foreground">Temperature</p>
              <p className="font-semibold">{crop.optimal_temp_min}–{crop.optimal_temp_max}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-secondary/50">
            <Sun className="h-3.5 w-3.5 text-accent" />
            <div>
              <p className="text-muted-foreground">Light</p>
              <p className="font-semibold">{crop.optimal_light_hours}h/day</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-secondary/50">
            <Wind className="h-3.5 w-3.5 text-info" />
            <div>
              <p className="text-muted-foreground">CO₂</p>
              <p className="font-semibold">{crop.optimal_co2_ppm} ppm</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-secondary/50">
            <Droplets className="h-3.5 w-3.5 text-primary" />
            <div>
              <p className="text-muted-foreground">pH</p>
              <p className="font-semibold">{crop.water_ph_min}–{crop.water_ph_max}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Cycle:</span>
              <span className="font-semibold ml-1">{crop.cycle_days}d</span>
            </div>
            <div>
              <span className="text-muted-foreground">EC:</span>
              <span className="font-semibold ml-1">{crop.ec_min}–{crop.ec_max}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Max:</span>
              <span className="font-semibold ml-1">{crop.max_biomass_g}g</span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          variant="outline"
          onClick={() => navigate("/simulator")}
        >
          <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
          Simulate This Crop
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CropEncyclopedia() {
  const cropKeys = getCropKeys();
  const categories = [...new Set(cropKeys.map(k => CROPS[k].category))];

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Crop Encyclopedia
        </h2>
        <p className="text-muted-foreground mt-1">
          Explore all {cropKeys.length} crops with optimal growing conditions, pricing, and agronomic data.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        {categories.map(cat => {
          const count = cropKeys.filter(k => CROPS[k].category === cat).length;
          return (
            <Badge key={cat} variant="secondary" className="text-xs gap-1.5 px-3 py-1.5">
              {cat}
              <span className="text-primary font-bold">{count}</span>
            </Badge>
          );
        })}
      </div>

      {/* Crop grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cropKeys.map((key) => (
          <CropCard key={key} crop={CROPS[key]} />
        ))}
      </div>
    </div>
  );
}
