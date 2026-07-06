import * as THREE from 'three';

// Low-poly color palette (Sustainable Green Theme)
export const PALETTE = {
  grassDark: 0x1e3f20,
  grassMedium: 0x2e7d32,
  grassLight: 0x4caf50,
  grassSage: 0x8fbc8f,
  water: 0x008080, // Teal
  waterNight: 0x004d40, // Deep teal
  road: 0xd7ccc8, // Sand/concrete warm grey
  trunk: 0x5d4037, // Brown
  leavesDark: 0x1b5e20,
  leavesMedium: 0x2e7d32,
  leavesLight: 0x66bb6a,
  leavesYellow: 0x9ccc65,
  concrete: 0xf5f5f5,
  concreteDark: 0xe0e0e0,
  glass: 0xa7f3d0, // Translucent mint
  glassDark: 0x047857,
  solarBlue: 0x0f172a, // Dark blue/slate for panels
  dnaStrand1: 0x4ade80, // Glowing mint
  dnaStrand2: 0x22d3ee, // Glowing cyan
  pedestal: 0x1c1917,
  white: 0xffffff,
  yellowGlow: 0xfef08a,
  
  // Delegate glow colors
  student: 0x4ade80,       // Green
  international: 0x06b6d4, // Cyan
  organizer: 0xf59e0b,     // Gold
  media: 0xec4899          // Pink
};

// Procedural Terrain Generator
export function createTerrain() {
  const size = 240;
  const segments = 40;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  
  // Rotate to lie flat on XZ plane
  geometry.rotateX(-Math.PI / 2);
  
  const position = geometry.attributes.position;
  const colors = [];
  const colorObj = new THREE.Color();
  
  // Perturb vertices to create low-poly hills, a riverbed, and flat building pads
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    let y = 0;
    
    // Calculate distance from center
    const distFromCenter = Math.sqrt(x*x + z*z);
    
    // Riverbed logic (on the right side, x around 60 to 90)
    // We create a winding river flowing from z = -120 to z = 120
    const riverCenterX = 75 + Math.sin(z * 0.04) * 20;
    const distToRiver = Math.abs(x - riverCenterX);
    
    if (distToRiver < 25) {
      // River channel
      y = -4 + (distToRiver / 25) * 3;
      // Clamp to river bottom
      if (y < -4) y = -4;
    } else {
      // General landscape height
      // Flat central plaza
      if (distFromCenter < 35) {
        y = 0;
      } else {
        // Hills at the edges
        const noise = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 6;
        const noise2 = Math.sin(x * 0.01) * Math.sin(z * 0.01) * 12;
        y = Math.max(0, noise + noise2 - 2);
        
        // Flatten areas for specific landmarks
        // Main Gate (0, 0, 85)
        if (Math.sqrt(x*x + (z-85)*(z-85)) < 25) y = THREE.MathUtils.lerp(y, 0, 0.8);
        // Infinite Corridor (-15, 0, -45)
        if (x > -65 && x < 35 && z > -55 && z < -35) y = THREE.MathUtils.lerp(y, 0, 0.9);
        // Convocation Hall (40, 0, 30)
        if (Math.sqrt((x-40)*(x-40) + (z-30)*(z-30)) < 25) y = THREE.MathUtils.lerp(y, 0, 0.9);
        // SAC (45, 0, -30)
        if (Math.sqrt((x-45)*(x-45) + (z+30)*(z+30)) < 25) y = THREE.MathUtils.lerp(y, 0, 0.9);
        // Gymkhana (-45, 0, 45)
        if (Math.sqrt((x+45)*(x+45) + (z-45)*(z-45)) < 25) y = THREE.MathUtils.lerp(y, 0, 0.9);
      }
    }
    
    position.setY(i, y);
    
    // Assign vertex colors based on height and position for natural variation
    if (y < -2.5) {
      // River bed
      colorObj.setHex(0xc2b280); // Sand
    } else if (distFromCenter < 35) {
      colorObj.setHex(PALETTE.grassSage);
    } else {
      // Blend heights for green shading
      const heightFactor = Math.min(1, Math.max(0, y / 15));
      if (heightFactor > 0.6) {
        colorObj.setHex(PALETTE.grassLight); // Snowy/bright hills
      } else if (heightFactor > 0.2) {
        colorObj.setHex(PALETTE.grassMedium);
      } else {
        // Randomly mix medium and dark grass for low-poly texture variation
        const hash = Math.sin(x*12.7 + z*31.3);
        colorObj.setHex(hash > 0 ? PALETTE.grassDark : PALETTE.grassMedium);
      }
    }
    
    colors.push(colorObj.r, colorObj.g, colorObj.b);
  }
  
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.05
  });
  
  const terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.receiveShadow = true;
  terrainMesh.name = "Terrain";
  
  return terrainMesh;
}

// Procedural Water Generator
export function createWater() {
  // A plane that fills the river basin
  const size = 240;
  const segments = 30;
  const geometry = new THREE.PlaneGeometry(100, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  
  // Flatten water plane
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    position.setY(i, -2.4); // Water level slightly below zero
  }
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.7,
    flatShading: true
  });
  
  const waterMesh = new THREE.Mesh(geometry, material);
  waterMesh.receiveShadow = true;
  waterMesh.name = "Water";
  
  // Position water over the river basin (centered around x = 75)
  waterMesh.position.x = 75;
  
  // Save original vertices for wave animation
  waterMesh.userData = {
    originalY: Array.from(geometry.attributes.position.array).filter((_, idx) => idx % 3 === 1)
  };
  
  return waterMesh;
}

// Animate Water Waves
export function updateWaterWaves(waterMesh, time) {
  const geometry = waterMesh.geometry;
  const position = geometry.attributes.position;
  const originalY = waterMesh.userData.originalY;
  
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    // Low poly waving math
    const wave = Math.sin(time * 1.5 + x * 0.08 + z * 0.05) * 0.15 + 
                 Math.cos(time * 0.8 + x * 0.04 - z * 0.08) * 0.1;
    position.setY(i, -2.4 + wave);
  }
  
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

// Procedural Road Network
export function createRoads() {
  const roadsGroup = new THREE.Group();
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.road,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true
  });
  
  // Helper to build a road segment
  function addSegment(x, z, w, l, rotY = 0) {
    const geom = new THREE.BoxGeometry(w, 0.1, l);
    const mesh = new THREE.Mesh(geom, roadMaterial);
    mesh.position.set(x, 0.02, z); // Slightly above ground to prevent z-fighting
    mesh.rotation.y = rotY;
    mesh.receiveShadow = true;
    roadsGroup.add(mesh);
  }
  
  // 1. Central Plaza (Octagon ring road)
  const plazaGeom = new THREE.CylinderGeometry(20, 20.5, 0.1, 8);
  const plazaRing = new THREE.Mesh(plazaGeom, roadMaterial);
  plazaRing.position.set(0, 0.01, 0);
  plazaRing.receiveShadow = true;
  roadsGroup.add(plazaRing);
  
  // Inner plaza solid center
  const innerPlazaGeom = new THREE.CylinderGeometry(15, 15, 0.1, 8);
  const innerPlazaMaterial = new THREE.MeshStandardMaterial({
    color: 0xcfd8dc,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true
  });
  const innerPlaza = new THREE.Mesh(innerPlazaGeom, innerPlazaMaterial);
  innerPlaza.position.set(0, 0.015, 0);
  innerPlaza.receiveShadow = true;
  roadsGroup.add(innerPlaza);

  // 2. Main road from Gate (0, 0, 85) to Plaza (0, 0, 20)
  addSegment(0, 52.5, 4, 65);
  
  // 3. Path to Infinite Corridor: from Plaza (0, 0, -20) to Corridor entrance (0, 0, -40)
  addSegment(0, -30, 3, 20);
  addSegment(-15, -40, 40, 3); // Branch running along Corridor front
  
  // 4. Path to Convocation Hall: from Plaza (15, 0, 15) to Dome (40, 0, 30)
  // Diagonal road
  const dx = 40 - 10;
  const dz = 30 - 10;
  const angle = Math.atan2(dx, dz);
  const dist = Math.sqrt(dx*dx + dz*dz);
  addSegment(25, 20, 2.5, dist, angle);
  
  // 5. Path to SAC: from Plaza (15, 0, -15) to SAC (45, 0, -30)
  const dxSac = 45 - 10;
  const dzSac = -30 - (-10);
  const angleSac = Math.atan2(dxSac, dzSac);
  const distSac = Math.sqrt(dxSac*dxSac + dzSac*dzSac);
  addSegment(27.5, -20, 2.5, distSac, angleSac);
  
  // 6. Path to Gymkhana: from Plaza (-15, 0, 15) to Gymkhana (-45, 0, 45)
  const dxGym = -45 - (-10);
  const dzGym = 45 - 10;
  const angleGym = Math.atan2(dxGym, dzGym);
  const distGym = Math.sqrt(dxGym*dxGym + dzGym*dzGym);
  addSegment(-27.5, 27.5, 2.5, distGym, angleGym);
  
  return roadsGroup;
}

// Low-poly Tree Generator
export function createTree(type = 'pine') {
  const treeGroup = new THREE.Group();
  
  // Trunk
  const trunkGeom = new THREE.CylinderGeometry(0.12, 0.25, 1.6, 5);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: PALETTE.trunk,
    flatShading: true,
    roughness: 0.9
  });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = 0.8;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  treeGroup.add(trunk);
  
  // Leaves
  if (type === 'pine') {
    // 3 tiered cones for pine tree
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: PALETTE.leavesDark,
      flatShading: true,
      roughness: 0.8
    });
    
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 5), leafMaterial);
    cone1.position.y = 2.2;
    cone1.castShadow = true;
    treeGroup.add(cone1);
    
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 5), leafMaterial);
    cone2.position.y = 3.0;
    cone2.castShadow = true;
    treeGroup.add(cone2);
    
    const cone3 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.0, 5), leafMaterial);
    cone3.position.y = 3.7;
    cone3.castShadow = true;
    treeGroup.add(cone3);
    
  } else if (type === 'broadleaf') {
    // Interlocking icosahedrons for deciduous look
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: PALETTE.leavesMedium,
      flatShading: true,
      roughness: 0.85
    });
    
    const leaves1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), leafMaterial);
    leaves1.position.y = 2.1;
    leaves1.castShadow = true;
    treeGroup.add(leaves1);
    
    const leaves2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), new THREE.MeshStandardMaterial({
      color: PALETTE.leavesLight,
      flatShading: true,
      roughness: 0.85
    }));
    leaves2.position.set(0.4, 2.7, 0.2);
    leaves2.castShadow = true;
    treeGroup.add(leaves2);
    
    const leaves3 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({
      color: PALETTE.leavesYellow,
      flatShading: true,
      roughness: 0.85
    }));
    leaves3.position.set(-0.3, 2.8, -0.3);
    leaves3.castShadow = true;
    treeGroup.add(leaves3);
  }
  
  return treeGroup;
}

// Central DNA Sculpture
export function createDNASculpture() {
  const dnaGroup = new THREE.Group();
  dnaGroup.name = "DNASculpture";
  
  // Pedestal layers
  const baseGeom = new THREE.CylinderGeometry(7, 7.3, 0.6, 8);
  const baseMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pedestal,
    roughness: 0.9,
    metalness: 0.3,
    flatShading: true
  });
  const pedestalBase = new THREE.Mesh(baseGeom, baseMat);
  pedestalBase.position.y = 0.3;
  pedestalBase.receiveShadow = true;
  pedestalBase.castShadow = true;
  dnaGroup.add(pedestalBase);
  
  const midGeom = new THREE.CylinderGeometry(5.2, 5.5, 0.8, 8);
  const pedestalMid = new THREE.Mesh(midGeom, baseMat);
  pedestalMid.position.y = 1.0;
  pedestalMid.receiveShadow = true;
  pedestalMid.castShadow = true;
  dnaGroup.add(pedestalMid);
  
  // Glowing core collar
  const collarGeom = new THREE.CylinderGeometry(3.5, 3.7, 0.4, 8);
  const collarMat = new THREE.MeshStandardMaterial({
    color: PALETTE.dnaStrand1,
    emissive: PALETTE.dnaStrand1,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    flatShading: true
  });
  const collar = new THREE.Mesh(collarGeom, collarMat);
  collar.position.y = 1.6;
  dnaGroup.add(collar);
  
  // Double Helix Group (will spin)
  const helixGroup = new THREE.Group();
  helixGroup.name = "HelixModel";
  helixGroup.position.y = 1.8; // Align base of helix with pedestal top
  dnaGroup.add(helixGroup);
  
  // Generate double helix parameters
  const height = 18;
  const turns = 2.5;
  const radius = 2.4;
  const pointsCount = 42;
  const pitch = height / (turns * Math.PI * 2);
  
  // Materials for nucleotides & backbone
  const strand1Mat = new THREE.MeshStandardMaterial({
    color: PALETTE.dnaStrand1,
    emissive: PALETTE.dnaStrand1,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    flatShading: true
  });
  
  const strand2Mat = new THREE.MeshStandardMaterial({
    color: PALETTE.dnaStrand2,
    emissive: PALETTE.dnaStrand2,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    flatShading: true
  });
  
  const rungMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    flatShading: true
  });
  
  // Generate segments
  for (let i = 0; i <= pointsCount; i++) {
    const t = (i / pointsCount) * turns * Math.PI * 2;
    const yPos = t * pitch;
    
    // Coordinates for strand 1 and 2
    const x1 = radius * Math.sin(t);
    const z1 = radius * Math.cos(t);
    
    const x2 = -radius * Math.sin(t);
    const z2 = -radius * Math.cos(t);
    
    // Add Node 1 (Strand 1)
    const node1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), strand1Mat);
    node1.position.set(x1, yPos, z1);
    node1.castShadow = true;
    helixGroup.add(node1);
    
    // Add Node 2 (Strand 2)
    const node2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), strand2Mat);
    node2.position.set(x2, yPos, z2);
    node2.castShadow = true;
    helixGroup.add(node2);
    
    // Add connecting rung (every segment)
    // Cylinder connecting (x1, yPos, z1) to (x2, yPos, z2)
    const p1 = new THREE.Vector3(x1, yPos, z1);
    const p2 = new THREE.Vector3(x2, yPos, z2);
    const distance = p1.distanceTo(p2);
    
    const rungGeom = new THREE.CylinderGeometry(0.08, 0.08, distance, 4);
    const rung = new THREE.Mesh(rungGeom, rungMat);
    
    // Position rung at midpoint
    rung.position.set(0, yPos, 0);
    // Align cylinder (y-axis) with vector between points
    const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
    const alignAxis = new THREE.Vector3(0, 1, 0);
    rung.quaternion.setFromUnitVectors(alignAxis, direction);
    rung.castShadow = true;
    
    helixGroup.add(rung);
  }
  
  return dnaGroup;
}

// LANDMARK 1: Main Gate
export function createMainGate() {
  const gateGroup = new THREE.Group();
  gateGroup.name = "Main Gate";
  gateGroup.userData = { isLandmark: true, landmarkId: 'gate' };
  
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8, flatShading: true });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7, flatShading: true });
  const solarMat = new THREE.MeshStandardMaterial({ color: PALETTE.solarBlue, roughness: 0.2, metalness: 0.8, flatShading: true });
  
  // Left Pillar
  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), stoneMat);
  pillarL.position.set(-7, 4, 0);
  pillarL.castShadow = true;
  pillarL.receiveShadow = true;
  gateGroup.add(pillarL);
  
  // Right Pillar
  const pillarR = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), stoneMat);
  pillarR.position.set(7, 4, 0);
  pillarR.castShadow = true;
  pillarR.receiveShadow = true;
  gateGroup.add(pillarR);
  
  // Wooden crossbeam canopy (slanted design)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(18, 1, 4), woodMat);
  canopy.position.set(0, 8.2, 0);
  canopy.rotation.x = 0.05; // Slight tilt
  canopy.castShadow = true;
  gateGroup.add(canopy);
  
  // Solar Panels on Canopy
  for (let i = -7; i <= 7; i += 3.5) {
    if (i === 0) continue;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 3), solarMat);
    panel.position.set(i, 8.8, 0);
    panel.rotation.x = -0.15; // Slanted towards the sun
    panel.castShadow = true;
    gateGroup.add(panel);
  }
  
  // Welcome Sign / Graphic Emissive Leaf
  const signGeom = new THREE.BoxGeometry(6, 1.8, 0.3);
  const signMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8, flatShading: true });
  const sign = new THREE.Mesh(signGeom, signMat);
  sign.position.set(0, 6, 0);
  sign.castShadow = true;
  gateGroup.add(sign);
  
  // Emissive logo details
  const logoGeom = new THREE.IcosahedronGeometry(0.6, 0);
  const logoMat = new THREE.MeshStandardMaterial({
    color: PALETTE.dnaStrand1,
    emissive: PALETTE.dnaStrand1,
    emissiveIntensity: 0.8
  });
  const logo = new THREE.Mesh(logoGeom, logoMat);
  logo.position.set(0, 6, 0.25);
  gateGroup.add(logo);

  return gateGroup;
}

// LANDMARK 2: Infinite Corridor
export function createInfiniteCorridor() {
  const corridorGroup = new THREE.Group();
  corridorGroup.name = "Infinite Corridor";
  corridorGroup.userData = { isLandmark: true, landmarkId: 'corridor' };
  
  const stoneMat = new THREE.MeshStandardMaterial({ color: PALETTE.concrete, roughness: 0.8, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9, flatShading: true }); // Green roof
  const lightMat = new THREE.MeshStandardMaterial({
    color: PALETTE.yellowGlow,
    emissive: PALETTE.yellowGlow,
    emissiveIntensity: 0.4
  });
  
  const length = 76;
  const width = 6;
  const height = 5.5;
  const columnSpacing = 3.8;
  const numColumns = Math.floor(length / columnSpacing);
  
  // Floor plate
  const floor = new THREE.Mesh(new THREE.BoxGeometry(length, 0.3, width), stoneMat);
  floor.position.y = 0.15;
  floor.receiveShadow = true;
  corridorGroup.add(floor);
  
  // Roof plate
  const roof = new THREE.Mesh(new THREE.BoxGeometry(length + 1, 0.4, width + 1), stoneMat);
  roof.position.y = height;
  roof.castShadow = true;
  roof.receiveShadow = true;
  corridorGroup.add(roof);
  
  // Slanted green vegetated layer on top of roof
  const greenRoof = new THREE.Mesh(new THREE.BoxGeometry(length, 0.5, width - 0.5), roofMat);
  greenRoof.position.y = height + 0.35;
  greenRoof.castShadow = true;
  corridorGroup.add(greenRoof);
  
  // Columns on Front and Back
  for (let i = 0; i < numColumns; i++) {
    const xPos = -length / 2 + i * columnSpacing + columnSpacing / 2;
    
    // Front Columns
    const colF = new THREE.Mesh(new THREE.BoxGeometry(0.4, height - 0.3, 0.4), stoneMat);
    colF.position.set(xPos, height / 2 + 0.1, width / 2 - 0.3);
    colF.castShadow = true;
    colF.receiveShadow = true;
    corridorGroup.add(colF);
    
    // Back Columns
    const colB = new THREE.Mesh(new THREE.BoxGeometry(0.4, height - 0.3, 0.4), stoneMat);
    colB.position.set(xPos, height / 2 + 0.1, -width / 2 + 0.3);
    colB.castShadow = true;
    colB.receiveShadow = true;
    corridorGroup.add(colB);
    
    // Interior glowing lanterns
    if (i % 3 === 0) {
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), lightMat);
      lantern.position.set(xPos, height - 0.8, 0);
      corridorGroup.add(lantern);
    }
  }
  
  // Central arch structure/Entrance focus
  const portal = new THREE.Mesh(new THREE.BoxGeometry(6, height + 1.5, width + 1.2), stoneMat);
  portal.position.set(0, (height + 1.5)/2, 0);
  portal.castShadow = true;
  corridorGroup.add(portal);
  
  // Portal cutout (simulated by darker inner box)
  const cutoutMat = new THREE.MeshStandardMaterial({ color: 0x212529, roughness: 0.9 });
  const innerCut = new THREE.Mesh(new THREE.BoxGeometry(4, height - 0.5, width + 1.4), cutoutMat);
  innerCut.position.set(0, (height - 0.5)/2 + 0.1, 0);
  corridorGroup.add(innerCut);
  
  // Solar array at center of corridor roof
  const solarMat = new THREE.MeshStandardMaterial({ color: PALETTE.solarBlue, roughness: 0.1, metalness: 0.9 });
  const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, width - 1), solarMat);
  solarPanel.position.set(0, height + 0.7, 0);
  solarPanel.rotation.x = -0.15; // Slant
  corridorGroup.add(solarPanel);
  
  return corridorGroup;
}

// LANDMARK 3: Convocation Hall
export function createConvocationHall() {
  const convoGroup = new THREE.Group();
  convoGroup.name = "Convocation Hall";
  convoGroup.userData = { isLandmark: true, landmarkId: 'convo' };
  
  const stoneMat = new THREE.MeshStandardMaterial({ color: PALETTE.concrete, roughness: 0.8, flatShading: true });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: PALETTE.concreteDark, roughness: 0.9, flatShading: true });
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, metalness: 0.4, flatShading: true }); // Reflective dome
  const glassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.glass,
    roughness: 0.1,
    transparent: true,
    opacity: 0.6,
    flatShading: true
  });
  
  // 1. Foundation steps
  const stepsGeom = new THREE.CylinderGeometry(17, 18, 1.2, 12);
  const steps = new THREE.Mesh(stepsGeom, darkStoneMat);
  steps.position.y = 0.6;
  steps.receiveShadow = true;
  steps.castShadow = true;
  convoGroup.add(steps);
  
  // 2. Main cylindrical drum building
  const drumGeom = new THREE.CylinderGeometry(15, 15, 9, 12);
  const drum = new THREE.Mesh(drumGeom, stoneMat);
  drum.position.y = 5.7; // 1.2 + 4.5
  drum.castShadow = true;
  drum.receiveShadow = true;
  convoGroup.add(drum);
  
  // 3. Low-poly Geodesic Dome on top
  const domeGeom = new THREE.SphereGeometry(15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeom, domeMat);
  dome.position.y = 10.2; // sitting on top of drum
  dome.castShadow = true;
  convoGroup.add(dome);
  
  // Dome crown/skylight structure
  const crownGeom = new THREE.CylinderGeometry(3, 4, 1.5, 8);
  const crown = new THREE.Mesh(crownGeom, glassMat);
  crown.position.y = 25.2 - 10.2 + 0.2; // offset from center of dome sphere
  dome.add(crown);
  
  // Dome crown lid
  const lidGeom = new THREE.CylinderGeometry(3.1, 3.1, 0.3, 8);
  const lid = new THREE.Mesh(lidGeom, stoneMat);
  lid.position.y = 0.9;
  crown.add(lid);
  
  // 4. Large arched entrance portal
  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 1.2, 13.5); // Facing forward (+Z direction)
  
  const portalArch = new THREE.Mesh(new THREE.BoxGeometry(9, 7.5, 3), stoneMat);
  portalArch.position.y = 3.75;
  portalArch.castShadow = true;
  portalGroup.add(portalArch);
  
  const archWay = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 3.2), darkStoneMat);
  archWay.position.set(0, 3, 0.1);
  portalGroup.add(archWay);
  
  // Glass facade inside archway
  const portalGlass = new THREE.Mesh(new THREE.BoxGeometry(5.8, 5.8, 0.2), glassMat);
  portalGlass.position.set(0, 3, 0);
  portalGroup.add(portalGlass);
  
  // Steps leading to the arch
  for (let i = 0; i < 4; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(8 - i*0.8, 0.3, 1.2), darkStoneMat);
    step.position.set(0, 0.15 + i*0.3, 1.5 + i*0.8);
    step.receiveShadow = true;
    portalGroup.add(step);
  }
  convoGroup.add(portalGroup);
  
  // 5. Tall columns/arched window cuts around the drum
  for (let i = 1; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const xPos = Math.sin(angle) * 15.1;
    const zPos = Math.cos(angle) * 15.1;
    
    // Vertical columns adding texture
    const column = new THREE.Mesh(new THREE.BoxGeometry(1, 8.5, 0.8), darkStoneMat);
    column.position.set(xPos, 5.75, zPos);
    column.rotation.y = -angle;
    column.castShadow = true;
    convoGroup.add(column);
    
    // Windows between columns (glass cuts)
    if (i % 2 === 0) {
      const windowCut = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 0.3), glassMat);
      // Position slightly inside columns
      windowCut.position.set(xPos * 0.99, 5.5, zPos * 0.99);
      windowCut.rotation.y = -angle;
      convoGroup.add(windowCut);
    }
  }
  
  return convoGroup;
}

// LANDMARK 4: SAC (Student Activity Center)
export function createSAC() {
  const sacGroup = new THREE.Group();
  sacGroup.name = "SAC";
  sacGroup.userData = { isLandmark: true, landmarkId: 'sac' };
  
  const stoneMat = new THREE.MeshStandardMaterial({ color: PALETTE.concrete, roughness: 0.8, flatShading: true });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: PALETTE.concreteDark, roughness: 0.9, flatShading: true });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6, flatShading: true }); // Warm orange-wood
  const glassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.glass,
    roughness: 0.1,
    transparent: true,
    opacity: 0.6,
    flatShading: true
  });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9, flatShading: true });
  
  // Main building body 1 (Flat box)
  const body1 = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 14), stoneMat);
  body1.position.set(-2, 2.5, 0);
  body1.castShadow = true;
  body1.receiveShadow = true;
  sacGroup.add(body1);
  
  // Asymmetrical modern angled roof block
  const roofBlockGeom = new THREE.BoxGeometry(14, 5, 13);
  // Slant geometry vertices slightly to make it wedge-shaped
  const posAttr = roofBlockGeom.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    if (y > 0) {
      posAttr.setY(i, y + (x * 0.2));
    }
  }
  roofBlockGeom.computeVertexNormals();
  
  const body2 = new THREE.Mesh(roofBlockGeom, woodMat);
  body2.position.set(5, 6, -0.5);
  body2.castShadow = true;
  sacGroup.add(body2);
  
  // Giant angled glass facade (at the front of the slanted block)
  const glassFacade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.5, 11), glassMat);
  glassFacade.position.set(11.8, 6.2, -0.5);
  glassFacade.rotation.y = 0.05; // Slight angle
  glassFacade.rotation.z = 0.1;
  sacGroup.add(glassFacade);
  
  // Stepped green roof terrace on body1
  const greenTerrace = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 10), grassMat);
  greenTerrace.position.set(-3, 5.2, 0);
  greenTerrace.castShadow = true;
  sacGroup.add(greenTerrace);
  
  // Mini low-poly swimming pool/water feature next to SAC
  const poolGroup = new THREE.Group();
  poolGroup.position.set(-6, 0.02, 11);
  
  // Pool frame
  const poolFrame = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 6), darkStoneMat);
  poolFrame.receiveShadow = true;
  poolGroup.add(poolFrame);
  
  // Pool water
  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.8
  });
  const poolWater = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.25, 5.2), poolWaterMat);
  poolWater.position.y = 0.05;
  poolGroup.add(poolWater);
  
  sacGroup.add(poolGroup);
  
  return sacGroup;
}

// LANDMARK 5: Gymkhana
export function createGymkhana() {
  const gymGroup = new THREE.Group();
  gymGroup.name = "Gymkhana";
  gymGroup.userData = { isLandmark: true, landmarkId: 'gym' };
  
  const stoneMat = new THREE.MeshStandardMaterial({ color: PALETTE.concrete, roughness: 0.8, flatShading: true });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7, flatShading: true }); // Forest green
  const glassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.glass,
    roughness: 0.1,
    transparent: true,
    opacity: 0.6,
    flatShading: true
  });
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.9, flatShading: true }); // Terracotta red
  const trackLineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  
  // Main athletic hall (large box)
  const hall = new THREE.Mesh(new THREE.BoxGeometry(22, 9, 14), stoneMat);
  hall.position.y = 4.5;
  hall.castShadow = true;
  hall.receiveShadow = true;
  gymGroup.add(hall);
  
  // Facade windows
  const windowsF = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 0.3), glassMat);
  windowsF.position.set(0, 5, 7.05);
  gymGroup.add(windowsF);
  
  // Curved barrel canopy roof
  const canopyGeom = new THREE.CylinderGeometry(11, 11, 23, 8, 1, false, 0, Math.PI);
  const canopy = new THREE.Mesh(canopyGeom, canopyMat);
  canopy.position.set(0, 8.8, 0);
  canopy.rotation.z = -Math.PI / 2; // Lie flat across length
  canopy.rotation.x = -Math.PI / 2;
  canopy.castShadow = true;
  gymGroup.add(canopy);
  
  // Ribs
  for (let i = -10.5; i <= 10.5; i += 7) {
    const ribGeom = new THREE.CylinderGeometry(11.2, 11.2, 0.6, 8, 1, false, 0, Math.PI);
    const rib = new THREE.Mesh(ribGeom, stoneMat);
    rib.position.set(0, 8.8, i);
    rib.rotation.z = -Math.PI / 2;
    rib.rotation.x = -Math.PI / 2;
    rib.castShadow = true;
    gymGroup.add(rib);
  }
  
  // Entrance steps
  const steps = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 2), stoneMat);
  steps.position.set(0, 0.4, 8);
  steps.receiveShadow = true;
  gymGroup.add(steps);
  
  // Running track
  const trackGroup = new THREE.Group();
  trackGroup.position.set(-18, 0.015, 0);
  
  // Red track ground
  const track = new THREE.Mesh(new THREE.BoxGeometry(10, 0.05, 20), trackMat);
  track.receiveShadow = true;
  trackGroup.add(track);
  
  // White track lanes
  for (let offset = -4; offset <= 4; offset += 2) {
    const lane = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 19.6), trackLineMat);
    lane.position.x = offset;
    trackGroup.add(lane);
  }
  
  gymGroup.add(trackGroup);
  
  return gymGroup;
}

// DELEGATE CREATOR: Glowing low-poly capsules
export function createDelegateMesh(category) {
  const delegateGroup = new THREE.Group();
  delegateGroup.name = `Delegate (${category})`;
  
  // Select color based on category
  const glowColor = PALETTE[category] || PALETTE.student;
  
  // Glowing capsule geometry
  // CapsuleGeometry(radius, length, capSubdivisions, radialSegments)
  const capsuleGeom = new THREE.CapsuleGeometry(0.24, 0.58, 3, 6);
  const capsuleMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    flatShading: true
  });
  
  const capsule = new THREE.Mesh(capsuleGeom, capsuleMat);
  capsule.position.y = 0.54; // Float slightly above ground level
  capsule.castShadow = true;
  delegateGroup.add(capsule);
  
  // Add a futuristic waist ring representing delegate tech badges
  const ringGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 6);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x18181b, // Slate black metal
    roughness: 0.5,
    metalness: 0.8
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.y = 0.54;
  capsule.add(ring);
  
  return delegateGroup;
}

// IN-MEMORY CANVAS TEXTURE GENERATOR FOR SPORES
export function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  
  const ctx = canvas.getContext('2d');
  
  // Radial glow gradient
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, 'rgba(167, 243, 208, 1)'); // Mint center
  gradient.addColorStop(0.25, 'rgba(74, 222, 128, 0.8)'); // Light green
  gradient.addColorStop(0.55, 'rgba(22, 101, 52, 0.3)'); // Forest dim
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent edge
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// --- DRONE CREATOR ---
export function createDroneModel() {
  const drone = new THREE.Group();
  drone.name = "Drone";
  
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2, flatShading: true });
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.1 });
  const rotorMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.8 });
  const glowMat = new THREE.MeshStandardMaterial({ color: PALETTE.dnaStrand2, emissive: PALETTE.dnaStrand2, emissiveIntensity: 1.0 });
  
  // Center body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), bodyMat);
  body.castShadow = true;
  drone.add(body);
  
  // Status glow indicator
  const statusGlow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4), glowMat);
  statusGlow.position.y = 0.08;
  drone.add(statusGlow);
  
  // Four arms
  const armLength = 0.8;
  const armW = 0.06;
  const armH = 0.04;
  
  const armPositions = [
    { x: 0.35, z: 0.35, rotY: -Math.PI / 4 },
    { x: -0.35, z: 0.35, rotY: Math.PI / 4 },
    { x: 0.35, z: -0.35, rotY: Math.PI / 4 },
    { x: -0.35, z: -0.35, rotY: -Math.PI / 4 }
  ];
  
  armPositions.forEach((pos, idx) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, armLength), bodyMat);
    arm.position.set(pos.x / 2, 0, pos.z / 2);
    arm.rotation.y = pos.rotY;
    arm.castShadow = true;
    drone.add(arm);
    
    // Motor at the end
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 5), motorMat);
    motor.position.set(pos.x, 0.06, pos.z);
    motor.castShadow = true;
    drone.add(motor);
    
    // Rotor blade
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.01, 0.06), rotorMat);
    rotor.position.set(pos.x, 0.14, pos.z);
    rotor.name = `Rotor${idx + 1}`;
    rotor.castShadow = true;
    drone.add(rotor);
  });
  
  // Add searchlight beam mesh (hidden by default, shown in Night Mode)
  const beamGeom = new THREE.CylinderGeometry(0.05, 3.5, 15, 8, 1, true);
  beamGeom.translate(0, -7.5, 0); // Offset geometry so origin is at top of cone
  
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.0, // Controlled dynamically
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  
  const searchlightBeam = new THREE.Mesh(beamGeom, beamMat);
  searchlightBeam.position.y = -0.1;
  searchlightBeam.name = "SearchlightBeam";
  drone.add(searchlightBeam);
  
  return drone;
}

// --- ROBOT CREATOR ---
export function createRobotModel() {
  const robot = new THREE.Group();
  robot.name = "Robot";
  
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.6, roughness: 0.3, flatShading: true });
  const treadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const glowMat = new THREE.MeshStandardMaterial({ color: PALETTE.dnaStrand2, emissive: PALETTE.dnaStrand2, emissiveIntensity: 1.0 });
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
  
  // Base body chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.32, 0.6), bodyMat);
  chassis.position.y = 0.22;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  robot.add(chassis);
  
  // Left and Right Wheels/Tracks
  const treadL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.68), treadMat);
  treadL.position.set(-0.35, 0.16, 0);
  treadL.castShadow = true;
  robot.add(treadL);
  
  const treadR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.68), treadMat);
  treadR.position.set(0.35, 0.16, 0);
  treadR.castShadow = true;
  robot.add(treadR);
  
  // Sensor Head Dome
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), bodyMat);
  head.position.set(0, 0.44, 0);
  head.castShadow = true;
  robot.add(head);
  
  // Glowing sensor visor eye
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.1), glowMat);
  eye.position.set(0, 0.46, 0.14);
  robot.add(eye);
  
  // Antenna
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 4), antennaMat);
  antenna.position.set(0, 0.62, -0.05);
  antenna.castShadow = true;
  robot.add(antenna);
  
  // Tip of antenna glow
  const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), new THREE.MeshBasicMaterial({ color: PALETTE.dnaStrand1 }));
  tipGlow.position.set(0, 0.73, -0.05);
  robot.add(tipGlow);
  
  return robot;
}

// --- WELCOME/TECHFEST BANNER CREATOR ---
export function createTechfestBanner(text = "TECHFEST") {
  const bannerGroup = new THREE.Group();
  bannerGroup.name = "Techfest Banner";
  
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.6, metalness: 0.4, flatShading: true });
  const glowMat = new THREE.MeshStandardMaterial({ color: PALETTE.dnaStrand2, emissive: PALETTE.dnaStrand2, emissiveIntensity: 1.0 });
  
  // Two ground support posts
  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 6), poleMat);
  postL.position.set(-1.6, 3, 0);
  postL.castShadow = true;
  bannerGroup.add(postL);
  
  const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 6), poleMat);
  postR.position.set(1.6, 3, 0);
  postR.castShadow = true;
  bannerGroup.add(postR);
  
  // Billboard board panel
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 0.16), boardMat);
  board.position.y = 4.8;
  board.castShadow = true;
  bannerGroup.add(board);
  
  // Glowing frame rings on the board
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.84, 0.22), glowMat);
  frameL.position.set(-1.8, 4.8, 0);
  bannerGroup.add(frameL);
  
  const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.84, 0.22), glowMat);
  frameR.position.set(1.8, 4.8, 0);
  bannerGroup.add(frameR);
  
  const frameT = new THREE.Mesh(new THREE.BoxGeometry(3.66, 0.06, 0.22), glowMat);
  frameT.position.set(0, 5.7, 0);
  bannerGroup.add(frameT);
  
  const frameB = new THREE.Mesh(new THREE.BoxGeometry(3.66, 0.06, 0.22), glowMat);
  frameB.position.set(0, 3.9, 0);
  bannerGroup.add(frameB);
  
  // Generate screen canvas texture with styled text
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 256, 128);
  grad.addColorStop(0, '#0a101d');
  grad.addColorStop(0.5, '#020617');
  grad.addColorStop(1, '#0c1d2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);
  
  // Tech Grid lines
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
  ctx.lineWidth = 1.0;
  for (let x = 0; x < 256; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  for (let y = 0; y < 128; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  
  // Draw glowing text
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 36px "Outfit", Arial, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 64);
  
  // Subtitle
  ctx.shadowBlur = 0;
  ctx.font = '10px "Inter", Arial, sans-serif';
  ctx.fillStyle = '#4ade80';
  ctx.fillText("IIT BOMBAY 2026", 128, 98);
  
  const canvasTex = new THREE.CanvasTexture(canvas);
  const screenMat = new THREE.MeshBasicMaterial({ map: canvasTex, side: THREE.DoubleSide });
  
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.7), screenMat);
  screen.position.set(0, 4.8, 0.095);
  bannerGroup.add(screen);
  
  const screenBack = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.7), screenMat);
  screenBack.position.set(0, 4.8, -0.095);
  screenBack.rotation.y = Math.PI;
  bannerGroup.add(screenBack);
  
  return bannerGroup;
}

// --- NEON LASER BEAM CREATOR ---
export function createLaserBeam(colorHex = 0x22d3ee) {
  const laserGroup = new THREE.Group();
  
  const height = 160;
  // Concentric cylinders for a glowing core effect
  const innerGeom = new THREE.CylinderGeometry(0.08, 0.08, height, 4, 1, true);
  innerGeom.translate(0, height / 2, 0); // Origin at bottom
  
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  const innerCore = new THREE.Mesh(innerGeom, innerMat);
  laserGroup.add(innerCore);
  
  const outerGeom = new THREE.CylinderGeometry(0.3, 0.6, height, 6, 1, true);
  outerGeom.translate(0, height / 2, 0);
  
  const outerMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.0, // Controlled dynamically in loop
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  const outerGlow = new THREE.Mesh(outerGeom, outerMat);
  outerGlow.name = "LaserGlow";
  laserGroup.add(outerGlow);
  
  return laserGroup;
}

// --- REGISTRATION BOOTH ---
export function createRegistrationBooth() {
  const booth = new THREE.Group();
  booth.name = "Registration Booth";
  
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 }); // Dark wood
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.2 }); // Light counter
  const awningMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, roughness: 0.6 }); // Cyan awning
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.2 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee }); // Glowing screen
  
  // Table counter
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.8), woodMat);
  base.position.y = 0.45;
  base.castShadow = true;
  base.receiveShadow = true;
  booth.add(base);
  
  const topPlate = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.9), counterMat);
  topPlate.position.y = 0.925;
  topPlate.castShadow = true;
  booth.add(topPlate);
  
  // Stools
  for (let i = -0.4; i <= 0.4; i += 0.8) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.55, 6), woodMat);
    stool.position.set(i, 0.275, -0.7);
    stool.castShadow = true;
    booth.add(stool);
  }
  
  // Canopy poles
  const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 4), metalMat);
  poleL.position.set(-0.75, 1.0, 0.35);
  poleL.castShadow = true;
  booth.add(poleL);
  
  const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 4), metalMat);
  poleR.position.set(0.75, 1.0, 0.35);
  poleR.castShadow = true;
  booth.add(poleR);
  
  // Slanted Canopy Awning
  const awning = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 1.1), awningMat);
  awning.position.set(0, 2.0, 0.1);
  awning.rotation.x = 0.18; // Slight slant forward
  awning.castShadow = true;
  booth.add(awning);
  
  // Small laptop/terminal on counter
  const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.2), metalMat);
  laptopBase.position.set(0, 0.96, 0);
  booth.add(laptopBase);
  
  const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.02), screenMat);
  laptopScreen.position.set(0, 1.05, -0.09);
  laptopScreen.rotation.x = -0.15;
  booth.add(laptopScreen);
  
  return booth;
}

// --- EXHIBITION BOOTH ---
export function createExhibitionBooth(type = "satellite") {
  const booth = new THREE.Group();
  booth.name = "Exhibition Booth";
  
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }); // Dark slate
  const textBoardMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.0 });
  const modelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
  
  // Display stand table
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.0), baseMat);
  table.position.y = 0.4;
  table.castShadow = true;
  table.receiveShadow = true;
  booth.add(table);
  
  // Back poster board panel
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 0.06), textBoardMat);
  board.position.set(0, 1.35, -0.47);
  board.castShadow = true;
  booth.add(board);
  
  // Glowing title frame
  const frameT = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.04, 0.1), glowMat);
  frameT.position.set(0, 2.01, -0.47);
  booth.add(frameT);
  
  // Display screen canvas texture with styled text
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 124, 60);
  
  ctx.font = 'bold 12px "Outfit", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText("TECH CONNECT", 64, 25);
  ctx.font = '8px "Inter", Arial, sans-serif';
  ctx.fillStyle = '#4ade80';
  ctx.fillText(type === 'satellite' ? "R&D SPACE LAB" : "CLEAN ENERGY", 64, 42);
  
  const canvasTex = new THREE.CanvasTexture(canvas);
  const screenMat = new THREE.MeshBasicMaterial({ map: canvasTex });
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), screenMat);
  poster.position.set(0, 1.35, -0.435);
  booth.add(poster);

  // Spindle/stand for model
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), modelMat);
  stand.position.set(0, 0.9, 0.1);
  stand.castShadow = true;
  booth.add(stand);
  
  // Interactive floating model
  const modelGroup = new THREE.Group();
  modelGroup.name = "ExhibitModel";
  modelGroup.position.set(0, 1.25, 0.1);
  booth.add(modelGroup);
  
  if (type === "satellite") {
    // Miniature satellite
    const satBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 6), modelMat);
    satBody.rotation.x = Math.PI / 2;
    satBody.castShadow = true;
    modelGroup.add(satBody);
    
    // Solar wings
    const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.15), glowMat);
    panelL.position.x = 0.3;
    modelGroup.add(panelL);
    
    const panelR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.15), glowMat);
    panelR.position.x = -0.3;
    modelGroup.add(panelR);
  } else {
    // Miniature wind turbine
    const rotorHub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), modelMat);
    modelGroup.add(rotorHub);
    
    const blades = new THREE.Group();
    blades.name = "TurbineBlades";
    for (let r = 0; r < 3; r++) {
      const angle = (r / 3) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.01), modelMat);
      blade.position.set(Math.sin(angle) * 0.2, Math.cos(angle) * 0.2, 0.04);
      blade.rotation.z = -angle;
      blades.add(blade);
    }
    modelGroup.add(blades);
  }
  
  return booth;
}

// --- ROBOWARS ARENA ---
export function createRobowarsArena() {
  const arena = new THREE.Group();
  arena.name = "Robowars Arena";
  
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9, metalness: 0.8 }); // Dark steel
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.9, roughness: 0.2 });
  const cageMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.12,
    wireframe: true
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.2
  });
  
  const w = 12;
  const h = 4.2;
  
  // Steel floor plate
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, w), floorMat);
  floor.receiveShadow = true;
  arena.add(floor);
  
  // 4 corner posts
  const posts = [
    { x: -w/2, z: -w/2 },
    { x: w/2, z: -w/2 },
    { x: w/2, z: w/2 },
    { x: -w/2, z: w/2 }
  ];
  
  posts.forEach(p => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, h, 6), steelMat);
    post.position.set(p.x, h/2, p.z);
    post.castShadow = true;
    arena.add(post);
    
    // Glowing cap beacon
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), beaconMat);
    cap.position.set(p.x, h + 0.1, p.z);
    arena.add(cap);
  });
  
  // Safety glass walls (cage enclosure)
  const cage = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, h, w - 0.1), cageMat);
  cage.position.y = h/2;
  arena.add(cage);
  
  return arena;
}

// --- ROBOWARS SPINNER COMBAT BOT ---
export function createSpinnerBot() {
  const bot = new THREE.Group();
  bot.name = "SpinnerBot";
  
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.6, flatShading: true }); // Orange body
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 }); // Silver spinner
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Angry red light
  
  // Flat disc chassis
  const chassis = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.15, 6), bodyMat);
  chassis.position.y = 0.12;
  chassis.castShadow = true;
  bot.add(chassis);
  
  // Giant spinning blade
  const bladeGroup = new THREE.Group();
  bladeGroup.name = "SpinnerBlade";
  bladeGroup.position.y = 0.22;
  
  const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 6), metalMat);
  bladeGroup.add(centerHub);
  
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.12), metalMat);
  bar.castShadow = true;
  bladeGroup.add(bar);
  
  // Teeth/tips
  const toothL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.2), metalMat);
  toothL.position.set(0.5, 0, 0.06);
  bladeGroup.add(toothL);
  
  const toothR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.2), metalMat);
  toothR.position.set(-0.5, 0, -0.06);
  bladeGroup.add(toothR);
  
  bot.add(bladeGroup);
  
  // Wheels
  for (let i = -1; i <= 1; i += 2) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 6), tireMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(i * 0.45, 0.12, -0.1);
    wheel.castShadow = true;
    bot.add(wheel);
  }
  
  // Visor LED
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), ledMat);
  eye.position.set(0, 0.14, 0.38);
  bot.add(eye);
  
  return bot;
}

// --- ROBOWARS WEDGE COMBAT BOT ---
export function createWedgeBot() {
  const bot = new THREE.Group();
  bot.name = "WedgeBot";
  
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4, metalness: 0.6, flatShading: true }); // Blue body
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.9, roughness: 0.2 });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Cheerful green light
  
  // Wedge geometry (custom vertex modification)
  const geom = new THREE.BoxGeometry(0.7, 0.24, 0.8);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const y = pos.getY(i);
    if (z > 0 && y > 0) {
      pos.setY(i, -0.1);
    }
  }
  geom.computeVertexNormals();
  
  const wedge = new THREE.Mesh(geom, bodyMat);
  wedge.position.y = 0.16;
  wedge.castShadow = true;
  bot.add(wedge);
  
  // Steel scoop extension
  const scoopGeom = new THREE.BoxGeometry(0.72, 0.02, 0.24);
  const scoop = new THREE.Mesh(scoopGeom, steelMat);
  scoop.position.set(0, 0.05, 0.48);
  scoop.rotation.x = -0.15; // Slanted scoop
  scoop.castShadow = true;
  bot.add(scoop);
  
  // LED Eyes
  for (let i = -1; i <= 1; i += 2) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), ledMat);
    eye.position.set(i * 0.18, 0.14, 0.22);
    bot.add(eye);
  }
  
  return bot;
}

// --- GAMING SIMULATOR POD ---
export function createGamingPod() {
  const pod = new THREE.Group();
  pod.name = "Gaming Pod";
  
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 }); // Black metal base
  const seatMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.5 }); // Pink bucket seat
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee }); // Cyan screen
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 1.0 });
  
  // Circular ring base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.1, 8), baseMat);
  base.receiveShadow = true;
  pod.add(base);
  
  // Base neon ring
  const neon = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.04, 6, 12), glowMat);
  neon.rotation.x = Math.PI / 2;
  neon.position.y = 0.06;
  pod.add(neon);
  
  // Curved seat structure
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.18), seatMat);
  seatBack.position.set(0, 0.6, -0.2);
  seatBack.rotation.x = -0.15; // Slanted backrest
  seatBack.castShadow = true;
  pod.add(seatBack);
  
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.5), seatMat);
  seatBase.position.set(0, 0.32, 0.04);
  seatBase.castShadow = true;
  pod.add(seatBase);
  
  // Display mount arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), metalMat);
  arm.position.set(0, 0.85, -0.4);
  
  const armOver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.6), metalMat);
  armOver.position.set(0, 1.3, -0.14);
  pod.add(arm);
  pod.add(armOver);
  
  // Floating screen monitor
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.04), baseMat);
  monitor.position.set(0, 1.15, 0.18);
  monitor.rotation.x = 0.15; // Pointing down slightly at player
  monitor.castShadow = true;
  pod.add(monitor);
  
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.31), screenMat);
  display.position.set(0, 1.15, 0.205);
  display.rotation.x = 0.15;
  pod.add(display);
  
  return pod;
}

// --- DRONE RACING GATE ---
export function createDroneGate() {
  const gate = new THREE.Group();
  gate.name = "Drone Gate";
  
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.5,
    roughness: 0.1
  });
  
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  
  // Glowing torus hoop
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 6, 16), glowMat);
  hoop.position.y = 2.4;
  hoop.castShadow = true;
  gate.add(hoop);
  
  // Support poles
  const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5), poleMat);
  poleL.position.set(-1.45, 1.2, 0);
  poleL.castShadow = true;
  gate.add(poleL);
  
  const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5), poleMat);
  poleR.position.set(1.45, 1.2, 0);
  poleR.castShadow = true;
  gate.add(poleR);
  
  return gate;
}

// --- TECH SIGNPOST ---
export function createTechSignpost() {
  const signpost = new THREE.Group();
  signpost.name = "Tech Signpost";
  
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const glowCyan = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.8 });
  const glowGreen = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x4ade80, emissiveIntensity: 0.8 });
  const glowPink = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.8 });
  const glowGold = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.8 });
  
  // Central pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 5), poleMat);
  pole.position.y = 1.7;
  pole.castShadow = true;
  signpost.add(pole);
  
  // 4 Directional Arrows at different heights & rotations
  const arrows = [
    { text: "ROBOWARS", y: 2.8, angle: -Math.PI / 4, mat: glowGreen },
    { text: "EXHIBITS", y: 2.3, angle: Math.PI / 2, mat: glowCyan },
    { text: "DRONE GP", y: 1.8, angle: -Math.PI * 0.7, mat: glowPink },
    { text: "GAMING", y: 1.3, angle: Math.PI * 0.15, mat: glowGold }
  ];
  
  arrows.forEach(arr => {
    const arrowGroup = new THREE.Group();
    arrowGroup.position.y = arr.y;
    arrowGroup.rotation.y = arr.angle;
    
    // Main board (pointed design)
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.05), boardMat);
    board.position.x = 0.45;
    board.castShadow = true;
    arrowGroup.add(board);
    
    // Pointed tip
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.05), boardMat);
    tip.position.set(0.9, 0, 0);
    tip.rotation.y = Math.PI / 4;
    arrowGroup.add(tip);
    
    // Glowing neon stripe/backing
    const backing = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.03, 0.07), arr.mat);
    backing.position.set(0.45, 0.125, 0);
    arrowGroup.add(backing);
    
    // Generate text texture for arrow
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 128, 32);
    ctx.font = 'bold 13px "Outfit", Arial, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(arr.text, 64, 16);
    
    const tex = new THREE.CanvasTexture(canvas);
    const labelMat = new THREE.MeshBasicMaterial({ map: tex });
    
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), labelMat);
    label.position.set(0.4, 0, 0.027);
    arrowGroup.add(label);
    
    signpost.add(arrowGroup);
  });
  
  return signpost;
}

