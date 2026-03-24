import { CropConfig, CROPS, getCropKeys } from "./crops";
import { EconomicConfig } from "./environment";
import { findBestSetup } from "./optimizer";
import { formatINR } from "@/lib/formatters";

/**
 * Generates a markdown recommendation for a crop using the local simulation engine.
 * No external API required.
 */
export function generateLocalRecommendation(
  cropKey: string,
  econ: EconomicConfig,
  simulationHistory?: any[]
): string {
  const crop = CROPS[cropKey];
  if (!crop) return "Unknown crop selected.";

  const best = findBestSetup(crop, econ);
  const { bestEnv, simResult, econResult } = best;

  const isProfitable = econResult.net_profit > 0;
  const cyclesPerYear = Math.floor(365 / simResult.cycle_days);
  const annualProfit = econResult.net_profit * cyclesPerYear;
  const annualYield = simResult.yield_kg * cyclesPerYear;

  // Find best alternative crops for comparison
  const alternatives = getCropKeys()
    .filter((k) => k !== cropKey)
    .map((k) => {
      const c = CROPS[k];
      const r = findBestSetup(c, econ);
      return { key: k, crop: c, result: r };
    })
    .filter((a) => a.result.econResult.net_profit > 0)
    .sort((a, b) => b.result.econResult.roi - a.result.econResult.roi)
    .slice(0, 3);

  let md = `# ${crop.emoji} Optimal Setup for ${crop.name}\n\n`;

  // Verdict
  if (isProfitable) {
    md += `> ✅ **Verdict: PROFITABLE** — This setup can earn **${formatINR(annualProfit)}/year** with ${bestEnv.plant_count} plants.\n\n`;
  } else {
    md += `> ⚠️ **Verdict: NOT PROFITABLE** at current cost structure. Consider increasing plant count, reducing costs, or trying a higher-value crop.\n\n`;
  }

  // Optimal Environment
  md += `## 🌡️ Optimal Environment Settings\n\n`;
  md += `| Parameter | Recommended | Optimal Range |\n`;
  md += `|-----------|------------|---------------|\n`;
  md += `| Temperature | **${bestEnv.temperature_c}°C** | ${crop.optimal_temp_min}–${crop.optimal_temp_max}°C |\n`;
  md += `| Light Hours | **${bestEnv.light_hours_per_day}h/day** | ${Math.max(8, crop.optimal_light_hours - 2)}–${Math.min(20, crop.optimal_light_hours + 2)}h |\n`;
  md += `| CO₂ | **${bestEnv.co2_ppm} ppm** | ${crop.optimal_co2_ppm} ppm optimal |\n`;
  md += `| Water pH | **${bestEnv.water_ph.toFixed(1)}** | ${crop.water_ph_min}–${crop.water_ph_max} |\n`;
  md += `| EC | **${bestEnv.ec_ms_cm.toFixed(1)} mS/cm** | ${crop.ec_min}–${crop.ec_max} mS/cm |\n`;
  md += `| Light Power | **${bestEnv.light_power_kw} kW** | — |\n`;
  md += `| Plant Count | **${bestEnv.plant_count}** | Scale for profitability |\n\n`;

  // Predicted Performance
  md += `## 📊 Predicted Performance (Per Cycle: ${simResult.cycle_days} days)\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Expected Yield | **${simResult.yield_kg.toFixed(1)} kg** |\n`;
  md += `| Success Probability | **${(simResult.success_probability * 100).toFixed(1)}%** |\n`;
  md += `| Revenue | **${formatINR(econResult.revenue)}** |\n`;
  md += `| Total Cost | **${formatINR(econResult.total_cost)}** |\n`;
  md += `| Net Profit | **${formatINR(econResult.net_profit)}** |\n`;
  md += `| ROI | **${econResult.roi.toFixed(1)}%** |\n`;
  md += `| Cost per kg | **${formatINR(econResult.cost_per_kg)}** |\n`;
  md += `| Market Price | **₹${crop.price_per_kg}/kg** |\n\n`;

  // Annual projections
  md += `## 📅 Annual Projection (${cyclesPerYear} cycles/year)\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Annual Yield | **${annualYield.toFixed(0)} kg** |\n`;
  md += `| Annual Revenue | **${formatINR(econResult.revenue * cyclesPerYear)}** |\n`;
  md += `| Annual Profit | **${formatINR(annualProfit)}** |\n`;
  md += `| Payback Period | **${econResult.payback_period_years > 0 ? econResult.payback_period_years.toFixed(1) + " years" : "N/A"}** |\n\n`;

  // Cost Optimization Tips
  md += `## 💡 Cost Optimization Tips\n\n`;

  const costBreakdown = [
    { name: "Electricity", cost: econResult.electricity_cost },
    { name: "Labour", cost: econResult.labour_cost },
    { name: "Nutrients", cost: econResult.nutrient_cost },
    { name: "Water", cost: econResult.water_cost },
    { name: "Infrastructure", cost: econResult.infrastructure_cost_per_cycle },
  ].sort((a, b) => b.cost - a.cost);

  const topCost = costBreakdown[0];
  const topPct = ((topCost.cost / econResult.total_cost) * 100).toFixed(0);
  md += `- **Biggest cost driver**: ${topCost.name} (${topPct}% of total = ${formatINR(topCost.cost)})\n`;

  if (topCost.name === "Electricity") {
    md += `  - Consider using solar panels or energy-efficient LED grow lights\n`;
    md += `  - Reduce light hours if within optimal range; ${crop.name} needs only ${crop.optimal_light_hours}h\n`;
  } else if (topCost.name === "Labour") {
    md += `  - Automate irrigation/misting with timer systems\n`;
    md += `  - Batch multiple crop cycles to reduce per-plant labour overhead\n`;
  } else if (topCost.name === "Nutrients") {
    md += `  - Recirculate nutrient solution to reduce waste\n`;
    md += `  - Monitor EC closely to avoid over-dosing\n`;
  }

  md += `- Use the **What-If Analysis** tool in the Simulator to test how changing plant count affects profitability\n`;
  md += `- More plants spread fixed costs and improve ROI — the recommended setup suggests **${bestEnv.plant_count} plants**\n\n`;

  // Risk Assessment
  md += `## ⚡ Risk Assessment\n\n`;
  md += `| Risk | Level | Mitigation |\n`;
  md += `|------|-------|------------|\n`;

  if (simResult.success_probability > 0.85) {
    md += `| Growth Failure | 🟢 Low | Optimal conditions; minimal stress |\n`;
  } else if (simResult.success_probability > 0.6) {
    md += `| Growth Failure | 🟡 Medium | Some environmental stress; fine-tune conditions |\n`;
  } else {
    md += `| Growth Failure | 🔴 High | Significant stress; adjust environment closer to optimal |\n`;
  }

  if (crop.difficulty === "Hard") {
    md += `| Crop Difficulty | 🔴 Hard | ${crop.name} requires precise control; test small-scale first |\n`;
  } else if (crop.difficulty === "Medium") {
    md += `| Crop Difficulty | 🟡 Medium | Moderate experience needed |\n`;
  } else {
    md += `| Crop Difficulty | 🟢 Easy | Beginner-friendly crop |\n`;
  }

  const waterPerKg = simResult.total_water_litres / Math.max(simResult.yield_kg, 0.001);
  md += `| Water Efficiency | ${waterPerKg < 100 ? "🟢" : "🟡"} ${waterPerKg < 100 ? "Good" : "Moderate"} | ${waterPerKg.toFixed(0)} L/kg — aeroponics uses 90% less than soil |\n\n`;

  // Alternative crops
  if (alternatives.length > 0) {
    md += `## 🔄 Alternative Crop Suggestions\n\n`;
    md += `These crops show higher profitability with your current economics:\n\n`;
    md += `| Crop | ROI | Net Profit/Cycle | Cycle Days |\n`;
    md += `|------|-----|-----------------|------------|\n`;
    for (const alt of alternatives) {
      md += `| ${alt.crop.emoji} ${alt.crop.name} | ${alt.result.econResult.roi.toFixed(1)}% | ${formatINR(alt.result.econResult.net_profit)} | ${alt.crop.cycle_days}d |\n`;
    }
    md += `\n`;
  }

  // History context
  if (simulationHistory && simulationHistory.length > 0) {
    md += `## 📋 Based on Your ${simulationHistory.length} Past Simulations\n\n`;
    const sameCropRuns = simulationHistory.filter((r: any) => r.crop_key === cropKey);
    if (sameCropRuns.length > 0) {
      const bestPastRun = sameCropRuns.reduce((a: any, b: any) => (a.roi > b.roi ? a : b));
      md += `- You've run **${sameCropRuns.length}** ${crop.name} simulations before\n`;
      md += `- Your best past ROI for ${crop.name} was **${(bestPastRun.roi * 100).toFixed(1)}%** ("${bestPastRun.scenario_name}")\n`;
      if (econResult.roi > bestPastRun.roi * 100) {
        md += `- ✅ This recommendation improves on your best result!\n`;
      }
    } else {
      md += `- No previous ${crop.name} simulations found — this is your first!\n`;
    }
  }

  return md;
}
