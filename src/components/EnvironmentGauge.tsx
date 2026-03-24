import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  successProbability: number;
  stressFactor: number;
}

export default function EnvironmentGauge({ successProbability, stressFactor }: Props) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const score = Math.round(successProbability * 100);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (v: number) => {
    if (v >= 80) return "hsl(152, 60%, 40%)";
    if (v >= 50) return "hsl(38, 90%, 55%)";
    return "hsl(0, 72%, 51%)";
  };

  const getLabel = (v: number) => {
    if (v >= 80) return "Excellent";
    if (v >= 60) return "Good";
    if (v >= 40) return "Fair";
    return "Poor";
  };

  const color = getColor(animatedValue);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference * 0.75;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <Activity className="h-5 w-5 text-primary" />
          Environment Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-6">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="transform -rotate-[135deg]">
              {/* Background arc */}
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * 0.25}
              />
              {/* Animated fill arc */}
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-display font-bold" style={{ color }}>{animatedValue}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{getLabel(animatedValue)}</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Success Rate</span>
              <p className="font-semibold font-display" style={{ color }}>{(successProbability * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Avg Stress</span>
              <p className="font-semibold font-display text-foreground">{(stressFactor * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
