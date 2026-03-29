import { useState } from "react";
import { useSimulator } from "@/hooks/useSimulator";
import SimulationForm from "@/components/SimulationForm";
import ResultCards from "@/components/ResultCards";
import GrowthChart from "@/components/GrowthChart";
import FarmerInsights from "@/components/FarmerInsights";
import EnvironmentGauge from "@/components/EnvironmentGauge";
import CostBreakdownChart from "@/components/CostBreakdownChart";
import SensitivityAnalysis from "@/components/SensitivityAnalysis";
import RecentRuns from "@/components/RecentRuns";
import { Button } from "@/components/ui/button";
import { downloadCSV, emailReport } from "@/lib/export";
import { Sprout, Download, Mail } from "lucide-react";

export default function Simulator() {
  const sim = useSimulator();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSimulate = async () => {
    await sim.simulate();
    setRefreshKey((k) => k + 1);
  };

  const handleRecommend = async () => {
    await sim.recommend();
    setRefreshKey((k) => k + 1);
  };

  // Calculate average stress for the gauge
  const avgStress = sim.result
    ? sim.result.sim.daily_states.reduce((s, d) => s + d.stress_factor, 0) / sim.result.sim.daily_states.length
    : 0;

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Simulator</h2>
        <p className="text-muted-foreground mt-1">
          Configure your crop, environment, and economics to predict growth and profitability.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <SimulationForm
            cropKey={sim.cropKey}
            setCropKey={sim.setCropKey}
            scenarioName={sim.scenarioName}
            setScenarioName={sim.setScenarioName}
            env={sim.env}
            setEnv={sim.setEnv}
            econ={sim.econ}
            setEcon={sim.setEcon}
            externalTemp={sim.externalTemp}
            setExternalTemp={sim.setExternalTemp}
            useML={sim.useML}
            setUseML={sim.setUseML}
            mlEpoch={sim.mlEpoch}
            onSimulate={handleSimulate}
            onRecommend={handleRecommend}
            loading={sim.loading}
          />
          <RecentRuns onLoadRun={sim.loadRun} refreshKey={refreshKey} />
        </div>

        <div className="space-y-6">
          {sim.result ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold sr-only">Results</h3>
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={() => downloadCSV(sim.result!)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => emailReport(sim.result!)}>
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    Email Report
                  </Button>
                </div>
              </div>
              <ResultCards result={sim.result} />

              <div className="grid gap-6 xl:grid-cols-2">
                <EnvironmentGauge
                  successProbability={sim.result.sim.success_probability}
                  stressFactor={avgStress}
                />
                <CostBreakdownChart economics={sim.result.economics} />
              </div>

              <GrowthChart dailyStates={sim.result.sim.daily_states} />
              <FarmerInsights result={sim.result} />
              <SensitivityAnalysis result={sim.result} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                <Sprout className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">Ready to simulate</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Configure your crop, environment, and economics on the left, then click "Run Simulation" to see results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
