// Cinematic hero: stormy sky + wind turbine + procedural lightning + glowing
// energy current routed through the SLPS path to ground.

import * as THREE from "three";
import { makeBoltPath3D } from "./lightning.js";

export function initHeroScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05080c, 0.022);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  camera.position.set(14, 9, 22);
  camera.lookAt(0, 8, 0);

  // ---- LIGHTING ----
  const ambient = new THREE.AmbientLight(0x6688aa, 0.35);
  scene.add(ambient);

  const moon = new THREE.DirectionalLight(0xa3c8ff, 0.55);
  moon.position.set(-20, 30, 10);
  scene.add(moon);

  const rim = new THREE.DirectionalLight(0x3aebcd, 0.25);
  rim.position.set(20, 6, -10);
  scene.add(rim);

  // dynamic flash light — turned on during a strike
  const flashLight = new THREE.PointLight(0xcfeaff, 0, 80, 2);
  flashLight.position.set(0, 22, 0);
  scene.add(flashLight);

  // ---- GROUND ----
  const groundGeo = new THREE.CircleGeometry(120, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x06090d, roughness: 0.95, metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // grid lines on ground for engineering feel
  const grid = new THREE.GridHelper(80, 40, 0x10cf90, 0x10cf90);
  grid.material.transparent = true;
  grid.material.opacity = 0.08;
  grid.position.y = 0.01;
  scene.add(grid);

  // ---- TURBINE ----
  const turbine = new THREE.Group();

  // tower (tapered cylinder)
  const towerGeo = new THREE.CylinderGeometry(0.35, 0.7, 16, 24, 1, true);
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xd6dde6, roughness: 0.55, metalness: 0.6,
    emissive: 0x0e1620, emissiveIntensity: 0.4,
  });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.y = 8;
  turbine.add(tower);

  // foundation
  const baseGeo = new THREE.CylinderGeometry(1.4, 1.7, 0.5, 24);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1a2027, roughness: 0.85, metalness: 0.2,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.25;
  turbine.add(base);

  // nacelle
  const nacelleGeo = new THREE.BoxGeometry(2.4, 0.95, 1.1);
  nacelleGeo.translate(0, 0, 0.15);
  const nacelle = new THREE.Mesh(nacelleGeo, towerMat.clone());
  nacelle.position.set(0, 16.1, 0);
  turbine.add(nacelle);

  // hub
  const hubGeo = new THREE.SphereGeometry(0.55, 24, 16);
  const hub = new THREE.Mesh(hubGeo, towerMat);
  hub.position.set(0, 16.1, 0.95);
  turbine.add(hub);

  // rotor (3 blades)
  const rotor = new THREE.Group();
  rotor.position.set(0, 16.1, 0.95);
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, -0.2);
  bladeShape.bezierCurveTo(0.18, 1.5, 0.16, 4, 0.06, 7.2);
  bladeShape.bezierCurveTo(0.04, 7.4, -0.04, 7.4, -0.06, 7.2);
  bladeShape.bezierCurveTo(-0.18, 4, -0.18, 1.5, 0, -0.2);
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 16,
  });
  bladeGeo.translate(0, 0, -0.04);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xeaf0f6, roughness: 0.4, metalness: 0.2,
  });
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(bladeGeo, bladeMat);
    b.rotation.z = (i / 3) * Math.PI * 2;
    rotor.add(b);
  }
  turbine.add(rotor);

  // SLPS housing on tower base — small glowing block
  const slpsGeo = new THREE.BoxGeometry(0.55, 0.4, 0.6);
  const slpsMat = new THREE.MeshStandardMaterial({
    color: 0x10cf90, emissive: 0x10cf90, emissiveIntensity: 1.2,
    metalness: 0.5, roughness: 0.3,
  });
  const slpsBox = new THREE.Mesh(slpsGeo, slpsMat);
  slpsBox.position.set(0.62, 1.1, 0);
  turbine.add(slpsBox);

  scene.add(turbine);

  // ---- CLOUDS (sprite particles) ----
  const cloudGroup = new THREE.Group();
  const cloudCanvas = document.createElement("canvas");
  cloudCanvas.width = cloudCanvas.height = 256;
  const cctx = cloudCanvas.getContext("2d");
  const grad = cctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  grad.addColorStop(0, "rgba(180,200,220,0.6)");
  grad.addColorStop(0.4, "rgba(70,90,110,0.25)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  cctx.fillStyle = grad; cctx.fillRect(0, 0, 256, 256);
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  const cloudMat = new THREE.SpriteMaterial({
    map: cloudTex, transparent: true, opacity: 0.55, depthWrite: false,
    blending: THREE.NormalBlending,
  });
  for (let i = 0; i < 30; i++) {
    const s = new THREE.Sprite(cloudMat.clone());
    s.position.set((Math.random() - 0.5) * 90, 22 + Math.random() * 10, -20 - Math.random() * 60);
    const sc = 14 + Math.random() * 18;
    s.scale.set(sc, sc * 0.55, 1);
    s.material.opacity = 0.25 + Math.random() * 0.4;
    cloudGroup.add(s);
  }
  scene.add(cloudGroup);

  // ---- RAIN PARTICLES ----
  const rainCount = 1400;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(rainCount * 3);
  const rainVel = new Float32Array(rainCount);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3 + 0] = (Math.random() - 0.5) * 80;
    rainPos[i * 3 + 1] = Math.random() * 30;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 60 - 5;
    rainVel[i] = 0.18 + Math.random() * 0.18;
  }
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0x9ec5e8, size: 0.05, transparent: true, opacity: 0.35, depthWrite: false,
  });
  const rain = new THREE.Points(rainGeo, rainMat);
  scene.add(rain);

  // ---- LIGHTNING BOLT (line) ----
  const boltMat = new THREE.LineBasicMaterial({
    color: 0xeaf6ff, transparent: true, opacity: 0.0, linewidth: 2,
  });
  const boltGeo = new THREE.BufferGeometry();
  const bolt = new THREE.Line(boltGeo, boltMat);
  scene.add(bolt);

  // glow tube around the bolt for thicker visual
  const boltGlowMat = new THREE.LineBasicMaterial({
    color: 0x9ed8ff, transparent: true, opacity: 0.0,
  });
  const boltGlow = new THREE.Line(new THREE.BufferGeometry(), boltGlowMat);
  scene.add(boltGlow);

  // ---- ENERGY FLOW DOWN TOWER (animated tube) ----
  // path from blade tip → hub → tower → SLPS → ground
  const flowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 16.1, 0.95),       // hub
    new THREE.Vector3(0, 14.5, 0.6),
    new THREE.Vector3(0, 10, 0.2),
    new THREE.Vector3(0, 4, 0.1),
    new THREE.Vector3(0.4, 1.2, 0.1),       // SLPS
    new THREE.Vector3(0.7, 0.3, 0.1),       // ground
  ]);
  const flowGeo = new THREE.TubeGeometry(flowCurve, 80, 0.06, 8, false);
  const flowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uActive: { value: 0 },
      uColor: { value: new THREE.Color(0x2ae3a8) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uActive;
      uniform vec3 uColor;
      void main(){
        float wave = smoothstep(0.0,0.05, fract(vUv.x*6.0 - uTime*1.6));
        wave *= 1.0 - smoothstep(0.0,0.4, fract(vUv.x*6.0 - uTime*1.6));
        vec3 col = uColor * (0.4 + wave*1.6);
        float a = (0.18 + wave*0.85) * uActive;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  const flowMesh = new THREE.Mesh(flowGeo, flowMat);
  scene.add(flowMesh);

  // ---- STRIKE SCHEDULER ----
  let nextStrikeAt = 1.5;
  let activeBolt = null;

  function createStrike() {
    const bladeAngle = rotor.rotation.z;
    // pick the highest blade tip
    let tipPos = null, bestY = -Infinity;
    for (let i = 0; i < 3; i++) {
      const ang = bladeAngle + (i / 3) * Math.PI * 2;
      const y = 16.1 + Math.cos(ang) * 7.2;
      if (y > bestY) {
        bestY = y;
        tipPos = new THREE.Vector3(Math.sin(ang) * 7.2, y, 0.95);
      }
    }
    if (!tipPos) return;
    const skyStart = new THREE.Vector3(
      tipPos.x + (Math.random() - 0.5) * 6,
      tipPos.y + 14 + Math.random() * 6,
      tipPos.z - 4 - Math.random() * 6,
    );
    const pts = makeBoltPath3D(THREE, skyStart, tipPos, { detail: 6, displace: 2.0 });
    const positions = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { positions[i*3]=p.x; positions[i*3+1]=p.y; positions[i*3+2]=p.z; });
    bolt.geometry.dispose();
    bolt.geometry = new THREE.BufferGeometry();
    bolt.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    boltGlow.geometry.dispose();
    boltGlow.geometry = bolt.geometry.clone();
    activeBolt = { life: 0, dur: 0.55, hitAt: 0.18 };
    boltMat.opacity = 1; boltGlowMat.opacity = 0.6;
  }

  // ---- ANIMATION LOOP ----
  const clock = new THREE.Clock();
  let mouseX = 0, mouseY = 0, paused = false;

  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouseY = ((e.clientY - r.top) / r.height) * 2 - 1;
  }
  canvas.addEventListener("pointermove", onPointerMove);

  function setSize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  setSize();
  window.addEventListener("resize", setSize);

  // visibility pause
  const observer = new IntersectionObserver(([e]) => { paused = !e.isIntersecting; }, { threshold: 0 });
  observer.observe(canvas);

  // public flash hook
  let flashCb = null;
  function onFlash(cb) { flashCb = cb; }

  function tick() {
    if (paused) { requestAnimationFrame(tick); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    rotor.rotation.z += dt * 0.55;
    cloudGroup.position.x = Math.sin(t * 0.05) * 4;

    // rain
    const pos = rainGeo.attributes.position.array;
    for (let i = 0; i < rainCount; i++) {
      pos[i*3+1] -= rainVel[i] * 60 * dt;
      if (pos[i*3+1] < 0) {
        pos[i*3+1] = 30;
        pos[i*3+0] = (Math.random() - 0.5) * 80;
      }
    }
    rainGeo.attributes.position.needsUpdate = true;

    // strike scheduling
    nextStrikeAt -= dt;
    if (nextStrikeAt <= 0) {
      createStrike();
      nextStrikeAt = 4 + Math.random() * 5;
    }
    if (activeBolt) {
      activeBolt.life += dt;
      const a = 1 - (activeBolt.life / activeBolt.dur);
      boltMat.opacity = Math.max(0, a);
      boltGlowMat.opacity = Math.max(0, a * 0.6);
      if (activeBolt.life >= activeBolt.hitAt && !activeBolt.fired) {
        activeBolt.fired = true;
        flashLight.intensity = 4.5;
        if (flashCb) flashCb();
      }
      if (activeBolt.life > activeBolt.dur) activeBolt = null;
    }
    flashLight.intensity *= 0.86; // decay
    if (flashLight.intensity < 0.02) flashLight.intensity = 0;

    // energy flow ramps up after a hit, decays slowly
    flowMat.uniforms.uTime.value = t;
    const targetActive = activeBolt && activeBolt.fired ? 1.0 : 0.18;
    flowMat.uniforms.uActive.value += (targetActive - flowMat.uniforms.uActive.value) * 0.04;

    // gentle camera drift driven by mouse
    const desiredX = 14 + mouseX * 1.5;
    const desiredY = 9 + -mouseY * 1.2;
    camera.position.x += (desiredX - camera.position.x) * 0.04;
    camera.position.y += (desiredY - camera.position.y) * 0.04;
    camera.lookAt(0, 8, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  return { onFlash };
}
