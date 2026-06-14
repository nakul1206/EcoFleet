/**
 * Disaster-Aware Routing — EcoFleet AI
 * Simulates live hazard awareness: floods, closures, congestion
 * In production: replace with Google Maps Incidents API / NDMA feeds
 */

// ─── Static Hazard Database (demo data) ───────────────────────────────────────
const HAZARDS = [
  {
    id: 'HAZ001',
    type: 'flood',
    severity: 'High',
    affectedHighway: 'NH44',
    region: 'Andhra Pradesh',
    activeFrom: new Date('2024-01-15'),
    activeTo: new Date('2099-12-31'), // always active for demo
    description: 'Flooding on NH44 near Nalgonda — impassable',
    delayHours: 4
  },
  {
    id: 'HAZ002',
    type: 'road_closure',
    severity: 'Medium',
    affectedHighway: 'NH48',
    region: 'Karnataka',
    activeFrom: new Date('2024-02-01'),
    activeTo: new Date('2099-12-31'),
    description: 'Road widening project — single-lane traffic NH48 near Tumkur',
    delayHours: 2
  },
  {
    id: 'HAZ003',
    type: 'congestion',
    severity: 'Low',
    affectedHighway: 'NH8',
    region: 'Gujarat',
    activeFrom: new Date('2024-01-01'),
    activeTo: new Date('2099-12-31'),
    description: 'Heavy industrial traffic on NH8 near Surat',
    delayHours: 1.5
  }
];

// ─── Route Atlas ──────────────────────────────────────────────────────────────
// Primary and alternative routes for major Indian corridors
const ROUTE_ATLAS = {
  'Chennai-Bangalore':   { primary: 'NH44', alt: 'NH948 via Krishnagiri', distanceSavingKm: -40 },
  'Mumbai-Pune':         { primary: 'NH48', alt: 'NH65 Expressway',        distanceSavingKm: 10  },
  'Delhi-Jaipur':        { primary: 'NH48', alt: 'NH148B via Rewari',       distanceSavingKm: -15 },
  'Chennai-Hyderabad':   { primary: 'NH44', alt: 'NH65 via Kurnool',        distanceSavingKm: 30  },
  'Kolkata-Bhubaneswar': { primary: 'NH16', alt: 'SH5 coastal route',       distanceSavingKm: 20  },
  'Delhi-Lucknow':       { primary: 'NH27', alt: 'NH9 via Kanpur',          distanceSavingKm: -10 },
  'Mumbai-Ahmedabad':    { primary: 'NH48', alt: 'NH8 old route',           distanceSavingKm: 25  },
  'Bangalore-Hyderabad': { primary: 'NH44', alt: 'NH167 via Kurnool',       distanceSavingKm: -20 }
};

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Check if a route is affected by any active hazard
 */
function checkHazards(origin, destination, preferredHighway) {
  const now = new Date();
  const routeKey = `${origin}-${destination}`;
  const reverseKey = `${destination}-${origin}`;
  const atlas = ROUTE_ATLAS[routeKey] || ROUTE_ATLAS[reverseKey];
  const primaryHighway = preferredHighway || atlas?.primary || 'NH44';

  const activeHazards = HAZARDS.filter(h => {
    const isActive = h.activeFrom <= now && h.activeTo >= now;
    const affectsHighway = h.affectedHighway === primaryHighway;
    return isActive && affectsHighway;
  });

  return { activeHazards, atlas, primaryHighway };
}

/**
 * Compute reroute recommendation
 */
function rerouteShipment({ origin, destination, preferredHighway }) {
  const { activeHazards, atlas, primaryHighway } = checkHazards(origin, destination, preferredHighway);

  if (activeHazards.length === 0) {
    return {
      rerouteRequired: false,
      oldRoute: primaryHighway,
      newRoute: primaryHighway,
      riskLevel: 'None',
      delayReduced: '0 hours',
      reason: 'Primary route is clear — no hazards detected',
      hazards: []
    };
  }

  const worstHazard = activeHazards.sort((a, b) => b.delayHours - a.delayHours)[0];
  const altRoute    = atlas?.alt || `${primaryHighway}-ALT via bypass`;
  const totalDelay  = activeHazards.reduce((s, h) => s + h.delayHours, 0);
  const riskLevel   = worstHazard.severity === 'High' ? 'High' : worstHazard.severity === 'Medium' ? 'Medium' : 'Low';

  return {
    rerouteRequired: true,
    oldRoute: primaryHighway,
    newRoute: altRoute,
    riskLevel,
    delayReduced:     `${totalDelay} hours`,
    distanceChangekm: atlas?.distanceSavingKm || 0,
    reason:           worstHazard.description,
    hazardType:       worstHazard.type,
    hazards:          activeHazards.map(h => ({
      type: h.type, severity: h.severity, highway: h.affectedHighway, description: h.description
    })),
    recommendation:   `Reroute via ${altRoute} to avoid ${worstHazard.type} on ${primaryHighway}`
  };
}

/**
 * Get all active hazards (for dashboard map overlay)
 */
function getAllHazards() {
  const now = new Date();
  return HAZARDS.filter(h => h.activeFrom <= now && h.activeTo >= now).map(h => ({
    id: h.id, type: h.type, severity: h.severity,
    highway: h.affectedHighway, region: h.region, description: h.description
  }));
}

module.exports = { rerouteShipment, getAllHazards, checkHazards };
