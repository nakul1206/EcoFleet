/**
 * Multi-Agent Negotiation System — EcoFleet AI
 * 
 * Three competing agents reach consensus on the best truck for a shipment:
 *   TruckAgent    → maximise utilization & profit
 *   ShipmentAgent → minimise shipping cost & time
 *   NetworkAgent  → reduce empty miles globally
 * 
 * Simple rule-based negotiation with weighted voting.
 */

const { haversineKm } = require('./matchingEngine');

// ─── Agent Definitions ────────────────────────────────────────────────────────

/**
 * Truck Agent — scores from driver/truck owner perspective
 * Prefers: high profit per km, high utilization gain, good rating trucks
 */
function truckAgent(truck, shipment) {
  const revenue       = truck.pricePerTon * shipment.weight;
  const distKm        = shipment.distanceKm || 300;
  const revenuePerKm  = revenue / distKm;
  const utilizationGain = shipment.weight / truck.totalCapacity;

  const profitScore   = Math.min(1, revenuePerKm / 80);     // ₹80/km is excellent
  const utilScore     = Math.min(1, utilizationGain * 2.5);
  const ratingBonus   = (truck.rating - 3) / 2;             // reward high-rated drivers

  const score         = +(0.5 * profitScore + 0.35 * utilScore + 0.15 * ratingBonus).toFixed(3);
  const reasoning     = revenue > 15000
    ? `Strong revenue opportunity — ₹${revenue.toLocaleString('en-IN')}`
    : utilizationGain > 0.5
    ? `Significant utilization gain (+${Math.round(utilizationGain * 100)}%)`
    : `Marginal load — acceptable for route coverage`;

  return { score, reasoning, vote: score > 0.5 ? 'Accept' : 'Reject', agentId: 'TruckAgent' };
}

/**
 * Shipment Agent — scores from shipper perspective
 * Prefers: lowest price, fastest route, reliable driver
 */
function shipmentAgent(truck, shipment, allTrucks) {
  const prices     = allTrucks.map(t => t.pricePerTon).filter(Boolean);
  const minPrice   = Math.min(...prices);
  const maxPrice   = Math.max(...prices);
  const priceScore = 1 - (truck.pricePerTon - minPrice) / (maxPrice - minPrice || 1);

  // Pickup proximity score
  const pickupDist  = haversineKm(
    truck.currentLocation.lat, truck.currentLocation.lng,
    shipment.pickupLocation.lat, shipment.pickupLocation.lng
  );
  const proximityScore = Math.max(0, 1 - pickupDist / 600);

  const reliabilityScore = (truck.rating - 1) / 4;

  const score     = +(0.4 * priceScore + 0.35 * proximityScore + 0.25 * reliabilityScore).toFixed(3);
  const reasoning = priceScore > 0.7
    ? `Best price in market at ₹${truck.pricePerTon}/ton`
    : proximityScore > 0.7
    ? `Nearest available truck — ${Math.round(pickupDist)} km away`
    : `Reliable driver (★${truck.rating}) on this corridor`;

  return { score, reasoning, vote: score > 0.45 ? 'Accept' : 'Reject', agentId: 'ShipmentAgent' };
}

/**
 * Network Agent — scores from platform/network perspective
 * Prefers: max empty-mile reduction, high-frequency corridors
 */
function networkAgent(truck, shipment) {
  const emptyMileProb  = truck.emptyMileProbability || 0.3;
  const distKm         = shipment.distanceKm || 300;
  const emptyMilesAtRisk = emptyMileProb * distKm;

  // High empty-mile probability trucks are highest priority
  const emptyMileScore = Math.min(1, emptyMilesAtRisk / 300);
  // Reward trucks with heavy load already (collaborative sharing)
  const sharingScore   = Math.min(1, truck.usedCapacity / truck.totalCapacity * 2);

  const score     = +(0.65 * emptyMileScore + 0.35 * sharingScore).toFixed(3);
  const milesReduced = Math.round(emptyMileProb * distKm);
  const reasoning = emptyMilesAtRisk > 150
    ? `Critical — prevents ~${milesReduced} empty km and saves ${(milesReduced / 4.2 * 2.68).toFixed(0)} kg CO₂`
    : truck.usedCapacity > 0
    ? `Collaborative load sharing — truck already partially loaded`
    : `Moderate network optimisation opportunity`;

  return { score, reasoning, vote: score > 0.4 ? 'Accept' : 'Reject', agentId: 'NetworkAgent' };
}

// ─── Negotiation Orchestrator ─────────────────────────────────────────────────

/**
 * Run negotiation between agents for each candidate truck, pick winner
 * @param {Object} shipment
 * @param {Array}  trucks       - pre-scored candidates (with matchScore)
 * @param {Array}  allTrucks    - full list for price comparison
 */
function runNegotiation(shipment, trucks, allTrucks) {
  if (!trucks || trucks.length === 0) {
    return { error: 'No candidate trucks for negotiation' };
  }

  const results = trucks.map(truck => {
    const ta = truckAgent(truck, shipment);
    const sa = shipmentAgent(truck, shipment, allTrucks);
    const na = networkAgent(truck, shipment);

    // Weighted consensus: TruckAgent 35%, ShipmentAgent 35%, NetworkAgent 30%
    const consensusScore = +(0.35 * ta.score + 0.35 * sa.score + 0.30 * na.score).toFixed(3);
    const votes = [ta.vote, sa.vote, na.vote];
    const acceptVotes = votes.filter(v => v === 'Accept').length;
    const decision = acceptVotes >= 2 ? 'Accepted' : 'Rejected';

    return {
      truck,
      consensusScore,
      decision,
      agents: { truckAgent: ta, shipmentAgent: sa, networkAgent: na },
      acceptVotes
    };
  });

  // Sort by consensus score, filter accepted
  const accepted = results.filter(r => r.decision === 'Accepted').sort((a, b) => b.consensusScore - a.consensusScore);
  const winner = accepted[0] || results.sort((a, b) => b.consensusScore - a.consensusScore)[0];

  const negotiationScore = Math.round(winner.consensusScore * 100);

  return {
    selectedTruck:    winner.truck.truckId,
    selectedDriver:   winner.truck.driverName,
    negotiationScore,
    decision:         winner.decision,
    agentReasoning: {
      truckAgent:    winner.agents.truckAgent.reasoning,
      shipmentAgent: winner.agents.shipmentAgent.reasoning,
      networkAgent:  winner.agents.networkAgent.reasoning
    },
    agentVotes: {
      truckAgent:    winner.agents.truckAgent.vote,
      shipmentAgent: winner.agents.shipmentAgent.vote,
      networkAgent:  winner.agents.networkAgent.vote
    },
    allCandidates: results.map(r => ({
      truckId:       r.truck.truckId,
      consensusScore: Math.round(r.consensusScore * 100),
      decision:      r.decision
    }))
  };
}

module.exports = { runNegotiation, truckAgent, shipmentAgent, networkAgent };
