import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import {
  initAudio,
  playClick,
  playHover,
  toggleMute
} from './audio.js';
import {
  PALETTE,
  createTerrain,
  createWater,
  updateWaterWaves,
  createRoads,
  createTree,
  createDNASculpture,
  createMainGate,
  createInfiniteCorridor,
  createConvocationHall,
  createSAC,
  createGymkhana,
  createDelegateMesh,
  createParticleTexture,
  createDroneModel,
  createRobotModel,
  createTechfestBanner,
  createLaserBeam
} from './campus.js';

// --- Global Variables ---
let scene, camera, renderer, controls;
let terrain, water, roads, dnaSculpture;
let buildings = [];
let stars;
let dirLight, ambientLight, dnaSpotlight1, dnaSpotlight2;

// Additional 3D Simulation Elements
let drones = [];
let robots = [];
let lasers = [];
let banners = [];

// Interactive controls state
let isNight = false;
let dnaSpeedMult = 1.0;
let solarIntensityFactor = 1.0;
let activeLandmark = 'campus';
let activeTab = 'landmarks';
let activeSubTab = 'highlights';

// Camera transition & Tour variables
let cameraTween = null;
let targetTween = null;
let activeTour = null;
let tourTimeline = null;

// Base DNA emissive intensity (resolves day/night override bug)
const simConfig = {
  dnaBaseEmissive: 0.55
};

// Spore Particles variables
let sporesGeometry;
let sporesMesh;
const SPORES_COUNT = 1000;
const sporePhases = new Float32Array(SPORES_COUNT);
const sporeHomes = new Float32Array(SPORES_COUNT * 3);
const sporeVelocities = new Float32Array(SPORES_COUNT * 3);
const mouse3D = new THREE.Vector3(999, 999, 999); // Offscreen default

// Delegate simulation variables
const DELEGATES_COUNT = 30;
const delegates = [];
const delegateCategories = ['student', 'international', 'organizer', 'media'];
const delegateRoles = {
  student: ["Robowars Driver", "Coding Competitor", "IITB Student", "Drone Racer"],
  international: ["Keynote Speaker", "Global Exhibitor", "Tech Investor", "International Delegate"],
  organizer: ["Techfest Manager", "Stage Coordinator", "Technical Admin", "Volunteer Leader"],
  media: ["PR Representative", "Official Photographer", "Tech Blogger", "Media Drone Operator"]
};

const delegatePaths = {
  gate: new THREE.Vector3(0, 0.4, 85),
  plazaEntrance: new THREE.Vector3(0, 0.4, 20),
  plazaCenter: new THREE.Vector3(0, 0.4, 0),
  convo: new THREE.Vector3(40, 0.4, 30),
  sac: new THREE.Vector3(45, 0.4, -30),
  gym: new THREE.Vector3(-45, 0.4, 45),
  corridor: new THREE.Vector3(-15, 0.4, -40)
};

// Simulation Logs History
const simulationLogs = [
  "Simulation grid initialized.",
  "Solar array charging at 100% capacity.",
  "Central DNA sculpture bioluminescence calibrated."
];

// HUD & Performance metrics
let fps = 0;
let lastFpsUpdate = 0;
let frameCount = 0;
let totalVisitors = 1024;
let lastVisitorTick = 0;
let introComplete = false;

// Raycaster utilities
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredBuilding = null;

// Landmark database
const landmarkData = {
  campus: {
    badge: "Twin Overview",
    title: "Techfest 2026 Campus",
    description: "Welcome to the digital twin of Techfest IIT Bombay 2026. Explore the intersection of Science, Technology, Innovation, and Sustainability across the campus.",
    metrics: [
      { name: "Total Registrations", val: 88 },
      { name: "Tech Showcases Online", val: 95 },
      { name: "Eco-Grid Efficiency", val: 80 }
    ],
    highlights: [
      { name: "Interactive Digital Twin", desc: "Real-time tracking of delegates, active venues, and environmental stats.", tag: "Innovation" },
      { name: "Central DNA Centerpiece", desc: "A double-helix installation symbolizing biological evolution and science.", tag: "Science" }
    ],
    schedule: [
      { day: "Day 1", time: "10:00 AM", title: "Inauguration Ceremony", venue: "Main Gate" },
      { day: "Day 2", time: "11:30 AM", title: "Keynote: Nobel Laureate Lecture", venue: "Convocation Hall" },
      { day: "Day 3", time: "07:00 PM", title: "Drone Light Show & Closing", venue: "Gymkhana Complex" }
    ],
    ecoFeatures: [
      { name: "Green Powered Exhibits", desc: "Renewable solar grids powering all interactive corridor exhibitions." },
      { name: "Biophilic Plaza Design", desc: "Lush vegetation cover integrated around the central DNA monument." }
    ]
  },
  gate: {
    badge: "Gate 1",
    title: "Main Entrance Gate",
    description: "The primary gateway to the campus, showcasing the interface between high-tech security grids and biophilic architecture.",
    metrics: [
      { name: "Solar Roof Yield", val: 85 },
      { name: "AI Check-in Speed", val: 95 },
      { name: "Green Materials", val: 90 }
    ],
    highlights: [
      { name: "AI Delegate Check-in", desc: "Facial-recognition security check-in and dynamic schedule guide booklet distribution.", tag: "AI/Security" },
      { name: "Solar Canopy", desc: "The gate roof is lined with bifacial solar panels powering the registration grid.", tag: "Sustainability" }
    ],
    schedule: [
      { day: "Day 1", time: "08:00 AM", title: "Registration Desk Opens", venue: "Main Gate" },
      { day: "Day 1", time: "10:00 AM", title: "Inauguration Ceremony", venue: "Main Gate" }
    ],
    ecoFeatures: [
      { name: "Solar Canopy Array", desc: "Bifacial solar cells capture direct sun and reflected light from the road." },
      { name: "Reclaimed Materials", desc: "Built with fly-ash brick pillars and reclaimed plantation teakwood." }
    ]
  },
  corridor: {
    badge: "Tech Walk",
    title: "Infinite Corridor Exhibits",
    description: "The main structural spine of the IIT Bombay campus, retrofitted with passive cooling, R&D showcases, and interactive demonstrations.",
    metrics: [
      { name: "Venturi Ventilation", val: 95 },
      { name: "Daylight Autonomy", val: 90 },
      { name: "Exhibit Density", val: 100 }
    ],
    highlights: [
      { name: "TechConnect R&D", desc: "A showcase of cutting-edge technology from premier universities and research institutes.", tag: "Research" },
      { name: "Interactive Robotics", desc: "Interact with humanoid robots, hexapods, and autonomous navigation vehicles.", tag: "Robotics" }
    ],
    schedule: [
      { day: "Day 1", time: "11:30 AM", title: "TechConnect Exhibit Opens", venue: "Infinite Corridor" },
      { day: "Day 2", time: "10:00 AM", title: "Department Research Demos", venue: "Infinite Corridor" },
      { day: "Day 3", time: "02:00 PM", title: "Robotic Arm Workshop", venue: "Infinite Corridor" }
    ],
    ecoFeatures: [
      { name: "Passive Cooling Venturi", desc: "Structural architecture forms a wind tunnel drawing fresh air from nearby lakes." },
      { name: "Zero Energy Lighting", desc: "High-performance clerestory windows replace 100% of daytime lighting power." }
    ]
  },
  convo: {
    badge: "Flagship Arena",
    title: "Convocation Hall",
    description: "The grand geodesic dome hosting Robowars, major competitions, flagship lectures, and keynotes by world-renowned thinkers.",
    metrics: [
      { name: "HVAC Efficiency", val: 90 },
      { name: "Acoustic Rating", val: 95 },
      { name: "Audience Capacity", val: 85 }
    ],
    highlights: [
      { name: "Robowars Championship", desc: "The ultimate battle of custom-built combat robots, fighting in a bulletproof arena.", tag: "Robowars" },
      { name: "Keynote Lectures", desc: "Inspirational talks by Nobel Laureates, global tech leaders, and scientists.", tag: "Lectures" }
    ],
    schedule: [
      { day: "Day 1", time: "02:00 PM", title: "Flagship Keynote Address", venue: "Convocation Hall" },
      { day: "Day 2", time: "11:30 AM", title: "Robowars: Heavyweight Prelims", venue: "Convocation Hall" },
      { day: "Day 3", time: "04:00 PM", title: "Robowars: Grand Finals", venue: "Convocation Hall" }
    ],
    ecoFeatures: [
      { name: "Geothermal HVAC", desc: "Foundation heat exchangers handle 70% of cooling loads via subterranean temperature sync." },
      { name: "Acoustic Dome Shell", desc: "Low-poly dome structure optimizes natural acoustic projection, reducing audio amplification loads." }
    ]
  },
  sac: {
    badge: "Play & Interact",
    title: "SAC Gaming & Simulator Hub",
    description: "The Student Activity Centre is converted into a high-octane esports arena, VR flight simulators, and community gaming spaces.",
    metrics: [
      { name: "Esports Grid Power", val: 80 },
      { name: "Green Roof Insulation", val: 75 },
      { name: "Water Recovery", val: 100 }
    ],
    highlights: [
      { name: "Esports Championship", desc: "National esports finals featuring top gaming titles and professional teams.", tag: "Gaming" },
      { name: "VR Flight Simulators", desc: "Fly simulated routes using state-of-the-art motion platforms and headset gear.", tag: "AR/VR" }
    ],
    schedule: [
      { day: "Day 1", time: "01:00 PM", title: "Esports Tournament Kickoff", venue: "Student Activity Centre" },
      { day: "Day 2", time: "03:00 PM", title: "AR/VR Sandbox Freeplay", venue: "Student Activity Centre" },
      { day: "Day 3", time: "03:00 PM", title: "Esports Grand Finals", venue: "Student Activity Centre" }
    ],
    ecoFeatures: [
      { name: "Greywater Root Filtration", desc: "Locker water is filtered through native plant wetlands and recycled for campus lawns." },
      { name: "Insulating Green Roof", desc: "Lush grass-covered stepped roof reduces indoor cooling load by 4 degrees Celsius." }
    ]
  },
  gym: {
    badge: "Spectacle Stadium",
    title: "Gymkhana Complex",
    description: "The vast open stadium hosting nightly drone light shows, laser performances, closing ceremonies, and major outdoor exhibitions.",
    metrics: [
      { name: "Solar Floodlights", val: 95 },
      { name: "Sky Laser Intensity", val: 100 },
      { name: "Water Runoff Capture", val: 90 }
    ],
    highlights: [
      { name: "Synchronized Drone Show", desc: "100+ low-poly drones forming complex 3D shapes and animations in the night sky.", tag: "Drones" },
      { name: "Laser Spectacular", desc: "Multicolor sky-searchlights performing a coordinated dance to synthesized music.", tag: "Lasers" }
    ],
    schedule: [
      { day: "Day 1", time: "07:30 PM", title: "Night Drone Show Prelims", venue: "Gymkhana Complex" },
      { day: "Day 2", time: "08:00 PM", title: "Laser Spectacle Show", venue: "Gymkhana Complex" },
      { day: "Day 3", time: "07:00 PM", title: "Grand Finale & Closing Ceremony", venue: "Gymkhana Complex" }
    ],
    ecoFeatures: [
      { name: "Groundwater Recharge", desc: "Permeable pavements capture rain and runoff, directing it to underground aquifers." },
      { name: "Dark Sky LED Grid", desc: "Direct downward LED optics eliminate skyward light pollution, powered strictly by local solar storage." }
    ]
  }
};

// Guided Tour Trails preset
const tourTrails = {
  techInnovator: {
    label: "Tech Innovator Route",
    path: ["gate", "corridor", "convo"],
    pathStr: "Gate → Corridor → Convocation",
    desc: "Examine registration entry, Infinite Corridor research exhibits, and Convocation Robowars.",
    duration: 3.5
  },
  spectacle: {
    label: "Night Spectacle Trail",
    path: ["gym", "convo", "campus"],
    pathStr: "Gymkhana → Convocation → Overview",
    desc: "Witness Gymkhana night drone shows, Convocation searchlights, and central DNA plaza.",
    duration: 3.5
  },
  sustainability: {
    label: "Green Design Trail",
    path: ["sac", "gate", "campus"],
    pathStr: "SAC → Main Gate → Overview",
    desc: "Review locker water root filtration, stepped green grass roofs, and solar arrays.",
    duration: 3.5
  }
};

// Navigation views presets
const cameraPresets = {
  birdsEye: {
    cam: new THREE.Vector3(0, 140, 190),
    target: new THREE.Vector3(0, 0, 0),
    label: "Birds-Eye View",
    desc: "A wide strategic panorama looking down on the central DNA pavilion."
  },
  plaza: {
    cam: new THREE.Vector3(0, 18, 38),
    target: new THREE.Vector3(0, 2, 0),
    label: "Plaza Center",
    desc: "Close inspection of the bioluminescent DNA double-helix sculpture."
  },
  river: {
    cam: new THREE.Vector3(45, 12, 50),
    target: new THREE.Vector3(75, -2, 10),
    label: "River Bank View",
    desc: "Detailed close-up on the procedural waving low-poly water canal."
  },
  gate: {
    cam: new THREE.Vector3(0, 6, 120),
    target: new THREE.Vector3(0, 4, 85),
    label: "Main Entrance",
    desc: "Welcoming angle near the modular solar canopy gate."
  },
  sunset: {
    cam: new THREE.Vector3(-65, 16, 25),
    target: new THREE.Vector3(-15, 3, -45),
    label: "Corridor Promenade",
    desc: "Scenic camera track looking along the Infinite Corridor front road."
  }
};

// Camera landmark coordinates
const cameraViews = {
  campus: { cam: new THREE.Vector3(0, 85, 130), target: new THREE.Vector3(0, 0, 0) },
  gate: { cam: new THREE.Vector3(0, 12, 115), target: new THREE.Vector3(0, 4, 85) },
  corridor: { cam: new THREE.Vector3(-15, 14, -18), target: new THREE.Vector3(-15, 3, -45) },
  convo: { cam: new THREE.Vector3(25, 16, 60), target: new THREE.Vector3(40, 5, 30) },
  sac: { cam: new THREE.Vector3(65, 15, -10), target: new THREE.Vector3(45, 4, -30) },
  gym: { cam: new THREE.Vector3(-25, 18, 75), target: new THREE.Vector3(-45, 5, 45) }
};

// DOM Elements cache
const tooltip = document.getElementById('tooltip');
const loadingScreen = document.getElementById('loading-screen');
const progressFill = document.getElementById('progress-fill');
const loaderTitle = document.getElementById('loader-title');
const loaderStatus = document.getElementById('loader-status');
const enterBtn = document.getElementById('enter-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const progressContainer = document.getElementById('progress-container');
const tabContent = document.getElementById('tab-content');
const toastContainer = document.getElementById('toast-container');
const delegatesOverlay = document.getElementById('delegates-overlay');

// --- Initialization ---
function init() {
  // 1. Create Scene & Renderer
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a100c); // Deep forest green-black
  scene.fog = new THREE.FogExp2(0x0a100c, 0.0035);
  
  const canvas = document.getElementById('webgl-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  // 2. Camera & OrbitControls
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
  
  // Cinematic start coordinate (high above)
  camera.position.set(0, 220, 290);
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from going under ground
  controls.minDistance = 15;
  controls.maxDistance = 220;
  controls.target.set(0, 0, 0);
  controls.enabled = false; // Lock controls during intro
  
  // 3. Lighting Setup
  setupLights();
  
  // 4. Build Environment
  buildScene();
  
  // 5. Setup UI Event Listeners
  setupUI();
  
  // 6. Spawn delegates and setup timelines
  spawnDelegates();
  
  // 7. Window Resize
  window.addEventListener('resize', onWindowResize);
  
  // 8. Raycasting Events
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('click', onSceneClick);
  
  // Update loading progress to completion
  updateLoadingProgress(100);
}

// --- Lights Setup ---
function setupLights() {
  ambientLight = new THREE.AmbientLight(0xdcfce7, 0.65); // Warm mint
  scene.add(ambientLight);
  
  dirLight = new THREE.DirectionalLight(0xfef08a, 1.45); // Yellow sun
  dirLight.position.set(60, 100, 40);
  dirLight.castShadow = true;
  
  // Shadows config
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 320;
  
  const d = 130;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0004;
  
  scene.add(dirLight);
  
  // Emissive spot lights for DNA core collar (glowing)
  dnaSpotlight1 = new THREE.SpotLight(PALETTE.dnaStrand1, 0.1, 40, Math.PI / 5, 0.6, 1);
  dnaSpotlight1.position.set(-6, 0.5, -6);
  dnaSpotlight1.target.position.set(0, 8, 0);
  scene.add(dnaSpotlight1);
  scene.add(dnaSpotlight1.target);
  
  dnaSpotlight2 = new THREE.SpotLight(PALETTE.dnaStrand2, 0.1, 40, Math.PI / 5, 0.6, 1);
  dnaSpotlight2.position.set(6, 0.5, 6);
  dnaSpotlight2.target.position.set(0, 8, 0);
  scene.add(dnaSpotlight2);
  scene.add(dnaSpotlight2.target);
}

// --- Environment Construction ---
function buildScene() {
  updateLoadingProgress(20);
  
  // 1. Terrain & Water
  terrain = createTerrain();
  scene.add(terrain);
  
  water = createWater();
  scene.add(water);
  
  updateLoadingProgress(40);
  
  // 2. Roads
  roads = createRoads();
  scene.add(roads);
  
  // 3. Central DNA Sculpture
  dnaSculpture = createDNASculpture();
  dnaSculpture.position.set(0, 0.05, 0);
  scene.add(dnaSculpture);
  
  updateLoadingProgress(55);
  
  // 4. Five Landmark Buildings
  const gate = createMainGate();
  gate.position.set(0, 0, 85);
  scene.add(gate);
  buildings.push(gate);
  
  const corridor = createInfiniteCorridor();
  corridor.position.set(-15, 0, -45);
  scene.add(corridor);
  buildings.push(corridor);
  
  const convo = createConvocationHall();
  convo.position.set(40, 0, 30);
  scene.add(convo);
  buildings.push(convo);
  
  const sac = createSAC();
  sac.position.set(45, 0, -30);
  scene.add(sac);
  buildings.push(sac);
  
  const gym = createGymkhana();
  gym.position.set(-45, 0, 45);
  scene.add(gym);
  buildings.push(gym);
  
  updateLoadingProgress(70);
  
  // 5. Populate Trees (140 trees)
  spawnTrees();
  
  updateLoadingProgress(85);
  
  // 6. Starfield
  createStarfield();
  
  // 7. Spore Particles System (1000 spores)
  spawnSpores();

  // 8. Welcome/Techfest Banners
  const gateBanner = createTechfestBanner("WELCOME");
  gateBanner.position.set(-14, 0, 78);
  gateBanner.rotation.y = Math.PI / 6;
  scene.add(gateBanner);
  banners.push(gateBanner);

  const convoBanner = createTechfestBanner("ROBOWARS");
  convoBanner.position.set(18, 0, 36);
  convoBanner.rotation.y = -Math.PI / 4;
  scene.add(convoBanner);
  banners.push(convoBanner);

  // 9. Interactive Drones
  const droneCoords = [
    { x: -45, y: 12, z: 45 },
    { x: -55, y: 15, z: 35 },
    { x: -35, y: 18, z: 55 }
  ];
  droneCoords.forEach((coord, idx) => {
    const drone = createDroneModel();
    drone.position.set(coord.x, coord.y, coord.z);
    drone.userData = { startY: coord.y, initialX: coord.x, initialZ: coord.z };
    scene.add(drone);
    drones.push(drone);
  });

  // 10. Interactive Robots
  const robotCoords = [
    { x: 30, z: 34, rangeX: 10, rangeZ: 0, speed: 0.5 },
    { x: 36, z: 20, rangeX: 0, rangeZ: 8, speed: 0.4 },
    { x: -30, z: -40, rangeX: 12, rangeZ: 0, speed: 0.6 },
    { x: 0, z: -40, rangeX: 12, rangeZ: 0, speed: 0.7 }
  ];
  robotCoords.forEach((coord, idx) => {
    const robot = createRobotModel();
    robot.position.set(coord.x, 0.02, coord.z);
    robot.userData = {
      startX: coord.x,
      startZ: coord.z,
      rangeX: coord.rangeX,
      rangeZ: coord.rangeZ,
      speed: coord.speed,
      phase: Math.random() * Math.PI * 2
    };
    scene.add(robot);
    robots.push(robot);
  });

  // 11. Laser Searchlights (Gymkhana & Convo Dome)
  const laser1 = createLaserBeam(0x22d3ee); // Cyan
  laser1.position.set(-45, 0.1, 40);
  scene.add(laser1);
  lasers.push(laser1);

  const laser2 = createLaserBeam(0xec4899); // Pink
  laser2.position.set(-35, 0.1, 50);
  scene.add(laser2);
  lasers.push(laser2);

  const convoLaser = createLaserBeam(0x4ade80); // Green
  convoLaser.position.set(40, 19.5, 30);
  scene.add(convoLaser);
  lasers.push(convoLaser);
}

// --- Spores Generation ---
function spawnSpores() {
  sporesGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(SPORES_COUNT * 3);
  
  for (let i = 0; i < SPORES_COUNT; i++) {
    const i3 = i * 3;
    
    // Spread in a large 3D coordinate box above the terrain
    const x = THREE.MathUtils.randFloat(-110, 110);
    const y = THREE.MathUtils.randFloat(0.6, 25);
    const z = THREE.MathUtils.randFloat(-110, 110);
    
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    
    sporeHomes[i3] = x;
    sporeHomes[i3 + 1] = y;
    sporeHomes[i3 + 2] = z;
    
    sporePhases[i] = Math.random() * Math.PI * 2;
    
    sporeVelocities[i3] = 0;
    sporeVelocities[i3 + 1] = 0;
    sporeVelocities[i3 + 2] = 0;
  }
  
  sporesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const sporeTexture = createParticleTexture();
  const sporesMaterial = new THREE.PointsMaterial({
    size: 0.85,
    map: sporeTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.65
  });
  
  sporesMesh = new THREE.Points(sporesGeometry, sporesMaterial);
  scene.add(sporesMesh);
}

// --- Procedural Tree Spawning ---
function spawnTrees() {
  const treeContainer = new THREE.Group();
  treeContainer.name = "Trees";
  
  const minRange = -115;
  const maxRange = 115;
  const treeCount = 140;
  
  function isValidTreePosition(x, z) {
    const distFromCenter = Math.sqrt(x*x + z*z);
    if (distFromCenter < 32) return false;
    
    const riverCenterX = 75 + Math.sin(z * 0.04) * 20;
    if (Math.abs(x - riverCenterX) < 22) return false;
    
    // Landmark boxes
    if (Math.sqrt(x*x + (z-85)*(z-85)) < 18) return false;
    if (x > -65 && x < 35 && z > -58 && z < -32) return false;
    if (Math.sqrt((x-40)*(x-40) + (z-30)*(z-30)) < 24) return false;
    if (Math.sqrt((x-45)*(x-45) + (z+30)*(z+30)) < 22) return false;
    if (Math.sqrt((x+45)*(x+45) + (z-45)*(z-45)) < 28) return false;
    
    // Road avoidance
    if (Math.abs(x) < 4.5 && z > 15 && z < 88) return false;
    
    return true;
  }
  
  for (let i = 0; i < treeCount; i++) {
    let x = THREE.MathUtils.randFloat(minRange, maxRange);
    let z = THREE.MathUtils.randFloat(minRange, maxRange);
    let attempts = 0;
    
    while (!isValidTreePosition(x, z) && attempts < 10) {
      x = THREE.MathUtils.randFloat(minRange, maxRange);
      z = THREE.MathUtils.randFloat(minRange, maxRange);
      attempts++;
    }
    
    if (attempts < 10) {
      let y = 0;
      const distFromCenter = Math.sqrt(x*x + z*z);
      if (distFromCenter >= 35) {
        const noise = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 6;
        const noise2 = Math.sin(x * 0.01) * Math.sin(z * 0.01) * 12;
        y = Math.max(0, noise + noise2 - 2);
      }
      
      const type = Math.random() > 0.4 ? 'pine' : 'broadleaf';
      const tree = createTree(type);
      tree.position.set(x, y, z);
      tree.rotation.y = Math.random() * Math.PI * 2;
      
      const scale = THREE.MathUtils.randFloat(0.7, 1.3);
      tree.scale.set(scale, scale, scale);
      treeContainer.add(tree);
    }
  }
  
  scene.add(treeContainer);
}

// --- Night Starfield Generator ---
function createStarfield() {
  const starsGeom = new THREE.BufferGeometry();
  const starsCount = 400;
  const starPositions = new Float32Array(starsCount * 3);
  
  for (let i = 0; i < starsCount * 3; i += 3) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 250;
    
    starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta));
    starPositions[i + 2] = r * Math.cos(phi);
  }
  
  starsGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  
  const starsMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.8,
    transparent: true,
    opacity: 0, // Hidden during day
    sizeAttenuation: true
  });
  
  stars = new THREE.Points(starsGeom, starsMat);
  scene.add(stars);
}

// --- Staggered Delegate Spawn & Timelines ---
function spawnDelegates() {
  const delegateGroup = new THREE.Group();
  delegateGroup.name = "Delegates";
  scene.add(delegateGroup);
  
  const landmarksKeys = ['convo', 'sac', 'gym', 'corridor'];
  
  for (let i = 0; i < DELEGATES_COUNT; i++) {
    // Determine category
    const cat = delegateCategories[i % delegateCategories.length];
    
    // Pick role based on category
    const rolesList = delegateRoles[cat];
    const roleLabel = rolesList[Math.floor(Math.random() * rolesList.length)];
    
    // Create 3D mesh
    const mesh = createDelegateMesh(cat);
    mesh.position.copy(delegatePaths.gate); // Start at Main Gate
    mesh.visible = false; // Hidden until timeline starts
    delegateGroup.add(mesh);
    
    // Create HTML Badge overlay
    const badge = document.createElement('div');
    badge.className = 'delegate-badge';
    badge.style.setProperty('--badge-color', `var(--${cat})`);
    
    let label = roleLabel;
    badge.innerHTML = `<span class="badge-dot"></span><span>${label} #${i + 1}</span>`;
    delegatesOverlay.appendChild(badge);
    
    // Pick random target landmark
    const targetKey = landmarksKeys[Math.floor(Math.random() * landmarksKeys.length)];
    const targetNode = delegatePaths[targetKey];
    
    const delegate = {
      index: i,
      category: cat,
      mesh: mesh,
      badgeEl: badge,
      destinationLabel: targetKey === 'convo' ? 'Convocation Hall' :
                        targetKey === 'sac' ? 'SAC' :
                        targetKey === 'gym' ? 'Gymkhana' : 'Infinite Corridor',
      targetNode: targetNode,
      isActive: false,
      statusMsg: "Awaiting registration."
    };
    
    delegates.push(delegate);
    
    // Build Navigation timeline using GSAP
    const tl = gsap.timeline({
      repeat: -1,
      delay: i * 2.8, // Staggered entry intervals
      onStart: () => {
        delegate.isActive = true;
        delegate.mesh.visible = true;
        logEvent(`Delegate #${i+1} (${label}) checked in at Main Gate.`, 'blue');
      }
    });
    
    // Walk to Plaza Entrance
    tl.to(mesh.position, {
      x: delegatePaths.plazaEntrance.x,
      z: delegatePaths.plazaEntrance.z,
      duration: 5,
      ease: "none",
      onStart: () => { delegate.statusMsg = "Walking along Main Avenue."; }
    });
    
    // Enter Plaza
    tl.to(mesh.position, {
      x: delegatePaths.plazaCenter.x,
      z: delegatePaths.plazaCenter.z,
      duration: 2,
      ease: "none",
      onStart: () => { delegate.statusMsg = "Crossing central DNA plaza."; }
    });
    
    // Walk to Target Landmark
    tl.to(mesh.position, {
      x: targetNode.x,
      z: targetNode.z,
      duration: 4,
      ease: "none",
      onStart: () => { delegate.statusMsg = `Heading to ${delegate.destinationLabel}.`; }
    });
    
    // Inspect/Interact at building (pause and float/spin)
    tl.to(mesh.rotation, {
      y: Math.PI * 4,
      duration: 3,
      ease: "power1.inOut",
      onStart: () => {
        delegate.statusMsg = `Inspecting ${delegate.destinationLabel} eco-features.`;
        // Occasional toast notifications for delegate arrivals to make site feel alive
        if (Math.random() > 0.75 && introComplete) {
          showToast(`Delegate #${delegate.index + 1} (${label}) arrived at ${delegate.destinationLabel}.`, cat);
        }
      }
    });
    
    // Return to Plaza Center
    tl.to(mesh.position, {
      x: delegatePaths.plazaCenter.x,
      z: delegatePaths.plazaCenter.z,
      duration: 4,
      ease: "none",
      onStart: () => { delegate.statusMsg = "Returning to DNA Plaza."; }
    });
    
    // Walk to Plaza Entrance
    tl.to(mesh.position, {
      x: delegatePaths.plazaEntrance.x,
      z: delegatePaths.plazaEntrance.z,
      duration: 2,
      ease: "none",
      onStart: () => { delegate.statusMsg = "Departing Plaza."; }
    });
    
    // Walk back to Gate
    tl.to(mesh.position, {
      x: delegatePaths.gate.x,
      z: delegatePaths.gate.z,
      duration: 5,
      ease: "none",
      onStart: () => { delegate.statusMsg = "Heading to Exit."; },
      onComplete: () => {
        logEvent(`Delegate #${i+1} (${label}) completed tour and departed.`, 'green');
      }
    });
  }
}

// --- Log Timeline Events ---
function logEvent(msg, type = 'normal') {
  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  
  simulationLogs.unshift(`[${timeStr}] ${msg}`);
  if (simulationLogs.length > 50) simulationLogs.pop();
  
  // Live update log container in UI if timeline tab is active
  const logEl = document.getElementById('timeline-logs');
  if (logEl) {
    const highlightClass = type !== 'normal' ? 'highlight' : '';
    logEl.innerHTML = simulationLogs.map(log => {
      const match = log.match(/^\[(.*?)\] (.*)$/);
      if (match) {
        return `<div class="log-entry ${highlightClass}"><span class="log-time">[${match[1]}]</span>${match[2]}</div>`;
      }
      return `<div class="log-entry">${log}</div>`;
    }).join('');
  }
}

// --- Loading Progress UI ---
function updateLoadingProgress(val) {
  progressFill.style.width = `${val}%`;
  
  if (val >= 100) {
    // Assets ready, hide spinner and show "Enter" button
    setTimeout(() => {
      loadingSpinner.style.display = 'none';
      progressContainer.style.display = 'none';
      loaderTitle.textContent = "ECO-CAMPUS READY";
      loaderStatus.textContent = "Click button below to start the cinematic simulation and enable sound.";
      enterBtn.style.display = 'inline-flex';
    }, 400);
  }
}

// --- Cinematic Entrance Intro ---
function startCinematicIntro() {
  // 1. Initialize synthesized web audio context
  initAudio();
  
  // 2. Fade out loading overlay
  loadingScreen.style.opacity = '0';
  setTimeout(() => {
    loadingScreen.style.visibility = 'hidden';
  }, 850);
  
  // 3. Play chime click sound
  playClick();
  
  // 4. Start camera flight descend spiral
  // Move camera from high down to default
  gsap.to(camera.position, {
    x: cameraViews.campus.cam.x,
    y: cameraViews.campus.cam.y,
    z: cameraViews.campus.cam.z,
    duration: 4.8,
    ease: "power2.inOut",
    onUpdate: () => {
      // Look at center plaza during spiral down
      camera.lookAt(0, 0, 0);
    },
    onComplete: () => {
      controls.enabled = true; // Enable user controls
      introComplete = true;
      showToast("Simulation Grid Activated. Explore campus landmarks!", "green");
      logEvent("Simulation active. Camera controls unlocked.", "green");
    }
  });
  
  // Sync OrbitControls target
  gsap.to(controls.target, {
    x: cameraViews.campus.target.x,
    y: cameraViews.campus.target.y,
    z: cameraViews.campus.target.z,
    duration: 4.8,
    ease: "power2.inOut"
  });
}

// --- UI Interaction & Event Handlers ---
function setupUI() {
  // Enter button click
  enterBtn.addEventListener('click', () => {
    startCinematicIntro();
  });
  
  // Mute button click
  const muteBtn = document.getElementById('mute-btn');
  muteBtn.addEventListener('click', () => {
    playClick();
    const muted = toggleMute();
    const icon = muteBtn.querySelector('i');
    if (muted) {
      icon.className = 'fa-solid fa-volume-xmark';
      showToast("Audio muted.", "blue");
    } else {
      icon.className = 'fa-solid fa-volume-high';
      showToast("Ambient audio enabled.", "green");
    }
  });
  
  // Tab Switching buttons
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
    btn.addEventListener('mouseenter', () => {
      playHover();
    });
  });
  
  // Render default tab content (Landmarks)
  switchTab('landmarks');
}

// --- Render Landmark Sub-tab Contents ---
function renderSubTabContent(data) {
  if (activeSubTab === 'highlights') {
    return data.highlights.map(h => `
      <div class="tech-event-card">
        <div class="tech-event-title">
          <span>${h.name}</span>
          <span class="tech-event-tag">${h.tag}</span>
        </div>
        <div class="tech-event-desc">${h.desc}</div>
      </div>
    `).join('');
  } else if (activeSubTab === 'schedule') {
    return data.schedule.map(s => `
      <div class="schedule-item" data-landmark="${activeLandmark}">
        <div class="schedule-time-box">
          <span class="schedule-day">${s.day}</span>
          <span class="schedule-time">${s.time}</span>
        </div>
        <div class="schedule-details">
          <span class="schedule-title">${s.title}</span>
          <span class="schedule-venue"><i class="fa-solid fa-location-dot"></i> ${s.venue}</span>
        </div>
      </div>
    `).join('');
  } else if (activeSubTab === 'eco') {
    const metricsHtml = `
      <div class="metrics-list">
        ${data.metrics.map(m => `
          <div class="metric-row">
            <div class="metric-info">
              <span class="metric-name">${m.name}</span>
              <span class="metric-val">${m.val}%</span>
            </div>
            <div class="metric-bar">
              <div class="metric-fill" data-value="${m.val}"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    const featuresHtml = data.ecoFeatures.map(f => `
      <div class="tech-event-card" style="border-left-color: var(--primary);">
        <div class="tech-event-title">
          <span>${f.name}</span>
        </div>
        <div class="tech-event-desc">${f.desc}</div>
      </div>
    `).join('');
    return metricsHtml + featuresHtml;
  }
  return '';
}

// --- Start Guided Tour Trail Sequence ---
function startTourTrail(tourId) {
  if (!introComplete) return;
  
  if (tourTimeline) {
    tourTimeline.kill();
  }
  
  activeTour = tourId;
  playClick();
  showToast(`Starting Guided Tour: ${tourTrails[tourId].label}`, 'green');
  
  // Redraw tab to show active state
  if (activeTab === 'navigation') {
    switchTab('navigation');
  }
  
  const tour = tourTrails[tourId];
  tourTimeline = gsap.timeline({
    onComplete: () => {
      activeTour = null;
      if (activeTab === 'navigation') switchTab('navigation');
      showToast("Tour completed.", "blue");
      logEvent(`Guided Tour: ${tour.label} completed.`);
    }
  });
  
  tour.path.forEach((venueId, idx) => {
    // 1. Move camera to venue
    tourTimeline.add(() => {
      selectLandmark(venueId);
    });
    
    // 2. Wait at the venue (flight duration + read time)
    tourTimeline.to({}, { duration: 5.5 });
  });
}

// --- Tab Switching Manager ---
function switchTab(tabId) {
  if (tabId !== activeTab && introComplete) {
    playClick();
  }
  
  activeTab = tabId;
  
  // Update header buttons active status
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Generate content dynamically
  let html = '';
  
  if (tabId === 'landmarks') {
    const data = landmarkData[activeLandmark];
    html = `
      <div class="overview-state animate-in">
        <div class="landmark-badge">${data.badge}</div>
        <h1 class="panel-title">${data.title}</h1>
        <p class="panel-description">${data.description}</p>
        
        <!-- Internal Progressive Sub-tabs -->
        <div class="sub-tabs-container">
          <button class="sub-tab-btn ${activeSubTab === 'highlights' ? 'active' : ''}" data-subtab="highlights">
            Highlights
          </button>
          <button class="sub-tab-btn ${activeSubTab === 'schedule' ? 'active' : ''}" data-subtab="schedule">
            Schedule
          </button>
          <button class="sub-tab-btn ${activeSubTab === 'eco' ? 'active' : ''}" data-subtab="eco">
            Eco-Features
          </button>
        </div>
        
        <!-- Dynamic Sub-tab Panel Content -->
        <div class="sub-tab-content-panel">
          ${renderSubTabContent(data)}
        </div>
        
        <div class="sustainability-header" style="margin-top: 24px;">
          <i class="fa-solid fa-compass"></i>
          <span>Campus Landmarks</span>
        </div>
        <div class="landmark-list-group">
          <button class="landmark-item-btn ${activeLandmark === 'campus' ? 'active' : ''}" data-nav="campus">
            <span>Campus Overview</span> <i class="fa-solid fa-arrow-right"></i>
          </button>
          <button class="landmark-item-btn ${activeLandmark === 'gate' ? 'active' : ''}" data-nav="gate">
            <span>Main Entrance Gate</span> <i class="fa-solid fa-arrow-right"></i>
          </button>
          <button class="landmark-item-btn ${activeLandmark === 'corridor' ? 'active' : ''}" data-nav="corridor">
            <span>Infinite Corridor</span> <i class="fa-solid fa-arrow-right"></i>
          </button>
          <button class="landmark-item-btn ${activeLandmark === 'convo' ? 'active' : ''}" data-nav="convo">
            <span>Convocation Hall</span> <i class="fa-solid fa-arrow-right"></i>
          </button>
          <button class="landmark-item-btn ${activeLandmark === 'sac' ? 'active' : ''}" data-nav="sac">
            <span>Student Activity Center</span> <i class="fa-solid fa-arrow-right"></i>
          </button>
          <button class="landmark-item-btn ${activeLandmark === 'gym' ? 'active' : ''}" data-nav="gym">
            <span>Gymkhana Complex</span> <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  } 
  
  else if (tabId === 'navigation') {
    html = `
      <div class="nav-presets animate-in">
        <h1 class="panel-title">Camera Angles</h1>
        <p class="panel-description">Quickly transition the lens to predefined visual angles across the campus.</p>
        
        ${Object.keys(cameraPresets).map(key => {
          const preset = cameraPresets[key];
          return `
            <div class="nav-card" data-preset="${key}">
              <i class="fa-solid fa-video"></i>
              <div class="nav-info">
                <span class="nav-name">${preset.label}</span>
                <span class="nav-desc">${preset.desc}</span>
              </div>
            </div>
          `;
        }).join('')}

        <div class="tour-routes-section">
          <h1 class="panel-title" style="font-size: 20px;">Guided Tour Trails</h1>
          <p class="panel-description">Sit back and experience an automated fly-through showing key highlights.</p>
          
          ${Object.keys(tourTrails).map(key => {
            const tour = tourTrails[key];
            const isActive = activeTour === key ? 'active' : '';
            return `
              <div class="tour-card ${isActive}" data-tour="${key}">
                <i class="fa-solid fa-circle-play"></i>
                <div class="tour-info">
                  <span class="tour-name">${tour.label}</span>
                  <span class="tour-path">${tour.pathStr}</span>
                  <span class="nav-desc" style="margin-top: 4px;">${tour.desc}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  else if (tabId === 'timeline') {
    const allScheduleItems = [];
    Object.keys(landmarkData).forEach(landmarkId => {
      const landmark = landmarkData[landmarkId];
      landmark.schedule.forEach(item => {
        allScheduleItems.push({
          ...item,
          landmarkId: landmarkId
        });
      });
    });
    
    const sortedSchedule = allScheduleItems.sort((a, b) => {
      const dayA = parseInt(a.day.replace("Day ", ""));
      const dayB = parseInt(b.day.replace("Day ", ""));
      if (dayA !== dayB) return dayA - dayB;
      
      const timeToMin = (tStr) => {
        const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return 0;
        let hrs = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hrs < 12) hrs += 12;
        if (ampm === 'AM' && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
      };
      
      return timeToMin(a.time) - timeToMin(b.time);
    });

    html = `
      <div class="timeline-tab animate-in">
        <h1 class="panel-title">Environmental Controls</h1>
        <p class="panel-description">Manage real-time digital twin variables and cycles.</p>
        
        <div class="sim-controls">
          <div class="control-group">
            <div class="control-label">
              <span>Day / Night Cycle</span>
              <span id="theme-lbl">${isNight ? "Night Mode" : "Day Mode"}</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="theme-toggle-check" ${isNight ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
          </div>

          <div class="control-group">
            <div class="control-label">
              <span>DNA Rotation Rate</span>
              <span id="dna-rate-lbl">${dnaSpeedMult.toFixed(1)}x</span>
            </div>
            <input type="range" id="dna-speed-range" min="0" max="3" step="0.1" value="${dnaSpeedMult}" class="range-slider">
          </div>

          <div class="control-group">
            <div class="control-label">
              <span>Solar Grid Storage</span>
              <span id="solar-intensity-lbl">${Math.round(solarIntensityFactor * 100)}%</span>
            </div>
            <input type="range" id="solar-intensity-range" min="10" max="150" step="5" value="${Math.round(solarIntensityFactor * 100)}" class="range-slider">
          </div>
        </div>

        <div class="log-panel-header">
          <span>TECHFEST EVENT SCHEDULE</span>
        </div>
        <div class="schedule-list">
          ${sortedSchedule.map(s => `
            <div class="schedule-item" data-landmark="${s.landmarkId}">
              <div class="schedule-time-box">
                <span class="schedule-day">${s.day}</span>
                <span class="schedule-time">${s.time}</span>
              </div>
              <div class="schedule-details">
                <span class="schedule-title">${s.title}</span>
                <span class="schedule-venue"><i class="fa-solid fa-location-dot"></i> ${s.venue}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="log-panel-header">
          <span>LIVE TRACKING FEED</span>
          <span class="live-indicator">LIVE</span>
        </div>
        <div class="log-container" id="timeline-logs">
          <!-- Populated from simulationLogs array -->
        </div>
      </div>
    `;
  }
  
  else if (tabId === 'sustainability') {
    html = `
      <div class="sustain-tab animate-in">
        <h1 class="panel-title">Festival Statistics</h1>
        <p class="panel-description">Aggregated metrics showcasing real-time visitor attendance, innovation counts, and carbon offsets.</p>
        
        <div class="sustain-totals">
          <div class="total-eco-card">
            <i class="fa-solid fa-users" style="color: var(--accent); background: rgba(34, 211, 238, 0.08);"></i>
            <div class="total-eco-info">
              <span class="total-eco-num" id="stats-visitor-num">${totalVisitors}</span>
              <span class="total-eco-lbl">Simulated Delegates</span>
            </div>
          </div>

          <div class="total-eco-card delay-1">
            <i class="fa-solid fa-laptop-code" style="color: var(--accent); background: rgba(34, 211, 238, 0.08);"></i>
            <div class="total-eco-info">
              <span class="total-eco-num">175,000+</span>
              <span class="total-eco-lbl">Festival Registrations</span>
            </div>
          </div>

          <div class="total-eco-card delay-2">
            <i class="fa-solid fa-trophy" style="color: var(--accent); background: rgba(34, 211, 238, 0.08);"></i>
            <div class="total-eco-info">
              <span class="total-eco-num">₹5,000,000</span>
              <span class="total-eco-lbl">Competition Prize Pool</span>
            </div>
          </div>

          <div class="total-eco-card delay-3">
            <i class="fa-solid fa-solar-panel"></i>
            <div class="total-eco-info">
              <span class="total-eco-num" id="sustain-solar-num">${1420 + Math.floor(totalVisitors * 0.4)} kWh</span>
              <span class="total-eco-lbl">Solar Energy Generated</span>
            </div>
          </div>

          <div class="total-eco-card delay-4" style="animation-delay: 0.32s;">
            <i class="fa-solid fa-droplet"></i>
            <div class="total-eco-info">
              <span class="total-eco-num">12,480 L</span>
              <span class="total-eco-lbl">Greywater Recycled</span>
            </div>
          </div>

          <div class="total-eco-card delay-5" style="animation-delay: 0.40s;">
            <i class="fa-solid fa-tree"></i>
            <div class="total-eco-info">
              <span class="total-eco-num">56.4 Tons</span>
              <span class="total-eco-lbl">Carbon Offsets achieved</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  tabContent.innerHTML = html;
  
  // Attach event handlers inside injected DOM
  attachTabEvents();
}

// Attach event listeners to buttons loaded dynamically inside tab panel
function attachTabEvents() {
  // 1. Handle sub landmark list button clicks (Landmarks Tab)
  const navBtns = tabContent.querySelectorAll('.landmark-item-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-nav');
      selectLandmark(targetId);
    });
    btn.addEventListener('mouseenter', () => {
      playHover();
    });
  });
  
  // Handle sub-tab button clicks (highlights/schedule/eco) inside active landmark card
  const subTabBtns = tabContent.querySelectorAll('.sub-tab-btn');
  subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeSubTab = btn.getAttribute('data-subtab');
      playClick();
      switchTab('landmarks');
    });
    btn.addEventListener('mouseenter', () => {
      playHover();
    });
  });
  
  // Set widths for rating fill bars (Landmarks Tab)
  setTimeout(() => {
    const bars = tabContent.querySelectorAll('.metric-fill');
    bars.forEach(bar => {
      const val = bar.getAttribute('data-value');
      bar.style.width = `${val}%`;
    });
  }, 50);

  // 2. Handle camera preset clicks (Navigation Tab)
  const presetCards = tabContent.querySelectorAll('.nav-card');
  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      const presetId = card.getAttribute('data-preset');
      if (tourTimeline) {
        tourTimeline.kill();
        activeTour = null;
      }
      triggerCameraPreset(presetId);
    });
    card.addEventListener('mouseenter', () => {
      playHover();
    });
  });

  // Handle guided tour trail clicks
  const tourCards = tabContent.querySelectorAll('.tour-card');
  tourCards.forEach(card => {
    card.addEventListener('click', () => {
      const tourId = card.getAttribute('data-tour');
      startTourTrail(tourId);
    });
    card.addEventListener('mouseenter', () => {
      playHover();
    });
  });

  // 3. Handle schedule clicks (Timeline Tab / Landmarks subtab)
  const schedItems = tabContent.querySelectorAll('.schedule-item');
  schedItems.forEach(item => {
    item.addEventListener('click', () => {
      const landmarkId = item.getAttribute('data-landmark');
      selectLandmark(landmarkId);
    });
    item.addEventListener('mouseenter', () => {
      playHover();
    });
  });

  // 4. Handle simulation sliders and checks (Timeline Tab)
  const themeCheck = document.getElementById('theme-toggle-check');
  if (themeCheck) {
    themeCheck.addEventListener('change', (e) => {
      playClick();
      isNight = e.target.checked;
      const themeLbl = document.getElementById('theme-lbl');
      if (themeLbl) themeLbl.textContent = isNight ? "Night Mode" : "Day Mode";
      toggleDayNightMode(isNight);
    });
  }

  const speedSlider = document.getElementById('dna-speed-range');
  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      dnaSpeedMult = parseFloat(e.target.value);
      const speedLbl = document.getElementById('dna-rate-lbl');
      if (speedLbl) speedLbl.textContent = `${dnaSpeedMult.toFixed(1)}x`;
    });
  }

  const solarSlider = document.getElementById('solar-intensity-range');
  if (solarSlider) {
    solarSlider.addEventListener('input', (e) => {
      solarIntensityFactor = parseFloat(e.target.value) / 100;
      const intensityLbl = document.getElementById('solar-intensity-lbl');
      if (intensityLbl) intensityLbl.textContent = `${e.target.value}%`;
      
      if (!isNight) {
        gsap.to(dirLight, { intensity: 1.45 * solarIntensityFactor, duration: 0.15 });
      }
    });
    solarSlider.addEventListener('change', () => {
      playClick();
      showToast(`Solar grid charge intensity set to ${Math.round(solarIntensityFactor*100)}%`, 'blue');
      logEvent(`Solar grid yield factor modified to ${Math.round(solarIntensityFactor*100)}%.`);
    });
  }

  // Load timeline logs history on draw
  const logEl = document.getElementById('timeline-logs');
  if (logEl) {
    logEl.innerHTML = simulationLogs.map(log => {
      const match = log.match(/^\[(.*?)\] (.*)$/);
      if (match) {
        return `<div class="log-entry"><span class="log-time">[${match[1]}]</span>${match[2]}</div>`;
      }
      return `<div class="log-entry">${log}</div>`;
    }).join('');
  }
}

// --- Select Landmark Flight ---
function selectLandmark(landmarkId) {
  if (landmarkId === activeLandmark && activeTab === 'landmarks') return;
  
  if (introComplete) {
    playClick();
  }
  
  activeLandmark = landmarkId;

  // Reset active sub-tab for clean landmark entry
  activeSubTab = 'highlights';

  // Fly Camera to view frame
  const view = cameraViews[landmarkId];
  if (view && introComplete) {
    controls.enabled = false;
    
    // Kill existing active camera tweens to prevent fighting
    if (cameraTween) cameraTween.kill();
    if (targetTween) targetTween.kill();
    
    // Fly Camera position
    cameraTween = gsap.to(camera.position, {
      x: view.cam.x,
      y: view.cam.y,
      z: view.cam.z,
      duration: 2.0,
      ease: "power2.inOut",
      onUpdate: () => {
        controls.update();
      }
    });

    // Fly OrbitControls focus target
    targetTween = gsap.to(controls.target, {
      x: view.target.x,
      y: view.target.y,
      z: view.target.z,
      duration: 2.0,
      ease: "power2.inOut",
      onUpdate: () => {
        controls.update();
      },
      onComplete: () => {
        controls.enabled = true;
      }
    });
  }

  // Update HUD
  const name = landmarkData[landmarkId].title;
  document.getElementById('hud-landmark').textContent = landmarkId === 'campus' ? 'Overview' : name;

  // Redraw tab panel if on landmarks view
  if (activeTab === 'landmarks') {
    switchTab('landmarks');
  }
}

// --- Camera Preset Flight ---
function triggerCameraPreset(presetId) {
  const preset = cameraPresets[presetId];
  if (!preset || !introComplete) return;

  playClick();
  controls.enabled = false;

  // Kill existing active camera tweens
  if (cameraTween) cameraTween.kill();
  if (targetTween) targetTween.kill();

  cameraTween = gsap.to(camera.position, {
    x: preset.cam.x,
    y: preset.cam.y,
    z: preset.cam.z,
    duration: 2.2,
    ease: "power2.inOut",
    onUpdate: () => {
      controls.update();
    }
  });

  targetTween = gsap.to(controls.target, {
    x: preset.target.x,
    y: preset.target.y,
    z: preset.target.z,
    duration: 2.2,
    ease: "power2.inOut",
    onUpdate: () => {
      controls.update();
    },
    onComplete: () => {
      controls.enabled = true;
    }
  });

  showToast(`Navigated to: ${preset.label}`, 'blue');
  logEvent(`Camera repositioned to ${preset.label} view.`);
}

// --- Dynamic Toast Notifications ---
function showToast(message, category = 'green') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  // Custom theme colors for categories
  let iconClass = 'fa-solid fa-circle-check';
  if (category === 'blue') {
    toast.classList.add('toast-blue');
    iconClass = 'fa-solid fa-circle-info';
  } else if (category === 'international') {
    toast.style.borderLeftColor = 'var(--international)';
    iconClass = 'fa-solid fa-globe';
  } else if (category === 'organizer') {
    toast.style.borderLeftColor = 'var(--organizer)';
    iconClass = 'fa-solid fa-address-card';
  } else if (category === 'media') {
    toast.style.borderLeftColor = 'var(--media)';
    iconClass = 'fa-solid fa-camera';
  }
  
  toast.innerHTML = `<i class="${iconClass}"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  
  // Automatically decay and slide out after 4 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      toast.remove();
    }, 450);
  }, 4000);
}

// --- Toggle Day / Night lighting and styling ---
function toggleDayNightMode(night) {
  const duration = 1.8;
  const ease = "power2.out";
  
  // Safe color references for Fog color animation
  const targetFogColor = new THREE.Color(night ? 0x030705 : 0x0a100c);
  
  if (night) {
    // 1. Night transition
    gsap.to(scene.background, { r: 3/255, g: 7/255, b: 5/255, duration, ease });
    gsap.to(scene.fog.color, { r: targetFogColor.r, g: targetFogColor.g, b: targetFogColor.b, duration, ease });
    gsap.to(scene.fog, { density: 0.0055, duration, ease });
    
    // 2. Lights (moonlight blue)
    gsap.to(dirLight, { intensity: 0.04, duration, ease });
    gsap.to(dirLight.color, { r: 110/255, g: 140/255, b: 240/255, duration, ease });
    gsap.to(ambientLight, { intensity: 0.12, duration, ease });
    gsap.to(ambientLight.color, { r: 25/255, g: 35/255, b: 70/255, duration, ease });
    
    // 3. DNA base spotlights on
    gsap.to(dnaSpotlight1, { intensity: 8.0, duration, ease });
    gsap.to(dnaSpotlight2, { intensity: 8.0, duration, ease });
    
    // 4. Glow up DNA helix nodes base factor
    gsap.to(simConfig, { dnaBaseEmissive: 1.6, duration, ease });
    
    // 5. Fade in stars
    gsap.to(stars.material, { opacity: 0.85, duration, ease });
    
    // 6. Deep blue river
    gsap.to(water.material.color, { r: 0/255, g: 45/255, b: 40/255, duration, ease });
    
    // 7. Transition lasers and drones searchlights
    lasers.forEach((laser, idx) => {
      const glow = laser.getObjectByName("LaserGlow");
      if (glow) {
        gsap.to(glow.material, { opacity: 0.40, duration, ease });
      }
    });
    
    drones.forEach(drone => {
      const beam = drone.getObjectByName("SearchlightBeam");
      if (beam) {
        gsap.to(beam.material, { opacity: 0.22, duration, ease });
      }
    });

    showToast("Night Cycle activated. Laser spectacle online.", "blue");
    logEvent("Grid shifted to Night cycle. Moonlight active.");
    
  } else {
    // 1. Day transition
    gsap.to(scene.background, { r: 10/255, g: 16/255, b: 12/255, duration, ease });
    gsap.to(scene.fog.color, { r: targetFogColor.r, g: targetFogColor.g, b: targetFogColor.b, duration, ease });
    gsap.to(scene.fog, { density: 0.0035, duration, ease });
    
    // 2. Sun lights
    gsap.to(dirLight, { intensity: 1.45 * solarIntensityFactor, duration, ease });
    gsap.to(dirLight.color, { r: 254/255, g: 240/255, b: 138/255, duration, ease });
    gsap.to(ambientLight, { intensity: 0.65, duration, ease });
    gsap.to(ambientLight.color, { r: 220/255, g: 252/255, b: 231/255, duration, ease });
    
    // 3. Spotlights off
    gsap.to(dnaSpotlight1, { intensity: 0.1, duration, ease });
    gsap.to(dnaSpotlight2, { intensity: 0.1, duration, ease });
    
    // 4. Dim DNA glow base factor
    gsap.to(simConfig, { dnaBaseEmissive: 0.55, duration, ease });
    
    // 5. Hide stars
    gsap.to(stars.material, { opacity: 0, duration, ease });
    
    // 6. Teal water
    gsap.to(water.material.color, { r: 0/255, g: 128/255, b: 128/255, duration, ease });
    
    // 7. Transition lasers and drones searchlights off
    lasers.forEach((laser, idx) => {
      const glow = laser.getObjectByName("LaserGlow");
      if (glow) {
        gsap.to(glow.material, { opacity: 0.0, duration, ease });
      }
    });
    
    drones.forEach(drone => {
      const beam = drone.getObjectByName("SearchlightBeam");
      if (beam) {
        gsap.to(beam.material, { opacity: 0.0, duration, ease });
      }
    });

    showToast("Day Cycle activated. Solar arrays online.", "green");
    logEvent("Grid shifted to Day cycle. Solar harvest initialized.");
  }
}

// --- Window Resize ---
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Raycasting Pointer Hover ---
function onPointerMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Mouse 3D intersection for spore scattering
  raycaster.setFromCamera(mouse, camera);
  const targetPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5); // horizontal plane at y=5
  const intersectPoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(targetPlane, intersectPoint)) {
    mouse3D.copy(intersectPoint);
  }
  
  // Test intersections against building meshes for hover
  const intersects = raycaster.intersectObjects(buildings, true);
  
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !obj.userData.isLandmark) {
      obj = obj.parent;
    }
    
    if (obj && obj.userData.isLandmark) {
      if (hoveredBuilding !== obj) {
        hoveredBuilding = obj;
        document.body.style.cursor = 'pointer';
        playHover();
        
        // Show tooltip
        tooltip.textContent = obj.name;
        tooltip.style.opacity = '1';
      }
      
      tooltip.style.left = `${event.clientX}px`;
      tooltip.style.top = `${event.clientY}px`;
      tooltip.style.transform = `translate(-50%, -130%) scale(1)`;
      return;
    }
  }
  
  // Clear hover state
  if (hoveredBuilding) {
    hoveredBuilding = null;
    document.body.style.cursor = 'default';
    tooltip.style.opacity = '0';
    tooltip.style.transform = `translate(-50%, -120%) scale(0.9)`;
  }
}

// --- Raycasting Building Click ---
function onSceneClick() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(buildings, true);
  
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !obj.userData.isLandmark) {
      obj = obj.parent;
    }
    
    if (obj && obj.userData.isLandmark) {
      const landmarkId = obj.userData.landmarkId;
      selectLandmark(landmarkId);
    }
  }
}

// --- Render/Animation Loop ---
const clock = new THREE.Clock();
const tempV = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  
  const time = clock.getElapsedTime();
  const delta = clock.getDelta(); // time elapsed since last frame
  
  // 1. Water waves
  if (water) {
    updateWaterWaves(water, time);
  }
  
  // 2. DNA helix rotation and glow pulse
  if (dnaSculpture) {
    const helix = dnaSculpture.getObjectByName("HelixModel");
    if (helix) {
      helix.rotation.y = time * 0.45 * dnaSpeedMult;
      const pulse = 1.0 + Math.sin(time * 2.5) * 0.25;
      helix.traverse(child => {
        if (child.isMesh && child.material.emissive) {
          child.material.emissiveIntensity = simConfig.dnaBaseEmissive * pulse;
        }
      });
    }
  }
  
  // 3. Spore Particles updates (drift and mouse repulsion)
  if (sporesMesh) {
    const posAttr = sporesGeometry.attributes.position;
    const positions = posAttr.array;
    
    for (let i = 0; i < SPORES_COUNT; i++) {
      const i3 = i * 3;
      const phase = sporePhases[i];
      
      const homeX = sporeHomes[i3];
      const homeY = sporeHomes[i3 + 1];
      const homeZ = sporeHomes[i3 + 2];
      
      // Floating wind drift
      const driftX = Math.sin(time * 0.45 + phase) * 1.6;
      const driftY = Math.cos(time * 0.7 + phase) * 1.3;
      const driftZ = Math.sin(time * 0.35 - phase) * 1.6;
      
      const targetX = homeX + driftX;
      const targetY = homeY + driftY;
      const targetZ = homeZ + driftZ;
      
      // Proximity to mouse3D intersection
      const dx = positions[i3] - mouse3D.x;
      const dy = positions[i3 + 1] - mouse3D.y;
      const dz = positions[i3 + 2] - mouse3D.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (dist < 15) {
        // Push particles away
        const force = (15 - dist) / 15 * 0.35;
        sporeVelocities[i3] += (dx / dist) * force;
        sporeVelocities[i3 + 1] += (dy / dist) * force * 0.25; // less vertical repulsion
        sporeVelocities[i3 + 2] += (dz / dist) * force;
      }
      
      // Apply velocity
      positions[i3] += sporeVelocities[i3];
      positions[i3 + 1] += sporeVelocities[i3 + 1];
      positions[i3 + 2] += sporeVelocities[i3 + 2];
      
      // Decay velocity (friction)
      sporeVelocities[i3] *= 0.93;
      sporeVelocities[i3 + 1] *= 0.93;
      sporeVelocities[i3 + 2] *= 0.93;
      
      // Elastic pull back to reference drift coordinate
      positions[i3] += (targetX - positions[i3]) * 0.05;
      positions[i3 + 1] += (targetY - positions[i3 + 1]) * 0.05;
      positions[i3 + 2] += (targetZ - positions[i3 + 2]) * 0.05;
    }
    
    posAttr.needsUpdate = true;
  }
  
  // 4. Star rotation in night mode
  if (stars && isNight) {
    stars.rotation.y = time * 0.005;
  }
  
  // 4.1 Update Drones (hovering & rotors & laser sweeps)
  drones.forEach((drone, idx) => {
    const data = drone.userData;
    drone.position.y = data.startY + Math.sin(time * 1.5 + idx) * 0.8;
    drone.rotation.y = time * 0.15 + idx;
    
    for (let r = 1; r <= 4; r++) {
      const rotor = drone.getObjectByName(`Rotor${r}`);
      if (rotor) {
        rotor.rotation.y += 0.8;
      }
    }

    const beam = drone.getObjectByName("SearchlightBeam");
    if (beam && isNight) {
      beam.rotation.x = Math.sin(time * 0.8 + idx) * 0.15;
      beam.rotation.z = Math.cos(time * 0.8 + idx) * 0.15;
    }
  });

  // 4.2 Update Robots (patrol movement)
  robots.forEach(robot => {
    const data = robot.userData;
    const offset = Math.sin(time * data.speed + data.phase);
    
    if (data.rangeX > 0) {
      robot.position.x = data.startX + offset * data.rangeX;
      robot.rotation.y = offset > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else if (data.rangeZ > 0) {
      robot.position.z = data.startZ + offset * data.rangeZ;
      robot.rotation.y = offset > 0 ? 0 : Math.PI;
    }
  });

  // 4.3 Update Laser Searchlights in Night Mode
  lasers.forEach((laser, idx) => {
    const glow = laser.getObjectByName("LaserGlow");
    if (glow && isNight) {
      if (idx < 2) {
        laser.rotation.x = Math.sin(time * 0.6 + idx) * 0.25;
        laser.rotation.z = Math.cos(time * 0.6 + idx) * 0.25;
      } else {
        laser.rotation.x = Math.sin(time * 0.3) * 0.05;
        laser.rotation.z = Math.cos(time * 0.3) * 0.05;
      }
    }
  });

  // 5. Update controls
  controls.update();
  
  // 6. Project 3D delegate coordinates to 2D HTML badges
  delegates.forEach(d => {
    if (!d.isActive) return;
    d.mesh.getWorldPosition(tempV);
    
    // Project to NDC [-1, 1] screen coordinates
    tempV.project(camera);
    
    // If behind camera frustum, hide badge
    if (tempV.z > 1) {
      d.badgeEl.style.opacity = '0';
    } else {
      const dist = camera.position.distanceTo(d.mesh.position);
      // Fade out badge if camera is too far away to keep screen clean
      if (dist > 150) {
        d.badgeEl.style.opacity = '0';
      } else {
        d.badgeEl.style.opacity = '0.9';
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;
        d.badgeEl.style.left = `${x}px`;
        d.badgeEl.style.top = `${y - 18}px`; // position slightly above capsule
      }
    }
  });
  
  // 7. Calculate and display FPS (performance)
  frameCount++;
  const timestamp = (performance || Date).now();
  if (timestamp >= lastFpsUpdate + 1000) {
    fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
    document.getElementById('hud-fps').textContent = `${fps} FPS`;
    frameCount = 0;
    lastFpsUpdate = timestamp;
  }
  
  // 8. Dynamic visitor counter tick
  if (timestamp >= lastVisitorTick + 3200 && introComplete) {
    totalVisitors += Math.floor(Math.random() * 4) + 1;
    document.getElementById('hud-visitors').textContent = totalVisitors;
    
    // Dynamically increment solar harvest number in Sustainability Tab
    const solarNum = document.getElementById('sustain-solar-num');
    if (solarNum) {
      const solarYield = 1420 + Math.floor(totalVisitors * 0.4);
      solarNum.textContent = `${solarYield} kWh`;
    }
    
    lastVisitorTick = timestamp;
  }
  
  // 9. Render Scene
  renderer.render(scene, camera);
}

// Initialize and start loop
init();
animate();
