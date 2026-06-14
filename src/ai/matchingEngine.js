/**
 * AI Matching Engine — EcoFleet AI
 * 
 * Final Score = 0.35×RouteMatch + 0.25×Profitability + 0.20×CarbonSavings + 0.20×CapacityUtilization
 * 
 * Also calls ML service for empty-mile probability enrichment.
 */

const mlService = require('../services/mlService');
const { calcCarbonSavings } = require('../services/carbonService');

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Linear normalise value to [0,1] given expected min/max */
const norm = (val, min, max) => Math.min(1, Math.max(0, (val - min) / (max - min)));

// ─── Sub-scores ───────────────────────────────────────────────────────────────

/**
 * Route Match Score [0–1]
 * How well the truck's current route overlaps with the shipment's pickup → destination
 */
function routeMatchScore(truck, shipment) {
  const pickupLat = shipment.pickupLocation.lat;
  const pickupLng = shipment.pickupLocation.lng;
  const destLat   = shipment.destination.lat;
  const destLng   = shipment.destination.lng;

  const truckLat = truck.currentLocation.lat;
  const truckLng = truck.currentLocation.lng;
  const truckDestLat = truck.destination.lat;
  const truckDestLng = truck.destination.lng;

  // Distance from truck to pickup
  const pickupDist = haversineKm(truckLat, truckLng, pickupLat, pickupLng);
  // Distance from truck dest to shipment dest
  const destDist   = haversineKm(truckDestLat, truckDestLng, destLat, destLng);

  // Ideal: truck passes through / near pickup and shares destination
  const pickupScore = norm(pickupDist, 0, 600) * -1 + 1; // closer = higher
  const destScore   = norm(destDist,   0, 600) * -1 + 1;

  return +(0.6 * pickupScore + 0.4 * destScore).toFixed(3);
}

/**
 * Profitability Score [0–1]
 * Based on price per ton and estimated revenue
 */
function profitabilityScore(truck, shipment) {
  const revenue       = truck.pricePerTon * shipment.weight;
  const estimatedCost = (shipment.distanceKm / truck.fuelEfficiency) * 91; // fuel cost
  const profit        = revenue - estimatedCost;
  return +norm(profit, -5000, 50000).toFixed(3);
}

/**
 * Carbon Savings Score [0–1]
 * Higher empty-mile probability means MORE savings from filling that truck
 */
function carbonScore(truck, emptyMileProb) {
  // Higher empty-mile probability = bigger CO₂ win if we fill this truck
  return +norm(emptyMileProb, 0, 1).toFixed(3);
}

/**
 * Capacity Utilization Score [0–1]
 * Penalises over-booking or severe under-utilization
 */
function capacityScore(truck, shipmentWeight) {
  if (truck.availableCapacity < shipmentWeight) return 0; // can't fit
  const utilizationGain = shipmentWeight / truck.totalCapacity;
  return +norm(utilizationGain, 0, 0.8).toFixed(3);
}

// ─── Main Matching Logic ──────────────────────────────────────────────────────

/**
 * Score a single truck against a shipment
 * Returns enriched truck object with scores
 */
async function scoreTruck(truck, shipment) {
  const mlResult = await mlService.predictEmptyMile({
    utilization: truck.usedCapacity / truck.totalCapacity,
    distanceKm:  shipment.distanceKm || 300,
    origin:      truck.currentLocation.city,
    destination: truck.destination.city
  });

  const emptyMileProb = mlResult.emptyMileProbability || truck.emptyMileProbability || 0.3;

  const R = routeMatchScore(truck, shipment);
  const P = profitabilityScore(truck, shipment);
  const C = norm(emptyMileProb, 0, 1); // carbon score (higher prob = bigger saving opportunity)
  const U = capacityScore(truck, shipment.weight);

  const finalScore = +(0.35 * R + 0.25 * P + 0.20 * C + 0.20 * U).toFixed(4);
  const displayScore = Math.round(finalScore * 100);

  // Compute carbon savings if truck is matched
  const emptyMilesReduced = Math.round(emptyMileProb * (shipment.distanceKm || 300));
  const { fuelSaved, co2Saved, costSaved } = calcCarbonSavings({
    emptyMilesReduced,
    fuelEfficiency: truck.fuelEfficiency
  });

  const estimatedProfit = Math.round(truck.pricePerTon * shipment.weight * 0.35);

  return {
    truck,
    scores: { routeMatch: R, profitability: P, carbonSaving: C, utilization: U },
    finalScore,
    displayScore,
    emptyMileProb,
    emptyMilesReduced,
    fuelSaved,
    co2Saved,
    costSaved,
    estimatedProfit,
    mlSource: mlResult.source || 'live'
  };
}

/**
 * Run the full matching pipeline
 * @param {Object} shipment - the shipment object
 * @param {Array}  trucks   - candidate trucks (pre-filtered by status/capacity)
 * @param {Number} topN     - how many results to return
 */
async function runMatchingEngine(shipment, trucks, topN = 5) {
  // Filter: only available trucks that can carry the weight
  const candidates = trucks.filter(
    t => t.status === 'available' && t.availableCapacity >= shipment.weight
  );

  if (candidates.length === 0) return { matches: [], error: 'No available trucks for this weight' };

  // Score all candidates in parallel
  const scored = await Promise.all(candidates.map(t => scoreTruck(t, shipment)));

  // Sort descending by final score
  scored.sort((a, b) => b.finalScore - a.finalScore);

  const top = scored.slice(0, topN);
  const best = top[0];

  // Build reasoning labels for the best match
  const reasoning = [];
  if (best.scores.routeMatch > 0.7)    reasoning.push('High route overlap — minimal detour');
  if (best.scores.profitability > 0.6)  reasoning.push('Strong profit margin on this load');
  if (best.emptyMileProb > 0.5)         reasoning.push(`${Math.round(best.emptyMileProb * 100)}% chance of empty return — filling saves ${best.co2Saved} kg CO₂`);
  if (best.scores.utilization > 0.6)    reasoning.push(`Improves truck utilization by ~${Math.round(best.scores.utilization * 80)}%`);
  if (best.truck.rating >= 4.5)         reasoning.push(`Top-rated driver (★${best.truck.rating})`);
  if (reasoning.length === 0)            reasoning.push('Best available option based on composite AI score');

  return {
    bestTruck:          best.truck,
    matchScore:         best.displayScore,
    estimatedProfit:    best.estimatedProfit,
    emptyMilesReduced:  best.emptyMilesReduced,
    fuelSaved:          best.fuelSaved,
    co2Saved:           best.co2Saved,
    costSaved:          best.costSaved,
    reasoning,
    scores:             best.scores,
    allMatches:         top.map(m => ({
      truckId:      m.truck.truckId,
      driverName:   m.truck.driverName,
      truckType:    m.truck.truckType,
      matchScore:   m.displayScore,
      availCap:     m.truck.availableCapacity,
      pricePerTon:  m.truck.pricePerTon,
      rating:       m.truck.rating,
      co2Saved:     m.co2Saved,
      emptyMilesReduced: m.emptyMilesReduced
    }))
  };
}

module.exports = { runMatchingEngine, scoreTruck, haversineKm };
