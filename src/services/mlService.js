/**
 * ML Service — EcoFleet AI
 * Calls real ML endpoints if available, falls back to smart mock predictions
 * based on actual patterns from ecofleet_shipments.csv
 */

const axios = require('axios');

const ML_BASE = process.env.ML_SERVICE_URL || null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sigmoid that maps a score to [0,1] smoothly */
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

/**
 * Mock empty-mile probability based on CSV-derived patterns:
 *  - Low utilisation trips (< 40%) are almost always underloaded (is_underloaded=1)
 *  - High utilisation (> 80%) rarely empty-run
 */
function mockEmptyMilePrediction({ utilization, distanceKm, origin, destination }) {
  const baseProb = utilization < 0.4 ? 0.72 : utilization > 0.8 ? 0.12 : 0.35;
  // Long haul is riskier for empty return
  const distanceFactor = distanceKm > 500 ? 0.08 : -0.05;
  // Known high-demand corridors from CSV
  const highDemandPairs = [
    ['Chennai', 'Coimbatore'], ['Delhi', 'Lucknow'], ['Mumbai', 'Surat'],
    ['Bangalore', 'Hyderabad'], ['Kolkata', 'Bhubaneswar']
  ];
  const isHighDemand = highDemandPairs.some(
    ([o, d]) => (o === origin && d === destination) || (o === destination && d === origin)
  );
  const corridorFactor = isHighDemand ? -0.15 : 0.05;
  const prob = Math.min(0.95, Math.max(0.05, baseProb + distanceFactor + corridorFactor + (Math.random() - 0.5) * 0.08));
  return +prob.toFixed(3);
}

/**
 * Mock demand prediction for origin-destination pair
 * Returns predicted load factor and confidence
 */
function mockDemandPrediction({ origin, destination, week = 1 }) {
  const highDemandCorridors = {
    'Chennai-Coimbatore': 0.82, 'Delhi-Lucknow': 0.76, 'Mumbai-Surat': 0.91,
    'Bangalore-Hyderabad': 0.88, 'Kolkata-Bhubaneswar': 0.69,
    'Delhi-Jaipur': 0.74, 'Mumbai-Pune': 0.85, 'Hyderabad-Nagpur': 0.68
  };
  const key = `${origin}-${destination}`;
  const reverseKey = `${destination}-${origin}`;
  const baseDemand = highDemandCorridors[key] || highDemandCorridors[reverseKey] || 0.55;
  // Add weekly seasonality (week 3-4 is peak)
  const weekFactor = [0, -0.05, -0.02, 0.06, 0.08, 0.03, -0.01, 0.04][(week % 7)] || 0;
  const demand = Math.min(1, Math.max(0.2, baseDemand + weekFactor + (Math.random() - 0.5) * 0.08));
  return {
    predictedLoadFactor: +demand.toFixed(3),
    confidence: +(0.72 + Math.random() * 0.2).toFixed(3),
    peakWeeks: [3, 4, 8],
    recommendation: demand > 0.75 ? 'High demand — price above market' : demand < 0.45 ? 'Low demand — consider bundling' : 'Stable corridor'
  };
}

/**
 * Mock route efficiency — penalises long detours
 */
function mockRouteEfficiency({ distanceKm, routeDeviation = 0 }) {
  const deviationPenalty = routeDeviation * 0.3;
  const efficiency = Math.min(1, Math.max(0.3, 0.85 - deviationPenalty + (Math.random() - 0.5) * 0.05));
  return {
    efficiencyScore: +efficiency.toFixed(3),
    estimatedFuelL: +(distanceKm / 4.2).toFixed(1),
    co2Kg: +(distanceKm / 4.2 * 2.68).toFixed(1),
    recommendation: efficiency > 0.75 ? 'Optimal route' : 'Consider alternative highway'
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Predict probability truck returns empty after delivery
 */
async function predictEmptyMile(payload) {
  if (ML_BASE) {
    try {
      const { data } = await axios.post(`${ML_BASE}/ml/predict-empty-mile`, payload, { timeout: 3000 });
      return data;
    } catch (_) {
      // ML service unavailable — use mock
    }
  }
  return { emptyMileProbability: mockEmptyMilePrediction(payload), source: 'mock' };
}

/**
 * Predict demand for a corridor
 */
async function predictDemand(payload) {
  if (ML_BASE) {
    try {
      const { data } = await axios.post(`${ML_BASE}/ml/predict-demand`, payload, { timeout: 3000 });
      return data;
    } catch (_) {}
  }
  return { ...mockDemandPrediction(payload), source: 'mock' };
}

/**
 * Predict route efficiency score
 */
async function predictRouteEfficiency(payload) {
  if (ML_BASE) {
    try {
      const { data } = await axios.post(`${ML_BASE}/ml/predict-route-efficiency`, payload, { timeout: 3000 });
      return data;
    } catch (_) {}
  }
  return { ...mockRouteEfficiency(payload), source: 'mock' };
}

module.exports = { predictEmptyMile, predictDemand, predictRouteEfficiency };
