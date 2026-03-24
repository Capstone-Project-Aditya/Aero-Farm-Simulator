import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "lucide-react";
import type { EconomicResult } from "@/lib/simulation";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  economics: EconomicResult;
}

export default function CostBreakdownChart({ economics }: Props) {
  const data = {
    labels: ["Electricity", "Labour", "Nutrients", "Water", "Infrastructure"],
    datasets: [
      {
        data: [
          economics.electricity_cost,
          economics.labour_cost,
          economics.nutrient_cost,
          economics.water_cost,
          economics.infrastructure_cost_per_cycle,
        ],
        backgroundColor: [
          "hsl(38, 90%, 55%)",
          "hsl(200, 70%, 50%)",
          "hsl(152, 55%, 40%)",
          "hsl(210, 60%, 60%)",
          "hsl(280, 50%, 55%)",
        ],
        borderColor: "hsl(var(--card))",
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { family: "'Inter', sans-serif", size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
            return ` ₹${value.toLocaleString("en-IN")} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <PieChart className="h-5 w-5 text-primary" />
          Cost Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] relative">
          <Doughnut data={data} options={options} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: "40px" }}>
            <div className="text-center">
              <p className="text-2xl font-display font-bold">₹{economics.total_cost.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-muted-foreground">Total Cost</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
