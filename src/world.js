/**
 * @file world.js
 * 3D graphics engine, LOLA DEM terrain mesh generator, outpost architecture, and lunar environment.
 */

import * as THREE from '../lib/three.module.js';

export class LunarWorld {
  constructor(canvasContainer, dataLoader) {
    this.container = canvasContainer;
    this.dataLoader = dataLoader;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.terrainMesh = null;
    this.heightData = null;
    this.heightMeta = null;
    this.interactables = [];
    this.roverObject = null;
    this.earthSphere = null;
    this.dirLight = null;
    this.rocks = [];
  }

  async init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050508);
    this.scene.fog = new THREE.FogExp2(0x050508, 0.002);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    this.camera.position.set(0, 3, 8);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 3. Harsh Polar Lighting (Low grazing sun)
    const ambientLight = new THREE.AmbientLight(0x1a1a24, 0.4);
    this.scene.add(ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.dirLight.position.set(150, 40, -100);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 400;
    const d = 60;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // 4. Starfield & Distant Earth
    this.createStarfield();
    this.createEarth();

    // 5. Build LOLA DEM Terrain
    await this.buildTerrain();

    // 6. Build Outpost Architecture
    this.buildOutpost();

    // 7. Build Lunar Rover
    this.buildRover();

    // 8. Place Geological Sample Rocks
    this.placeGeologicalRocks();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createStarfield() {
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 800 + Math.random() * 200;
      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta)) + 50; // keep above horizon
      positions[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0.85 });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  createEarth() {
    // Earth hanging in the deep lunar sky
    const earthGeo = new THREE.SphereGeometry(18, 32, 32);
    const textureLoader = new THREE.TextureLoader();
    const earthTex = textureLoader.load('assets/epic/epic_1b_20240510055119.jpg');
    const earthMat = new THREE.MeshBasicMaterial({ map: earthTex });
    this.earthSphere = new THREE.Mesh(earthGeo, earthMat);
    this.earthSphere.position.set(-280, 180, -350);
    this.earthSphere.rotation.y = Math.PI * 0.4;
    this.scene.add(this.earthSphere);

    // Atmospheric halo glow
    const haloGeo = new THREE.SphereGeometry(19.2, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4ca3ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    this.earthSphere.add(halo);
  }

  async buildTerrain() {
    const meta = await this.dataLoader.getTerrainMetadata();
    const buffer = await this.dataLoader.getLocalTerrainElevation();
    this.heightMeta = meta.tiles.local;

    const width = this.heightMeta.width; // 256
    const height = this.heightMeta.height; // 256
    const minElev = this.heightMeta.elev_min_m; // 600.21
    const maxElev = this.heightMeta.elev_max_m; // 692.19
    const elevRange = maxElev - minElev;

    const uint16View = new Uint16Array(buffer);
    this.heightData = new Float32Array(width * height);

    // Flatten center for base foundation
    const centerI = Math.floor(width / 2);
    const centerJ = Math.floor(height / 2);
    const baseRadius = 24; // pixels

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const idx = j * width + i;
        const normVal = uint16View[idx] / 65535.0;
        let elev = normVal * elevRange * 0.35; // scaled for gameplay

        // Gentle flattening under the outpost
        const distToCenter = Math.hypot(i - centerI, j - centerJ);
        if (distToCenter < baseRadius) {
          const factor = Math.cos((distToCenter / baseRadius) * (Math.PI / 2));
          elev = elev * (1 - factor * 0.85);
        }
        this.heightData[idx] = elev;
      }
    }

    const planeGeo = new THREE.PlaneGeometry(350, 350, width - 1, height - 1);
    planeGeo.rotateX(-Math.PI / 2);

    const posAttr = planeGeo.attributes.position;
    for (let k = 0; k < posAttr.count; k++) {
      posAttr.setY(k, this.heightData[k]);
    }
    planeGeo.computeVertexNormals();

    const textureLoader = new THREE.TextureLoader();
    const colorMap = textureLoader.load('assets/textures/moon-regolith-color.jpg');
    colorMap.wrapS = THREE.RepeatWrapping;
    colorMap.wrapT = THREE.RepeatWrapping;
    colorMap.repeat.set(24, 24);

    const normalMap = textureLoader.load('assets/textures/moon-regolith-normal.webp');
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(24, 24);

    const roughMap = textureLoader.load('assets/textures/moon-regolith-rough.jpg');
    roughMap.wrapS = THREE.RepeatWrapping;
    roughMap.wrapT = THREE.RepeatWrapping;
    roughMap.repeat.set(24, 24);

    const terrainMat = new THREE.MeshStandardMaterial({
      map: colorMap,
      normalMap: normalMap,
      roughnessMap: roughMap,
      roughness: 0.9,
      metalness: 0.05
    });

    this.terrainMesh = new THREE.Mesh(planeGeo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  getElevationAt(x, z) {
    if (!this.heightData) return 0;
    const halfSize = 175;
    const nx = (x + halfSize) / 350;
    const nz = (z + halfSize) / 350;
    if (nx < 0 || nx >= 1 || nz < 0 || nz >= 1) return 0;

    const gx = Math.floor(nx * 255);
    const gz = Math.floor(nz * 255);
    return this.heightData[gz * 256 + gx] || 0;
  }

  buildOutpost() {
    const moduleMat = new THREE.MeshStandardMaterial({ color: 0xE8E8E6, roughness: 0.4, metalness: 0.2 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x252527, roughness: 0.8 });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x004488, roughness: 0.2, metalness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, transparent: true, opacity: 0.6, roughness: 0.1 });

    // 1. Central Command Habitat
    const habGeo = new THREE.CylinderGeometry(6, 6.5, 3.8, 16);
    const hab = new THREE.Mesh(habGeo, moduleMat);
    hab.position.set(0, 1.9, 0);
    hab.castShadow = true;
    hab.receiveShadow = true;
    this.scene.add(hab);

    const domeGeo = new THREE.SphereGeometry(6, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const dome = new THREE.Mesh(domeGeo, moduleMat);
    dome.position.set(0, 3.8, 0);
    dome.castShadow = true;
    this.scene.add(dome);

    // 2. Power Station & Solar Arrays (-14, 0)
    const powerGeo = new THREE.BoxGeometry(4.5, 3, 4.5);
    const powerStation = new THREE.Mesh(powerGeo, moduleMat);
    powerStation.position.set(-14, 1.5, 0);
    powerStation.castShadow = true;
    this.scene.add(powerStation);

    // Solar tracking towers
    for (let i = -1; i <= 1; i += 2) {
      const mastGeo = new THREE.CylinderGeometry(0.2, 0.2, 6, 8);
      const mast = new THREE.Mesh(mastGeo, darkMat);
      mast.position.set(-14 + i * 4, 3, 0);
      const panelGeo = new THREE.BoxGeometry(4.5, 2.5, 0.15);
      const panel = new THREE.Mesh(panelGeo, solarMat);
      panel.position.set(0, 3, 0);
      panel.rotation.y = Math.PI * 0.25;
      mast.add(panel);
      this.scene.add(mast);
    }

    // 3. Greenhouse Module (14, 0)
    const ghGeo = new THREE.CylinderGeometry(3.5, 3.5, 9, 16);
    const greenhouse = new THREE.Mesh(ghGeo, moduleMat);
    greenhouse.rotation.z = Math.PI / 2;
    greenhouse.position.set(14, 2.2, 0);
    greenhouse.castShadow = true;
    this.scene.add(greenhouse);

    // Greenhouse viewing cupola with pink LED plant light
    const cupola = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 12), glassMat);
    cupola.position.set(14, 3.6, 0);
    this.scene.add(cupola);

    const plantLight = new THREE.PointLight(0xff33bb, 2.0, 12);
    plantLight.position.set(14, 3, 0);
    this.scene.add(plantLight);

    // 4. Airlock Module (0, 12)
    const airlockGeo = new THREE.BoxGeometry(4.2, 3.2, 5.5);
    const airlock = new THREE.Mesh(airlockGeo, moduleMat);
    airlock.position.set(0, 1.6, 8);
    airlock.castShadow = true;
    this.scene.add(airlock);

    // Inter-module connecting corridors
    const tunnelGeo = new THREE.CylinderGeometry(1.4, 1.4, 7, 12);
    const tunnelMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.5 });

    const tunL = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunL.rotation.z = Math.PI / 2;
    tunL.position.set(-8, 1.4, 0);
    this.scene.add(tunL);

    const tunR = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunR.rotation.z = Math.PI / 2;
    tunR.position.set(8, 1.4, 0);
    this.scene.add(tunR);

    // Comms Antenna Dish atop Habitat
    const dishGeo = new THREE.CylinderGeometry(1.6, 0.2, 0.4, 16);
    const dish = new THREE.Mesh(dishGeo, darkMat);
    dish.position.set(0, 7.2, 0);
    dish.rotation.x = Math.PI * 0.2;
    this.scene.add(dish);

    // Register interactables
    this.interactables.push(
      { id: 'power_console', label: 'POWER GRID TERMINAL', range: 4.5, pos: new THREE.Vector3(-14, 1.5, 2.5), action: 'USE CONSOLE' },
      { id: 'airlock_hatch', label: 'AIRLOCK SUIT VERIFICATION', range: 4.0, pos: new THREE.Vector3(0, 1.5, 11), action: 'CYCLE AIRLOCK' },
      { id: 'greenhouse_hatch', label: 'GREENHOUSE ECLSS MONITOR', range: 4.0, pos: new THREE.Vector3(14, 1.5, 3), action: 'INSPECT CROPS' },
      { id: 'science_console', label: 'DSCOVR EPIC SCIENCE CONSOLE', range: 4.0, pos: new THREE.Vector3(0, 1.5, -4), action: 'USE CONSOLE' }
    );
  }

  buildRover() {
    const roverGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xE8E8E6, roughness: 0.5, metalness: 0.3 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.8 });

    // Chassis
    const chassisGeo = new THREE.BoxGeometry(2.2, 0.6, 3.4);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.8;
    chassis.castShadow = true;
    roverGroup.add(chassis);

    // Cabin frame & Roll bar
    const frameGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8);
    for (let x of [-0.9, 0.9]) {
      for (let z of [-1.2, 1.2]) {
        const pillar = new THREE.Mesh(frameGeo, bodyMat);
        pillar.position.set(x, 1.6, z);
        roverGroup.add(pillar);
      }
    }

    // 4 Wire-mesh wheels
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    for (let x of [-1.3, 1.3]) {
      for (let z of [-1.2, 1.2]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(x, 0.5, z);
        wheel.castShadow = true;
        roverGroup.add(wheel);
      }
    }

    // Rover Headlights
    const lightL = new THREE.SpotLight(0xffffff, 3.0, 35, Math.PI * 0.25, 0.5);
    lightL.position.set(-0.8, 1.1, 1.7);
    lightL.target.position.set(-0.8, 0, 10);
    roverGroup.add(lightL);
    roverGroup.add(lightL.target);

    roverGroup.position.set(6, this.getElevationAt(6, 16), 16);
    this.scene.add(roverGroup);
    this.roverObject = roverGroup;

    this.interactables.push({
      id: 'lunar_rover',
      label: 'LUNAR ROVING VEHICLE (LRV)',
      range: 4.5,
      pos: roverGroup.position,
      action: 'ENTER ROVER'
    });
  }

  placeGeologicalRocks() {
    const rockTypes = [
      { id: 'rock_anorthosite', name: 'Highland Anorthosite', color: 0xD0D0D4, pos: new THREE.Vector3(-25, 0, 30) },
      { id: 'rock_basalt', name: 'Mare Basalt Outcrop', color: 0x38383E, pos: new THREE.Vector3(32, 0, 24) },
      { id: 'rock_breccia', name: 'Regolith Impact Breccia', color: 0x7A7065, pos: new THREE.Vector3(-18, 0, -28) }
    ];

    rockTypes.forEach(rock => {
      rock.pos.y = this.getElevationAt(rock.pos.x, rock.pos.z) + 0.6;
      const rockGeo = new THREE.DodecahedronGeometry(0.8, 1);
      const rockMat = new THREE.MeshStandardMaterial({ color: rock.color, roughness: 0.95 });
      const mesh = new THREE.Mesh(rockGeo, rockMat);
      mesh.position.copy(rock.pos);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.rocks.push({ mesh, data: rock });

      this.interactables.push({
        id: rock.id,
        label: rock.name,
        range: 4.0,
        pos: rock.pos,
        action: 'COLLECT SAMPLE'
      });
    });

    // Shackleton crater overlook viewpoint
    this.interactables.push({
      id: 'shackleton_rim',
      label: 'SHACKLETON CRATER RIM OVERLOOK',
      range: 8.0,
      pos: new THREE.Vector3(0, this.getElevationAt(0, -60), -60),
      action: 'SCAN CRATER'
    });
  }

  onWindowResize() {
    if (!this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      if (this.earthSphere) {
        this.earthSphere.rotation.y += 0.0002;
      }
      this.renderer.render(this.scene, this.camera);
    }
  }
}
