import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line } from "react-chartjs-2";
import { DailyState } from "@/lib/simulation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Conditionally register annotation plugin if available
try {
  ChartJS.register(annotationPlugin);
} catch {
  // annotation plugin not available, skip
}

interface Props {
  dailyStates: DailyState[];
}

export default function GrowthChart({ dailyStates }: Props) {
  const totalDays = dailyStates.length;

  // Growth stage boundaries
  const germinationEnd = Math.floor(totalDays * 0.2);
  const vegetativeEnd = Math.floor(totalDays * 0.5);
  const maturationEnd = Math.floor(totalDays * 0.8);

  const data = {
    labels: dailyStates.map((s) => `Day ${s.day}`),
    datasets: [
      {
        label: "Biomass Total (kg)",
        data: dailyStates.map((s) => s.biomass_total_kg),
        borderColor: "hsl(152, 55%, 32%)",
        backgroundColor: "hsla(152, 55%, 32%, 0.1)",
        fill: true,
        yAxisID: "y",
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      {
        label: "Biomass / Plant (g)",
        data: dailyStates.map((s) => s.biomass_per_plant_g),
        borderColor: "hsl(200, 70%, 50%)",
        backgroundColor: "transparent",
        fill: false,
        yAxisID: "y2",
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
        borderDash: [3, 3],
      },
      {
        label: "Stress Factor",
        data: dailyStates.map((s) => s.stress_factor),
        borderColor: "hsl(0, 72%, 51%)",
        backgroundColor: "hsla(0, 72%, 51%, 0.05)",
        fill: true,
        yAxisID: "y1",
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderDash: [5, 5],
        borderWidth: 1.5,
      },
    ],
  };

  // Build annotation boxes for growth stages
  const stageAnnotations: Record<string, any> = {};
  const stageColors = [
    "hsla(38, 90%, 55%, 0.06)",
    "hsla(152, 55%, 40%, 0.06)",
    "hsla(200, 70%, 50%, 0.06)",
    "hsla(280, 50%, 55%, 0.06)",
  ];
  const stageLabels = ["Germination", "Vegetative", "Maturation", "Harvest"];
  const stageBounds = [0, germinationEnd, vegetativeEnd, maturationEnd, totalDays - 1];

  for (let i = 0; i < 4; i++) {
    stageAnnotations[`stage${i}`] = {
      type: "box",
      xMin: stageBounds[i],
      xMax: stageBounds[i + 1],
      backgroundColor: stageColors[i],
      borderWidth: 0,
      label: {
        display: true,
        content: stageLabels[i],
        position: { x: "center", y: "start" },
        font: { size: 9, family: "'Inter', sans-serif", weight: "500" },
        color: "hsl(150, 10%, 45%)",
        padding: 4,
      },
    };
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: { family: "'Space Grotesk', sans-serif", size: 11 },
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      annotation: {
        annotations: stageAnnotations,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxTicksLimit: 10,
          font: { family: "'Inter', sans-serif", size: 11 },
        },
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: true,
          text: "Biomass (kg)",
          font: { family: "'Space Grotesk', sans-serif", size: 12 },
        },
        grid: { color: "hsla(140, 15%, 88%, 0.5)" },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        title: {
          display: true,
          text: "Stress (0-1)",
          font: { family: "'Space Grotesk', sans-serif", size: 12 },
        },
        min: 0,
        max: 1,
        grid: { drawOnChartArea: false },
      },
      y2: {
        type: "linear" as const,
        display: false,
      },
    },
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <BarChart3 className="h-5 w-5 text-primary" />
          Growth & Stress Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[340px]">
          <Line data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
