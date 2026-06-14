/* ============================================
   FreightX — Main Script
   ============================================ */

// ===== GLOBAL STATE =====
let currentUser = null;
let currentRole = null;
let activeTab = null;
let liveMap = null;
let truckMarkers = [];
let pickupMarker = null;
let dropMarker = null;
let routeLine = null;
let bookings = [];
let notifications = [];
let activityInterval = null;
let truckMoveInterval = null;
let charts = {};

// ===== MOCK TRUCK DATA =====
const DRIVER_NAMES = ['Ravi Kumar', 'Suresh Balan', 'Murugan S', 'Vikram Nair', 'Anil Dubey',
  'Ramesh Patil', 'Deepak Singh', 'Mohan Verma', 'Satish Yadav', 'Kiran Babu',
  'Ajay Mehta', 'Santosh Roy', 'Pradeep Gupta', 'Manoj Tiwari', 'Sanjay Pillai',
  'Arjun Das', 'Rohit Joshi', 'Hemant Sharma', 'Prakash Kumar', 'Dinesh Iyer'];

const CITIES = [
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 }
];

const TRUCK_TYPES = ['Mini Truck (1T)', 'Medium Truck (7T)', 'Heavy Truck (20T)', 'Container (40ft)', 'Refrigerated'];
const TRUCK_EMOJIS = ['🚐', '🚛', '🚚', '🏗️', '❄️'];

function generateTrucks() {
  return DRIVER_NAMES.map((name, i) => {
    const city = CITIES[i % CITIES.length];
    const dest = CITIES[(i + 3) % CITIES.length];
    const typeIdx = i % TRUCK_TYPES.length;
    const caps = [2, 7, 20, 25, 10];
    const cap = caps[typeIdx];
    const avail = +(Math.random() * cap * 0.7 + cap * 0.2).toFixed(1);
    return {
      id: `TN${String(i + 1).padStart(2, '0')}`,
      driverName: name,
      emoji: TRUCK_EMOJIS[typeIdx],
      type: TRUCK_TYPES[typeIdx],
      rating: +(3.8 + Math.random() * 1.2).toFixed(1),
      capacity: cap,
      available: avail,
      currentCity: city.name,
      lat: city.lat + (Math.random() - 0.5) * 0.8,
      lng: city.lng + (Math.random() - 0.5) * 0.8,
      destCity: dest.name,
      destLat: dest.lat,
      destLng: dest.lng,
      price: Math.floor(800 + Math.random() * 2200),
      priceUnit: '/ton',
      experience: Math.floor(3 + Math.random() * 12),
      trips: Math.floor(80 + Math.random() * 400),
      status: Math.random() > 0.3 ? 'available' : 'busy',
      matchScore: 0,
      earnings: Math.floor(200000 + Math.random() * 600000),
      reviews: generateReviews()
    };
  });
}

function generateReviews() {
  const authors = ['Rajesh Exports', 'Mumbai Textiles', 'Delhi Traders', 'BLR Logistics', 'HYD Industries'];
  const texts = [
    'Very professional, delivered on time. Will use again.',
    'Excellent service, cargo handled with care.',
    'Good communication throughout the journey.',
    'Slightly delayed but good overall service.',
    'Outstanding driver, would highly recommend.'
  ];
  return Array.from({ length: 3 }, (_, i) => ({
    author: authors[i],
    text: texts[i],
    stars: Math.floor(4 + Math.random())
  }));
}

let ALL_TRUCKS = generateTrucks();

// ===== LOGIN FLOW =====
function selectRole(role) {
  document.getElementById('roleSelect').classList.add('hidden');
  if (role === 'user') {
    document.getElementById('userForm').classList.remove('hidden');
  } else {
    document.getElementById('driverForm').classList.remove('hidden');
  }
}

function showRoleSelect() {
  document.getElementById('roleSelect').classList.remove('hidden');
  document.getElementById('userForm').classList.add('hidden');
  document.getElementById('driverForm').classList.add('hidden');
}

function loginUser() {
  const name = document.getElementById('userName').value.trim();
  const phone = document.getElementById('userPhone').value.trim();
  const company = document.getElementById('userCompany').value.trim();
  const city = document.getElementById('userCity').value;
  if (!name || !city) { showToast('Please fill in required fields', 'error'); return; }
  currentRole = 'user';
  currentUser = { name, phone, company, gst: document.getElementById('userGST').value, city, cargo: document.getElementById('userCargo').value };
  enterApp();
}

function loginDriver() {
  const name = document.getElementById('driverName').value.trim();
  const license = document.getElementById('driverLicense').value.trim();
  const city = document.getElementById('driverCity').value;
  if (!name || !city) { showToast('Please fill in required fields', 'error'); return; }
  currentRole = 'driver';
  currentUser = {
    name,
    phone: document.getElementById('driverPhone').value,
    license,
    exp: document.getElementById('driverExp').value,
    truckType: document.getElementById('driverTruckType').value,
    reg: document.getElementById('driverReg').value,
    city
  };
  enterApp();
}

function enterApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  setupNav();
  setupNotifications();
  startActivityFeed();
  showToast(`Welcome, ${currentUser.name}! 🎉`, 'success');
}

// ===== NAV SETUP =====
const USER_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'match', label: 'AI Match' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'bookings', label: 'My Bookings' },
  { id: 'map', label: 'Live Map' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'eco', label: 'Eco' }
];

const DRIVER_TABS = [
  { id: 'driver-dash', label: 'Dashboard' },
  { id: 'driver-requests', label: 'Requests' },
  { id: 'driver-earnings', label: 'Earnings' },
  { id: 'driver-map', label: 'Live Map' },
  { id: 'driver-profile', label: 'Profile' }
];

function setupNav() {
  const tabs = currentRole === 'user' ? USER_TABS : DRIVER_TABS;
  const navTabs = document.getElementById('navTabs');
  navTabs.innerHTML = tabs.map(t =>
    `<button class="nav-tab" onclick="switchTab('${t.id}')">${t.label}</button>`
  ).join('');

  // Update user info in nav
  document.getElementById('userBadge').textContent = currentRole === 'user' ? 'Shipper' : 'Driver';
  document.getElementById('navAvatar').textContent = currentUser.name.slice(0, 2).toUpperCase();

  // Build all pages
  buildPages();
  switchTab(tabs[0].id);
}

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.nav-tab').forEach((btn, i) => {
    const tabs = currentRole === 'user' ? USER_TABS : DRIVER_TABS;
    btn.classList.toggle('active', tabs[i]?.id === tabId);
  });
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${tabId}`);
  if (page) page.classList.add('active');

  // Init map when tab becomes active
  if (tabId === 'map' || tabId === 'driver-map') {
    setTimeout(() => initMap(tabId), 100);
  }
  if (tabId === 'analytics') initCharts();
}

// ===== BUILD ALL PAGES =====
function buildPages() {
  const content = document.getElementById('mainContent');
  if (currentRole === 'user') {
    content.innerHTML = `
      ${buildUserDashboard()}
      ${buildAIMatchPage()}
      ${buildMarketplacePage()}
      ${buildBookingsPage()}
      ${buildMapPage('map')}
      ${buildAnalyticsPage()}
      ${buildEcoPage()}
    `;
    renderTrucks();
  } else {
    content.innerHTML = `
      ${buildDriverDashboard()}
      ${buildDriverRequests()}
      ${buildDriverEarnings()}
      ${buildMapPage('driver-map')}
      ${buildDriverProfilePage()}
    `;
    renderDriverRequests();
  }
}

// ===== USER DASHBOARD =====
function buildUserDashboard() {
  return `
  <div class="page" id="page-dashboard">
    <div class="page-header">
      <div>
        <div class="page-title">Welcome, ${currentUser.name} 👋</div>
        <div class="page-sub">${currentUser.company || 'FreightX Shipper'} · ${currentUser.city}</div>
      </div>
      <button class="btn btn-neon" onclick="switchTab('match')">Book a Truck →</button>
    </div>

    <div class="stat-grid mb-3">
      <div class="stat-card">
        <div class="stat-accent" style="background:var(--neon)"></div>
        <div class="stat-label">Total Bookings</div>
        <div class="stat-value" id="totalBookingsStat">0</div>
        <div class="stat-change up" id="bookingChange">↑ 0 this month</div>
      </div>
      <div class="stat-card">
        <div class="stat-accent" style="background:var(--neon2)"></div>
        <div class="stat-label">Active Shipments</div>
        <div class="stat-value text-neon" id="activeShipmentsStat">0</div>
        <div class="stat-change">In transit</div>
      </div>
      <div class="stat-card">
        <div class="stat-accent" style="background:var(--neon4)"></div>
        <div class="stat-label">Total Spent</div>
        <div class="stat-value">₹<span id="totalSpentStat">0</span></div>
        <div class="stat-change up">This month</div>
      </div>
      <div class="stat-card">
        <div class="stat-accent" style="background:var(--neon3)"></div>
        <div class="stat-label">CO₂ Saved</div>
        <div class="stat-value" id="co2Stat">0<span class="stat-unit">kg</span></div>
        <div class="stat-change up">↑ Green impact</div>
      </div>
    </div>

    <div class="grid-2 gap-1 mb-3">
      <div class="card">
        <div class="card-header"><div class="card-title">Recent Activity</div></div>
        <div class="card-body">
          <div class="activity-feed" id="dashActivityFeed">
            <div class="text-muted text-sm" style="padding:0.5rem 0">Loading activity...</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Fleet Overview</div></div>
        <div class="card-body">
          <div class="stat-grid" style="grid-template-columns:1fr 1fr;gap:0.8rem">
            <div class="stat-card" style="padding:0.8rem">
              <div class="stat-label">Available</div>
              <div class="stat-value" style="font-size:1.4rem">${ALL_TRUCKS.filter(t => t.status === 'available').length}</div>
            </div>
            <div class="stat-card" style="padding:0.8rem">
              <div class="stat-label">On Trip</div>
              <div class="stat-value" style="font-size:1.4rem">${ALL_TRUCKS.filter(t => t.status === 'busy').length}</div>
            </div>
            <div class="stat-card" style="padding:0.8rem">
              <div class="stat-label">Avg Rating</div>
              <div class="stat-value" style="font-size:1.4rem;color:var(--neon4)">★ ${(ALL_TRUCKS.reduce((s,t)=>s+t.rating,0)/ALL_TRUCKS.length).toFixed(1)}</div>
            </div>
            <div class="stat-card" style="padding:0.8rem">
              <div class="stat-label">Total Fleet</div>
              <div class="stat-value" style="font-size:1.4rem">${ALL_TRUCKS.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ===== AI MATCH PAGE =====
function buildAIMatchPage() {
  return `
  <div class="page" id="page-match">
    <div class="page-header">
      <div>
        <div class="page-title">AI Truck Matching</div>
        <div class="page-sub">Enter your shipment details to find the best trucks</div>
      </div>
    </div>

    <div class="match-form">
      <div class="form-group">
        <label>Pickup Location</label>
        <select id="matchPickup">
          ${CITIES.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Drop Location</label>
        <select id="matchDrop">
          ${CITIES.map((c,i) => `<option value="${c.name}" ${i===3?'selected':''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Cargo Weight (Tons)</label>
        <input type="number" id="matchWeight" value="5" min="0.5" max="25" step="0.5" />
      </div>
      <button class="btn btn-neon" onclick="runAIMatch()" style="white-space:nowrap">⚡ Find Trucks</button>
    </div>

    <div id="matchResults" class="truck-grid"></div>
  </div>`;
}

// ===== MARKETPLACE =====
function buildMarketplacePage() {
  return `
  <div class="page" id="page-marketplace">
    <div class="page-header">
      <div>
        <div class="page-title">Truck Marketplace</div>
        <div class="page-sub">${ALL_TRUCKS.length} trucks available across India</div>
      </div>
    </div>

    <div class="search-bar">
      <input class="search-input" type="text" id="truckSearch" placeholder="Search drivers, locations, truck types..." oninput="filterTrucks()" />
      <select class="filter-select" id="filterStatus" onchange="filterTrucks()">
        <option value="">All Status</option>
        <option value="available">Available</option>
        <option value="busy">On Trip</option>
      </select>
      <select class="filter-select" id="filterCity" onchange="filterTrucks()">
        <option value="">All Cities</option>
        ${CITIES.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
      </select>
      <select class="filter-select" id="sortBy" onchange="filterTrucks()">
        <option value="rating">Sort: Rating</option>
        <option value="price">Sort: Price ↑</option>
        <option value="capacity">Sort: Capacity</option>
      </select>
    </div>

    <div id="marketplaceTrucks" class="truck-grid"></div>
    <div id="marketplacePagination" class="pagination"></div>
  </div>`;
}

// ===== BOOKINGS =====
function buildBookingsPage() {
  return `
  <div class="page" id="page-bookings">
    <div class="page-header">
      <div class="page-title">My Bookings</div>
    </div>
    <div id="bookingsList">
      <div class="card" style="padding:2rem;text-align:center;color:var(--text2)">
        <p>No bookings yet. <button class="btn btn-neon btn-sm" onclick="switchTab('match')">Book your first truck →</button></p>
      </div>
    </div>
  </div>`;
}

// ===== MAP PAGE =====
function buildMapPage(id) {
  return `
  <div class="page" id="page-${id}">
    <div class="page-header">
      <div class="page-title">Live Map</div>
      <div class="page-sub">Real-time truck locations across India</div>
    </div>
    <div class="grid-2 gap-1 mb-2">
      <div style="grid-column:1/-1">
        <div id="liveMap" style="height:460px;border-radius:12px;border:1px solid var(--border)"></div>
      </div>
    </div>
    <div class="card mt-1">
      <div class="card-header"><div class="card-title">Map Legend</div></div>
      <div class="card-body flex gap-md" style="flex-wrap:wrap">
        <span class="text-sm flex items-center gap-sm"><span style="width:12px;height:12px;border-radius:50%;background:#00ff88;display:inline-block"></span> Available Truck</span>
        <span class="text-sm flex items-center gap-sm"><span style="width:12px;height:12px;border-radius:50%;background:#ff3355;display:inline-block"></span> On Trip</span>
        <span class="text-sm flex items-center gap-sm"><span style="width:12px;height:12px;border-radius:50%;background:#00ccff;display:inline-block"></span> Pickup Point</span>
        <span class="text-sm flex items-center gap-sm"><span style="width:12px;height:12px;border-radius:50%;background:#ffcc00;display:inline-block"></span> Drop Point</span>
      </div>
    </div>
  </div>`;
}

// ===== ANALYTICS =====
function buildAnalyticsPage() {
  return `
  <div class="page" id="page-analytics">
    <div class="page-header">
      <div class="page-title">Analytics</div>
      <div class="page-sub">Platform performance overview</div>
    </div>
    <div class="stat-grid mb-3">
      <div class="stat-card"><div class="stat-accent" style="background:var(--neon)"></div><div class="stat-label">Revenue (Month)</div><div class="stat-value">₹<span>4.2L</span></div></div>
      <div class="stat-card"><div class="stat-accent" style="background:var(--neon2)"></div><div class="stat-label">Fleet Utilization</div><div class="stat-value">72<span class="stat-unit">%</span></div></div>
      <div class="stat-card"><div class="stat-accent" style="background:var(--neon4)"></div><div class="stat-label">Bookings (Month)</div><div class="stat-value">148</div></div>
      <div class="stat-card"><div class="stat-accent" style="background:var(--neon3)"></div><div class="stat-label">Avg Driver Rating</div><div class="stat-value" style="color:var(--neon4)">★ 4.4</div></div>
    </div>
    <div class="grid-2 gap-1">
      <div class="card">
        <div class="card-header"><div class="card-title">Revenue Trend (6 Months)</div></div>
        <div class="card-body"><div class="chart-container"><canvas id="revenueChart" role="img" aria-label="Revenue trend over 6 months">Revenue chart</canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Fleet Utilization</div></div>
        <div class="card-body"><div class="chart-container"><canvas id="utilizationChart" role="img" aria-label="Fleet utilization by truck type">Utilization chart</canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Booking Growth</div></div>
        <div class="card-body"><div class="chart-container"><canvas id="growthChart" role="img" aria-label="Booking growth week over week">Growth chart</canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Driver Rating Distribution</div></div>
        <div class="card-body"><div class="chart-container"><canvas id="ratingChart" role="img" aria-label="Driver rating distribution">Rating chart</canvas></div></div>
      </div>
    </div>
  </div>`;
}

// ===== ECO PAGE =====
function buildEcoPage() {
  return `
  <div class="page" id="page-eco">
    <div class="page-header">
      <div class="page-title">Sustainability Dashboard</div>
      <div class="page-sub">Your environmental impact through FreightX</div>
    </div>
    <div class="eco-grid mb-3">
      <div class="eco-card">
        <div class="eco-icon">⛽</div>
        <div class="eco-val" id="ecoFuel">0<span style="font-size:0.9rem">L</span></div>
        <div class="eco-lbl">Fuel Saved</div>
      </div>
      <div class="eco-card">
        <div class="eco-icon">🌿</div>
        <div class="eco-val" id="ecoCO2">0<span style="font-size:0.9rem">kg</span></div>
        <div class="eco-lbl">CO₂ Reduced</div>
      </div>
      <div class="eco-card">
        <div class="eco-icon">📍</div>
        <div class="eco-val" id="ecoMiles">0<span style="font-size:0.9rem">km</span></div>
        <div class="eco-lbl">Empty Miles Reduced</div>
      </div>
      <div class="eco-card">
        <div class="eco-icon">🌳</div>
        <div class="eco-val" id="ecoTrees">0</div>
        <div class="eco-lbl">Trees Equivalent</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">CO₂ Reduction Trend</div></div>
      <div class="card-body"><div class="chart-container"><canvas id="co2Chart" role="img" aria-label="CO2 reduction over time">CO2 chart</canvas></div></div>
    </div>
  </div>`;
}

// ===== DRIVER DASHBOARD =====
function buildDriverDashboard() {
  const truck = ALL_TRUCKS.find(t => t.currentCity === currentUser.city) || ALL_TRUCKS[0];
  return `
  <div class="page" id="page-driver-dash">
    <div class="page-header">
      <div>
        <div class="page-title">Driver Dashboard</div>
        <div class="page-sub">Welcome, ${currentUser.name} · ${currentUser.truckType || 'Driver'}</div>
      </div>
      <div class="badge badge-green">● Online</div>
    </div>

    <div class="stat-grid mb-3">
      <div class="stat-card">
        <div class="stat-accent" style="background:var(--neon)"></div>
        <div class="stat-label">Today's Earnings</div>
        <div class="stat-value">₹<span id="driverTodayEarn">0</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-accent" style="background:var(--neon2)"></div>
        <div class="stat-label">Pending Requests</div>
        <div class="stat-value" id="pendingReqs">3</div>
      </div>
      <div class="stat-card">
        <div class="stat-accent" style="background:var(--neon4)"></div>
        <div class="stat-label">Completed Trips</div>
        <div class="stat-value" id="driverTrips">${truck.trips}</div>
      </div>
      <div class="stat-card">
        <div class="stat-accent" style="background:var(--neon3)"></div>
        <div class="stat-label">Rating</div>
        <div class="stat-value" style="color:var(--neon4)">★ ${truck.rating}</div>
      </div>
    </div>

    <div class="grid-2 gap-1">
      <div class="card">
        <div class="card-header"><div class="card-title">Capacity Status</div></div>
        <div class="card-body">
          <div class="text-sm text-muted mb-1">${truck.type}</div>
          <div class="flex justify-between mb-1">
            <span class="text-sm">Used: ${(truck.capacity - truck.available).toFixed(1)}T</span>
            <span class="text-sm text-neon">Available: ${truck.available}T</span>
          </div>
          <div class="score-bar-track" style="height:8px;border-radius:4px">
            <div class="score-bar-fill" style="width:${((truck.capacity - truck.available)/truck.capacity*100).toFixed(0)}%;background:var(--neon);height:100%;border-radius:4px"></div>
          </div>
          <div class="text-xs text-muted mt-1">${truck.capacity}T total capacity</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Current Route</div></div>
        <div class="card-body">
          <div style="font-size:1rem;font-weight:700;color:var(--white)">${truck.currentCity} → ${truck.destCity}</div>
          <div class="text-sm text-muted mt-1">Est. 6–8 hours</div>
          <div class="badge badge-green mt-2">On Route</div>
        </div>
      </div>
    </div>
    <div class="card mt-2">
      <div class="card-header"><div class="card-title">Live Activity</div></div>
      <div class="card-body"><div class="activity-feed" id="driverActivityFeed"></div></div>
    </div>
  </div>`;
}

// ===== DRIVER REQUESTS =====
function buildDriverRequests() {
  return `
  <div class="page" id="page-driver-requests">
    <div class="page-header">
      <div class="page-title">Shipment Requests</div>
      <div class="page-sub">Accept, reject or negotiate</div>
    </div>
    <div id="requestsList"></div>
  </div>`;
}

function renderDriverRequests() {
  const requests = [
    { from: 'Chennai', to: 'Bangalore', weight: '8T', cargo: 'Electronics', price: 12000, distance: 346, client: 'Tech Exports Pvt Ltd' },
    { from: 'Mumbai', to: 'Pune', weight: '5T', cargo: 'FMCG', price: 6500, distance: 149, client: 'RetailCo India' },
    { from: 'Delhi', to: 'Jaipur', weight: '12T', cargo: 'Machinery', price: 18000, distance: 282, client: 'Industrial Hub' }
  ];
  const el = document.getElementById('requestsList');
  if (!el) return;
  el.innerHTML = requests.map((r, i) => `
    <div class="request-card" id="req-${i}">
      <div class="route">${r.from} → ${r.to}</div>
      <div class="details">
        <span>📦 ${r.weight}</span>
        <span>📍 ${r.distance} km</span>
        <span>🏢 ${r.client}</span>
        <span>📋 ${r.cargo}</span>
      </div>
      <div class="flex justify-between items-center">
        <div class="truck-price">₹${r.price.toLocaleString()}</div>
        <div class="actions">
          <button class="btn btn-neon btn-sm" onclick="acceptRequest(${i}, ${r.price})">Accept</button>
          <button class="btn btn-outline btn-sm" onclick="negotiateRequest(${i}, ${r.price})">Negotiate</button>
          <button class="btn btn-danger btn-sm" onclick="rejectRequest(${i})">Reject</button>
        </div>
      </div>
    </div>
  `).join('');
}

function acceptRequest(i, price) {
  document.getElementById(`req-${i}`).style.borderColor = 'var(--neon)';
  document.getElementById(`req-${i}`).innerHTML += `<div class="badge badge-green mt-2" style="margin-top:0.5rem">✓ Accepted — ₹${price.toLocaleString()}</div>`;
  document.getElementById(`req-${i}`).querySelector('.actions').innerHTML = '';
  document.getElementById('pendingReqs').textContent = Math.max(0, parseInt(document.getElementById('pendingReqs').textContent) - 1);
  document.getElementById('driverTodayEarn').textContent = (parseInt(document.getElementById('driverTodayEarn').textContent.replace(',','')) + price).toLocaleString();
  addNotification('Shipment accepted!', `₹${price.toLocaleString()} earning confirmed`);
  showToast(`Shipment accepted! ₹${price.toLocaleString()} added`, 'success');
}

function negotiateRequest(i, price) {
  const newPrice = Math.floor(price * 1.1);
  document.getElementById(`req-${i}`).querySelector('.truck-price').textContent = `₹${newPrice.toLocaleString()} (Counter)`;
  showToast(`Counter offer sent: ₹${newPrice.toLocaleString()}`, 'success');
}

function rejectRequest(i) {
  document.getElementById(`req-${i}`).style.opacity = '0.4';
  document.getElementById(`req-${i}`).querySelector('.actions').innerHTML = '<span class="badge badge-red">Rejected</span>';
  document.getElementById('pendingReqs').textContent = Math.max(0, parseInt(document.getElementById('pendingReqs').textContent) - 1);
  showToast('Request rejected', 'error');
}

// ===== DRIVER EARNINGS =====
function buildDriverEarnings() {
  return `
  <div class="page" id="page-driver-earnings">
    <div class="page-header">
      <div class="page-title">Earnings</div>
    </div>
    <div class="stat-grid mb-3">
      <div class="stat-card"><div class="stat-accent" style="background:var(--neon)"></div><div class="stat-label">This Month</div><div class="stat-value">₹48,200</div></div>
      <div class="stat-card"><div class="stat-accent" style="background:var(--neon2)"></div><div class="stat-label">Total Trips</div><div class="stat-value">214</div></div>
      <div class="stat-card"><div class="stat-accent" style="background:var(--neon4)"></div><div class="stat-label">Avg Per Trip</div><div class="stat-value">₹2,250</div></div>
      <div class="stat-card"><div class="stat-accent" style="background:var(--neon3)"></div><div class="stat-label">Pending Payout</div><div class="stat-value">₹8,400</div></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Monthly Earnings</div></div>
      <div class="card-body"><div class="chart-container"><canvas id="driverEarnChart" role="img" aria-label="Driver monthly earnings">Earnings chart</canvas></div></div>
    </div>
  </div>`;
}

// ===== DRIVER PROFILE PAGE =====
function buildDriverProfilePage() {
  return `
  <div class="page" id="page-driver-profile">
    <div class="page-header"><div class="page-title">My Profile</div></div>
    <div class="card">
      <div class="card-body">
        <div class="profile-top">
          <div class="profile-avatar">${currentUser.name.charAt(0)}</div>
          <div>
            <div class="profile-name">${currentUser.name}</div>
            <div class="profile-sub">${currentUser.truckType || 'Driver'} · ${currentUser.city}</div>
            <div class="profile-sub">License: ${currentUser.license || 'N/A'}</div>
            <div class="profile-sub">Reg: ${currentUser.reg || 'N/A'}</div>
            <div class="profile-trust" style="color:var(--neon)">● Trust Score: 94%</div>
          </div>
        </div>
        <div class="profile-stats">
          <div class="profile-stat"><div class="profile-stat-val">${currentUser.exp || 5}</div><div class="profile-stat-lbl">Years Exp</div></div>
          <div class="profile-stat"><div class="profile-stat-val">214</div><div class="profile-stat-lbl">Total Trips</div></div>
          <div class="profile-stat"><div class="profile-stat-val">★ 4.7</div><div class="profile-stat-lbl">Rating</div></div>
        </div>
      </div>
    </div>
  </div>`;
}

// ===== TRUCK RENDERING =====
let currentPage = 1;
const TRUCKS_PER_PAGE = 8;
let filteredTrucks = [...ALL_TRUCKS];

function renderTrucks() {
  filteredTrucks = [...ALL_TRUCKS];
  renderMarketplace();
}

function filterTrucks() {
  const q = (document.getElementById('truckSearch')?.value || '').toLowerCase();
  const status = document.getElementById('filterStatus')?.value || '';
  const city = document.getElementById('filterCity')?.value || '';
  const sort = document.getElementById('sortBy')?.value || 'rating';

  filteredTrucks = ALL_TRUCKS.filter(t => {
    const matchQ = !q || t.driverName.toLowerCase().includes(q) || t.currentCity.toLowerCase().includes(q) || t.type.toLowerCase().includes(q);
    const matchStatus = !status || t.status === status;
    const matchCity = !city || t.currentCity === city;
    return matchQ && matchStatus && matchCity;
  });

  if (sort === 'rating') filteredTrucks.sort((a, b) => b.rating - a.rating);
  if (sort === 'price') filteredTrucks.sort((a, b) => a.price - b.price);
  if (sort === 'capacity') filteredTrucks.sort((a, b) => b.capacity - a.capacity);

  currentPage = 1;
  renderMarketplace();
}

function renderMarketplace() {
  const container = document.getElementById('marketplaceTrucks');
  const pagination = document.getElementById('marketplacePagination');
  if (!container) return;
  const start = (currentPage - 1) * TRUCKS_PER_PAGE;
  const page = filteredTrucks.slice(start, start + TRUCKS_PER_PAGE);

  container.innerHTML = page.map(t => truckCardHTML(t)).join('');
  renderPagination(Math.ceil(filteredTrucks.length / TRUCKS_PER_PAGE), pagination);
}

function renderPagination(total, el) {
  if (!el) return;
  el.innerHTML = Array.from({ length: total }, (_, i) =>
    `<button class="page-btn ${i+1 === currentPage ? 'active' : ''}" onclick="gotoPage(${i+1})">${i+1}</button>`
  ).join('');
}

function gotoPage(p) {
  currentPage = p;
  renderMarketplace();
  document.getElementById('page-marketplace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function truckCardHTML(t, showScore = false) {
  const scoreClass = t.matchScore >= 80 ? 'high' : t.matchScore >= 60 ? 'medium' : 'low';
  return `
  <div class="truck-card" onclick="openProfile('${t.id}')">
    ${showScore && t.matchScore ? `<div class="match-score ${scoreClass}">⚡ ${t.matchScore}%</div>` : ''}
    <div class="truck-card-header">
      <div class="truck-avatar">${t.emoji}</div>
      <div>
        <div class="truck-driver-name">${t.driverName}</div>
        <div class="truck-id">${t.id} · ${t.type}</div>
        <div class="truck-rating">★ ${t.rating} <span class="text-muted">(${t.trips} trips)</span></div>
      </div>
    </div>
    <div class="truck-info">
      <div class="truck-info-item"><div class="truck-info-label">Capacity</div><div class="truck-info-val">${t.capacity}T</div></div>
      <div class="truck-info-item"><div class="truck-info-label">Available</div><div class="truck-info-val">${t.available}T</div></div>
      <div class="truck-info-item"><div class="truck-info-label">Location</div><div class="truck-info-val">${t.currentCity}</div></div>
      <div class="truck-info-item"><div class="truck-info-label">Experience</div><div class="truck-info-val">${t.experience} yrs</div></div>
    </div>
    <div class="truck-route">📍 ${t.currentCity} → ${t.destCity}</div>
    <div class="truck-footer">
      <div><div class="truck-price">₹${t.price.toLocaleString()}</div><div class="truck-price-unit">${t.priceUnit}</div></div>
      <div class="flex gap-sm">
        <span class="badge ${t.status === 'available' ? 'badge-green' : 'badge-red'}">${t.status === 'available' ? 'Available' : 'On Trip'}</span>
        <button class="btn btn-neon btn-sm" onclick="event.stopPropagation();openBooking('${t.id}')">Book</button>
      </div>
    </div>
  </div>`;
}

// ===== AI MATCHING =====
function runAIMatch() {
  const pickup = document.getElementById('matchPickup').value;
  const drop = document.getElementById('matchDrop').value;
  const weight = parseFloat(document.getElementById('matchWeight').value) || 5;

  if (pickup === drop) { showToast('Pickup and drop cannot be same!', 'error'); return; }

  const pickupCity = CITIES.find(c => c.name === pickup);
  const dropCity = CITIES.find(c => c.name === drop);

  const scored = ALL_TRUCKS.filter(t => t.status === 'available').map(t => {
    const capFit = Math.min(100, (t.available / weight) * 30);
    const distScore = t.currentCity === pickup ? 25 : 15;
    const routeSim = t.destCity === drop ? 20 : 10;
    const ratingScore = (t.rating / 5) * 15;
    const random = Math.random() * 10;
    const score = Math.round(Math.min(100, capFit + distScore + routeSim + ratingScore + random));
    return { ...t, matchScore: score };
  }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 8);

  const container = document.getElementById('matchResults');
  container.innerHTML = scored.map(t => truckCardHTML(t, true)).join('');

  // Update map if it's open
  if (pickupCity && dropCity && liveMap) {
    drawRoute(pickupCity, dropCity);
  }

  showToast(`Found ${scored.length} matched trucks!`, 'success');
  addNotification('AI Match Complete', `${scored.length} trucks found for ${pickup} → ${drop}`);
}

// ===== LIVE MAP =====
function initMap(tabId) {
  if (liveMap) {
    liveMap.invalidateSize();
    return;
  }
  const mapEl = document.getElementById('liveMap');
  if (!mapEl) return;

  // Create map centered on India
  liveMap = L.map('liveMap', {
    center: [20.5937, 78.9629],
    zoom: 5,
    zoomControl: true,
    attributionControl: false
  });

  // Dark tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(liveMap);

  // Add trucks
  ALL_TRUCKS.forEach(t => addTruckMarker(t));

  // Start live movement simulation
  if (truckMoveInterval) clearInterval(truckMoveInterval);
  truckMoveInterval = setInterval(moveTrucks, 3000);

  liveMap.invalidateSize();
}

function makeTruckIcon(t) {
  const color = t.status === 'available' ? '#00ff88' : '#ff3355';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      border:2px solid #000;
      width:28px;height:28px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;
      box-shadow:0 0 8px ${color}80;
      cursor:pointer;
    ">${t.emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function addTruckMarker(t) {
  if (!liveMap) return;
  const marker = L.marker([t.lat, t.lng], { icon: makeTruckIcon(t) })
    .addTo(liveMap)
    .bindPopup(`
      <strong>${t.driverName}</strong><br>
      ${t.id} · ${t.type}<br>
      ★ ${t.rating} · ${t.available}T available<br>
      ${t.currentCity} → ${t.destCity}<br>
      <strong style="color:#00ff88">₹${t.price.toLocaleString()}/ton</strong>
    `);
  truckMarkers.push({ id: t.id, marker, truck: t });
}

function moveTrucks() {
  if (!liveMap) return;
  truckMarkers.forEach(({ marker, truck }) => {
    const dLat = (Math.random() - 0.5) * 0.05;
    const dLng = (Math.random() - 0.5) * 0.05;
    truck.lat += dLat;
    truck.lng += dLng;
    marker.setLatLng([truck.lat, truck.lng]);
  });
}

function drawRoute(from, to) {
  if (!liveMap) return;

  if (pickupMarker) liveMap.removeLayer(pickupMarker);
  if (dropMarker) liveMap.removeLayer(dropMarker);
  if (routeLine) liveMap.removeLayer(routeLine);

  pickupMarker = L.circleMarker([from.lat, from.lng], {
    radius: 10, color: '#00ccff', fillColor: '#00ccff', fillOpacity: 0.9, weight: 2
  }).addTo(liveMap).bindPopup(`📍 Pickup: ${from.name}`);

  dropMarker = L.circleMarker([to.lat, to.lng], {
    radius: 10, color: '#ffcc00', fillColor: '#ffcc00', fillOpacity: 0.9, weight: 2
  }).addTo(liveMap).bindPopup(`🏁 Drop: ${to.name}`);

  routeLine = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
    color: '#00ff88', weight: 2, opacity: 0.7, dashArray: '8,6'
  }).addTo(liveMap);

  liveMap.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
}

// ===== BOOKING SYSTEM =====
function openBooking(truckId) {
  const truck = ALL_TRUCKS.find(t => t.id === truckId);
  if (!truck) return;

  const bookingId = 'FX' + Date.now().toString().slice(-6);
  const otp = Math.floor(100000 + Math.random() * 900000);
  const now = new Date();
  const eta = new Date(now.getTime() + (3 + Math.random() * 5) * 3600000);

  const booking = { id: bookingId, otp, truck, eta, status: 'confirmed', created: now };
  bookings.push(booking);

  const timelineItems = [
    { label: 'Booking Created', done: true },
    { label: 'Driver Assigned', done: true },
    { label: 'Pickup Started', done: false },
    { label: 'Goods Loaded', done: false },
    { label: 'In Transit', done: false },
    { label: 'Delivered', done: false }
  ];

  document.getElementById('bookingContent').innerHTML = `
    <div class="booking-modal">
      <div class="booking-header">
        <div class="badge badge-green mb-1">✓ Booking Confirmed</div>
        <div class="booking-id">${bookingId}</div>
        <div class="otp-label mt-1">Driver OTP</div>
        <div class="booking-otp">${otp}</div>
      </div>

      <div class="booking-row"><span class="booking-key">Driver</span><span class="booking-val">${truck.driverName}</span></div>
      <div class="booking-row"><span class="booking-key">Truck</span><span class="booking-val">${truck.id} · ${truck.type}</span></div>
      <div class="booking-row"><span class="booking-key">Route</span><span class="booking-val">${truck.currentCity} → ${truck.destCity}</span></div>
      <div class="booking-row"><span class="booking-key">ETA</span><span class="booking-val">${eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>

      <div class="price-breakdown mb-2 mt-2">
        <div class="price-row"><span>Base Fare</span><span>₹${truck.price.toLocaleString()}</span></div>
        <div class="price-row"><span>Fuel Surcharge (8%)</span><span>₹${Math.round(truck.price * 0.08).toLocaleString()}</span></div>
        <div class="price-row"><span>Platform Fee (2%)</span><span>₹${Math.round(truck.price * 0.02).toLocaleString()}</span></div>
        <div class="price-row"><span>Total</span><span>₹${Math.round(truck.price * 1.1).toLocaleString()}</span></div>
      </div>

      <div style="font-size:0.8rem;font-weight:600;color:var(--text2);margin-bottom:0.6rem">Shipment Timeline</div>
      <div class="timeline">
        ${timelineItems.map((s, i) => `
          <div class="timeline-step ${s.done ? 'done' : i === 2 ? 'active' : ''}">
            <div class="timeline-title">${s.label}</div>
            <div class="timeline-time">${s.done ? now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</div>
          </div>
        `).join('')}
      </div>

      <div class="flex gap-sm mt-2">
        <button class="btn btn-neon w-full" onclick="closeModal('bookingModal');switchTab('bookings');updateBookingsList()">View Bookings</button>
        <button class="btn btn-outline w-full" onclick="closeModal('bookingModal')">Close</button>
      </div>
    </div>`;

  document.getElementById('bookingModal').classList.remove('hidden');
  addNotification('Booking Confirmed!', `${bookingId} · Driver ${truck.driverName}`);
  showToast(`Booking ${bookingId} confirmed!`, 'success');
  updateDashboardStats();

  // Animate timeline
  setTimeout(() => animateTimeline(), 800);
}

function animateTimeline() {
  const steps = document.querySelectorAll('.timeline-step:not(.done)');
  steps.forEach((s, i) => {
    setTimeout(() => s.classList.add('active'), i * 1200);
  });
}

function updateBookingsList() {
  const el = document.getElementById('bookingsList');
  if (!el || bookings.length === 0) return;
  el.innerHTML = bookings.map(b => `
    <div class="card mb-2">
      <div class="card-body">
        <div class="flex justify-between items-center mb-1">
          <div><span class="font-bold">${b.id}</span> <span class="badge badge-green ml-1">Confirmed</span></div>
          <div class="text-sm text-muted">${b.created.toLocaleDateString()}</div>
        </div>
        <div class="flex gap-md text-sm text-muted">
          <span>🚛 ${b.truck.driverName}</span>
          <span>📍 ${b.truck.currentCity} → ${b.truck.destCity}</span>
          <span>⏱ ETA ${b.eta.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function updateDashboardStats() {
  const el = document.getElementById('totalBookingsStat');
  if (el) el.textContent = bookings.length;
  const active = document.getElementById('activeShipmentsStat');
  if (active) active.textContent = Math.ceil(bookings.length * 0.4);
  const spent = document.getElementById('totalSpentStat');
  if (spent) spent.textContent = bookings.reduce((s, b) => s + Math.round(b.truck.price * 1.1), 0).toLocaleString();
  const co2 = document.getElementById('co2Stat');
  if (co2) co2.innerHTML = `${bookings.length * 12}<span class="stat-unit">kg</span>`;

  // Update eco page
  const n = bookings.length;
  if (document.getElementById('ecoFuel')) document.getElementById('ecoFuel').innerHTML = `${n * 45}<span style="font-size:0.9rem">L</span>`;
  if (document.getElementById('ecoCO2')) document.getElementById('ecoCO2').innerHTML = `${n * 12}<span style="font-size:0.9rem">kg</span>`;
  if (document.getElementById('ecoMiles')) document.getElementById('ecoMiles').innerHTML = `${n * 80}<span style="font-size:0.9rem">km</span>`;
  if (document.getElementById('ecoTrees')) document.getElementById('ecoTrees').textContent = Math.ceil(n * 0.6);
}

// ===== DRIVER PROFILE MODAL =====
function openProfile(truckId) {
  const t = ALL_TRUCKS.find(x => x.id === truckId);
  if (!t) return;

  document.getElementById('profileContent').innerHTML = `
    <div class="profile-modal">
      <div class="flex justify-between items-center mb-2">
        <div class="card-title">Driver Profile</div>
        <button class="btn btn-outline btn-sm" onclick="closeModal('profileModal')">✕</button>
      </div>
      <div class="profile-top">
        <div class="profile-avatar">${t.emoji}</div>
        <div>
          <div class="profile-name">${t.driverName}</div>
          <div class="profile-sub">${t.id} · ${t.type}</div>
          <div class="profile-sub">Based in ${t.currentCity}</div>
          <div class="profile-trust">● Trust Score: ${Math.floor(88 + Math.random() * 10)}%</div>
        </div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat"><div class="profile-stat-val">${t.experience}</div><div class="profile-stat-lbl">Years Exp</div></div>
        <div class="profile-stat"><div class="profile-stat-val">${t.trips}</div><div class="profile-stat-lbl">Total Trips</div></div>
        <div class="profile-stat"><div class="profile-stat-val">★ ${t.rating}</div><div class="profile-stat-lbl">Rating</div></div>
      </div>
      <div class="truck-info mb-2">
        <div class="truck-info-item"><div class="truck-info-label">Capacity</div><div class="truck-info-val">${t.capacity}T</div></div>
        <div class="truck-info-item"><div class="truck-info-label">Available</div><div class="truck-info-val">${t.available}T</div></div>
        <div class="truck-info-item"><div class="truck-info-label">Status</div><div class="truck-info-val"><span class="badge ${t.status === 'available' ? 'badge-green' : 'badge-red'}">${t.status}</span></div></div>
        <div class="truck-info-item"><div class="truck-info-label">Total Earned</div><div class="truck-info-val">₹${(t.earnings/100000).toFixed(1)}L</div></div>
      </div>
      <div class="font-bold text-sm mb-1">Reviews</div>
      ${t.reviews.map(r => `
        <div class="review-item">
          <div class="review-author">${r.author}</div>
          <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
          <div class="review-text">${r.text}</div>
        </div>
      `).join('')}
      <button class="btn btn-neon w-full mt-2" onclick="closeModal('profileModal');openBooking('${t.id}')">Book This Truck</button>
    </div>`;

  document.getElementById('profileModal').classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ===== NOTIFICATIONS =====
function setupNotifications() {
  notifications = [
    { id: 1, text: 'Welcome to FreightX! Start matching trucks now.', time: 'Just now', read: false },
    { id: 2, text: 'AI found 5 trucks near your location.', time: '2 min ago', read: false },
    { id: 3, text: 'Platform maintenance: 2 AM – 4 AM tonight.', time: '1 hr ago', read: true }
  ];
  renderNotifications();
}

function addNotification(title, body) {
  notifications.unshift({ id: Date.now(), text: `${title}: ${body}`, time: 'Just now', read: false });
  renderNotifications();
}

function renderNotifications() {
  const list = document.getElementById('notifList');
  const badge = document.getElementById('notifCount');
  if (!list) return;

  const unread = notifications.filter(n => !n.read).length;
  badge.textContent = unread;
  badge.style.display = unread > 0 ? 'flex' : 'none';

  list.innerHTML = notifications.slice(0, 8).map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="readNotification(${n.id})">
      <div class="notif-dot" style="background:${n.read ? 'var(--text3)' : 'var(--neon)'}"></div>
      <div>
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>
  `).join('');
}

function readNotification(id) {
  const n = notifications.find(x => x.id === id);
  if (n) n.read = true;
  renderNotifications();
}

function toggleNotifications() {
  document.getElementById('notifPanel').classList.toggle('hidden');
}

function clearNotifications() {
  notifications.forEach(n => n.read = true);
  renderNotifications();
  document.getElementById('notifPanel').classList.add('hidden');
}

// Close notif panel on outside click
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notifPanel');
  const btn = document.getElementById('notifBtn');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.add('hidden');
  }
  // Close modals on overlay click
  ['bookingModal', 'profileModal'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal && e.target === modal) closeModal(id);
  });
});

// ===== ACTIVITY FEED =====
const ACTIVITIES = [
  ['🚛', 'Ravi Kumar accepted shipment Chennai → Bangalore', 'var(--neon)'],
  ['📦', 'New shipment posted: Mumbai → Pune 8T Electronics', 'var(--neon2)'],
  ['✅', 'Delivery completed: Delhi → Jaipur by Arjun Das', 'var(--neon)'],
  ['📍', 'Truck TN07 moved 5 km near Coimbatore', 'var(--neon4)'],
  ['⚡', 'AI matched 3 trucks for Hyderabad → Chennai', 'var(--neon3)'],
  ['🔔', 'New driver registered: Manoj Tiwari (Delhi)', 'var(--text2)'],
  ['💰', 'Payment confirmed: ₹24,500 for booking FX4892', 'var(--neon)'],
  ['🚚', 'Mohan Verma started pickup in Kolkata', 'var(--neon2)'],
];

let actIdx = 0;
function startActivityFeed() {
  updateActivityFeed();
  if (activityInterval) clearInterval(activityInterval);
  activityInterval = setInterval(() => {
    updateActivityFeed();
    if (currentRole === 'driver') updateDriverActivityFeed();
  }, 4000);
}

function updateActivityFeed() {
  const feed = document.getElementById('dashActivityFeed');
  if (!feed) return;
  const act = ACTIVITIES[actIdx % ACTIVITIES.length];
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.innerHTML = `
    <div class="activity-dot" style="background:${act[2]}"></div>
    <div>
      <div class="activity-text">${act[0]} ${act[1]}</div>
      <div class="activity-time">Just now</div>
    </div>`;
  feed.insertBefore(item, feed.firstChild);
  if (feed.children.length > 8) feed.removeChild(feed.lastChild);
  actIdx++;
}

function updateDriverActivityFeed() {
  const feed = document.getElementById('driverActivityFeed');
  if (!feed) return;
  const act = ACTIVITIES[actIdx % ACTIVITIES.length];
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.innerHTML = `<div class="activity-dot" style="background:${act[2]}"></div><div><div class="activity-text">${act[0]} ${act[1]}</div><div class="activity-time">Just now</div></div>`;
  feed.insertBefore(item, feed.firstChild);
  if (feed.children.length > 6) feed.removeChild(feed.lastChild);
}

// ===== ANALYTICS CHARTS =====
function initCharts() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

  if (!charts.revenue && document.getElementById('revenueChart')) {
    charts.revenue = new Chart(document.getElementById('revenueChart'), {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue (₹L)',
          data: [2.1, 2.8, 3.3, 3.1, 3.9, 4.2],
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0,255,136,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00ff88',
          pointRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#999' }, grid: { color: '#2a2a2a' } }, y: { ticks: { color: '#999' }, grid: { color: '#2a2a2a' } } } }
    });
  }

  if (!charts.util && document.getElementById('utilizationChart')) {
    charts.util = new Chart(document.getElementById('utilizationChart'), {
      type: 'doughnut',
      data: {
        labels: ['Mini', 'Medium', 'Heavy', 'Container', 'Refrigerated'],
        datasets: [{ data: [22, 35, 28, 8, 7], backgroundColor: ['#00ff88', '#00ccff', '#ffcc00', '#ff00cc', '#ff3355'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#999', boxWidth: 12, padding: 8 } } } }
    });
  }

  if (!charts.growth && document.getElementById('growthChart')) {
    charts.growth = new Chart(document.getElementById('growthChart'), {
      type: 'bar',
      data: {
        labels: weeks,
        datasets: [{ label: 'Bookings', data: [12, 19, 15, 24, 22, 31, 28, 35], backgroundColor: 'rgba(0,204,255,0.7)', borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#999' }, grid: { color: '#2a2a2a' } }, y: { ticks: { color: '#999' }, grid: { color: '#2a2a2a' } } } }
    });
  }

  if (!charts.rating && document.getElementById('ratingChart')) {
    const bins = [0, 0, 0, 0, 0];
    ALL_TRUCKS.forEach(t => {
      const i = Math.floor(t.rating) - 1;
      if (i >= 0 && i < 5) bins[i]++;
    });
    charts.rating = new Chart(document.getElementById('ratingChart'), {
      type: 'bar',
      data: {
        labels: ['1★', '2★', '3★', '4★', '5★'],
        datasets: [{ label: 'Drivers', data: bins, backgroundColor: ['#ff3355','#ff6633','#ffcc00','#00ccff','#00ff88'], borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#999' }, grid: { color: '#2a2a2a' } }, y: { ticks: { color: '#999' }, grid: { color: '#2a2a2a' } } } }
    });
  }

  if (!charts.co2 && document.getElementById('co2Chart')) {
    charts.co2 = new Chart(document.getElementById('co2Chart'), {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'CO₂ Saved (kg)',
          data: [120, 180, 240, 310, 380, 460],
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0,255,136,0.06)',
          fill: true, tension: 0.4,
          pointBackgroundColor: '#00ff88', pointRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#999' }, grid: { color: '#2a2a2a' } }, y: { ticks: { color: '#999' }, grid: { color: '#2a2a2a' } } } }
    });
  }

  if (!charts.driverEarn && document.getElementById('driverEarnChart')) {
    charts.driverEarn = new Chart(document.getElementById('driverEarnChart'), {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{ label: '₹ Earnings', data: [32000, 38000, 41000, 35000, 45000, 48200], backgroundColor: 'rgba(0,255,136,0.7)', borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#999' }, grid: { color: '#2a2a2a' } }, y: { ticks: { color: '#999', callback: v => '₹' + (v/1000).toFixed(0) + 'k' }, grid: { color: '#2a2a2a' } } } }
    });
  }
}

// ===== AI COPILOT =====
function toggleCopilot() {
  document.getElementById('copilotPanel').classList.toggle('hidden');
}

const COPILOT_RESPONSES = {
  'Why was this truck selected?': 'The truck was selected based on: (1) Capacity fit for your cargo weight, (2) Proximity to pickup — already nearby, (3) Route overlap with destination, (4) High driver rating (4.7+), and (5) Competitive pricing.',
  'Show cheapest option': () => {
    const c = [...ALL_TRUCKS].filter(t => t.status === 'available').sort((a, b) => a.price - b.price)[0];
    return `Cheapest available: ${c.driverName} (${c.id}) at ₹${c.price.toLocaleString()}/ton. Capacity: ${c.capacity}T. Rating: ★${c.rating}.`;
  },
  'Show highest rated driver': () => {
    const t = [...ALL_TRUCKS].sort((a, b) => b.rating - a.rating)[0];
    return `Top rated driver: ${t.driverName} (★${t.rating}), ${t.trips} trips. ${t.id} in ${t.currentCity}.`;
  },
  'Estimate delivery time': 'Based on typical India road conditions: 300 km routes take 8–10 hours. 600 km takes 14–18 hours. Highways are faster. Real-time traffic affects ETA by ±20%.'
};

function askCopilot(q) {
  const msgs = document.getElementById('copilotMessages');
  if (!msgs) return;
  document.getElementById('copilotPanel').classList.remove('hidden');

  const userMsg = document.createElement('div');
  userMsg.className = 'copilot-msg user';
  userMsg.textContent = q;
  msgs.appendChild(userMsg);

  setTimeout(() => {
    const aiMsg = document.createElement('div');
    aiMsg.className = 'copilot-msg ai';
    const resp = COPILOT_RESPONSES[q];
    aiMsg.textContent = typeof resp === 'function' ? resp() : resp || 'Let me check that for you...';
    msgs.appendChild(aiMsg);
    msgs.scrollTop = msgs.scrollHeight;
  }, 500);

  msgs.scrollTop = msgs.scrollHeight;
}

// ===== TOAST =====
function showToast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${type === 'success' ? '✓' : '✕'} ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ===== INITIAL RUN =====
window.addEventListener('load', () => {
  // Auto show login
});
