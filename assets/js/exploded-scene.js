// Exploded view of the SLPS assembly — flat tinned-copper braid strap with
// red FR plastic encapsulation, stainless U-bracket (D0352), and black
// heat-shrink sleeves. One end terminates in a doubled-back loop, the other
// in a frayed cut.

import * as THREE from "three";

export const PARTS = [
  { id: "encap",      name: "FR Plastic Encapsulant", code: "D0103", color: "#d4231f" },
  { id: "bracket",    name: "Stainless U-Bracket",    code: "D0352", color: "#d8dde0" },
  { id: "heatshrink", name: "Heatshrink Sleeves",     code: "D0105", color: "#1a1d22" },
  { id: "braid",      name: "Tinned Copper Braid",    code: "D0106", color: "#c8cdd2" },
];

export function initExplodedScene(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(2.5, 3.4, 7.2);
  camera.lookAt(0, 0.2, 0);

  // light rig
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(4, 6, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0x5fb8ff, 0.5); fill.position.set(-5, 2, -2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x10cf90, 0.4); rim.position.set(0, -3, -5); scene.add(rim);

  const assembly = new THREE.Group();
  const partMeshes = {};

  // ---- Dimensions ----
  const STRAP_LEN = 5.2;     // straight braid length (X)
  const STRAP_W = 0.55;      // braid width (Z)
  const STRAP_T = 0.13;      // braid thickness (Y) — flat
  const LOOP_R = 0.42;       // mean radius of the loop curl
  const STRAP_X0 = -0.6;     // offset so loop end is more visible

  // =========================================================
  // BRAID — tinned copper, flat strap with loop end on +X
  // =========================================================
  const braidGroup = new THREE.Group();
  const braidMat = new THREE.MeshStandardMaterial({
    color: 0xc8cdd2, metalness: 0.55, roughness: 0.62,
  });
  const braidEndMat = new THREE.MeshStandardMaterial({
    color: 0xb8bfc6, metalness: 0.55, roughness: 0.78,
  });

  // Straight section
  const strap = new THREE.Mesh(
    new THREE.BoxGeometry(STRAP_LEN, STRAP_T, STRAP_W),
    braidMat
  );
  strap.position.set(STRAP_X0, 0, 0);
  braidGroup.add(strap);

  // Frayed end on -X side: a few thin "tufts" of fiber sticking out
  const frayGroup = new THREE.Group();
  const frayMat = new THREE.MeshStandardMaterial({
    color: 0xbfc6cc, metalness: 0.5, roughness: 0.85,
  });
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.006, 0.18 + Math.random() * 0.12, 6),
      frayMat
    );
    f.geometry.rotateZ(Math.PI / 2);
    f.position.set(
      STRAP_X0 - STRAP_LEN / 2 - 0.06 - Math.random() * 0.05,
      (Math.random() - 0.5) * STRAP_T * 0.7,
      (i / 6 - 0.5) * STRAP_W * 0.85,
    );
    f.rotation.y = (Math.random() - 0.5) * 0.5;
    frayGroup.add(f);
  }
  braidGroup.add(frayGroup);

  // Loop end (doubled-back curl) — extruded half-annulus lying flat in X-Z plane.
  // After rotateX(-π/2): top chord band lands at Z ∈ [-STRAP_W/2, +STRAP_W/2],
  // matching the main strap, and the bulge extends in +X.
  const loopOuter = LOOP_R + STRAP_W / 2;
  const loopInner = LOOP_R - STRAP_W / 2;
  const loopShape = new THREE.Shape();
  loopShape.moveTo(0, loopOuter);
  loopShape.absarc(0, 0, loopOuter, Math.PI / 2, -Math.PI / 2, true);
  loopShape.lineTo(0, -loopInner);
  loopShape.absarc(0, 0, loopInner, -Math.PI / 2, Math.PI / 2, false);
  loopShape.lineTo(0, loopOuter);

  const loopGeo = new THREE.ExtrudeGeometry(loopShape, {
    depth: STRAP_T, bevelEnabled: false, curveSegments: 24,
  });
  loopGeo.translate(0, 0, -STRAP_T / 2);
  loopGeo.rotateX(-Math.PI / 2);
  const loop = new THREE.Mesh(loopGeo, braidMat);
  loop.position.set(STRAP_X0 + STRAP_LEN / 2, 0, LOOP_R);
  braidGroup.add(loop);

  // Doubled-back tail returning toward the strap body (the lower rail of the loop,
  // which in real life gets heat-shrunk back against the strap)
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, STRAP_T, STRAP_W),
    braidEndMat
  );
  tail.position.set(STRAP_X0 + STRAP_LEN / 2 - 0.27, 0, 2 * LOOP_R);
  braidGroup.add(tail);

  partMeshes.braid = braidGroup;
  assembly.add(braidGroup);

  // =========================================================
  // HEAT-SHRINK — black sleeves wrapping the braid
  // =========================================================
  const heatGroup = new THREE.Group();
  const heatMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d22, metalness: 0.15, roughness: 0.78,
  });

  function makeSleeve(length, w = STRAP_W + 0.06, t = STRAP_T + 0.05) {
    return new THREE.Mesh(new THREE.BoxGeometry(length, t, w), heatMat);
  }

  // Two main sleeves, one on each side of the encapsulant
  const sleeveLen = 0.55;
  const encapHalf = 0.55;  // half-length of encap in X
  const sleeveL = makeSleeve(sleeveLen);
  sleeveL.position.set(STRAP_X0 - (encapHalf + sleeveLen / 2), 0, 0);
  heatGroup.add(sleeveL);

  const sleeveR = makeSleeve(sleeveLen);
  sleeveR.position.set(STRAP_X0 + (encapHalf + sleeveLen / 2), 0, 0);
  heatGroup.add(sleeveR);

  // Loop-side sleeve: holds the doubled-back tail against the main strap.
  // Wraps around BOTH the strap and the returning tail, so it's wider in Z.
  const loopSleeveZWidth = 2 * LOOP_R + STRAP_W + 0.08;
  const loopSleeve = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, STRAP_T + 0.07, loopSleeveZWidth),
    heatMat
  );
  loopSleeve.position.set(STRAP_X0 + STRAP_LEN / 2 - 0.18, 0, LOOP_R);
  heatGroup.add(loopSleeve);

  partMeshes.heatshrink = heatGroup;
  assembly.add(heatGroup);

  // =========================================================
  // ENCAPSULANT — red 3D-printed FR plastic, rounded block
  // Embossed text/arrows are not modeled (would require texture or
  // displacement); we approximate with a beveled box and clearcoat.
  // =========================================================
  const encapGroup = new THREE.Group();
  const encapMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4231f, metalness: 0.0, roughness: 0.42,
    clearcoat: 0.45, clearcoatRoughness: 0.35,
  });

  // Main body (a slightly chamfered box via small bevel using ExtrudeGeometry)
  const ENCAP_LEN = 1.1;
  const ENCAP_H = 0.62;
  const ENCAP_W = 0.78;
  const r = 0.08;
  const encapShape = new THREE.Shape();
  encapShape.moveTo(-ENCAP_LEN / 2 + r, -ENCAP_H / 2);
  encapShape.lineTo(ENCAP_LEN / 2 - r, -ENCAP_H / 2);
  encapShape.absarc(ENCAP_LEN / 2 - r, -ENCAP_H / 2 + r, r, -Math.PI / 2, 0, false);
  encapShape.lineTo(ENCAP_LEN / 2, ENCAP_H / 2 - r);
  encapShape.absarc(ENCAP_LEN / 2 - r, ENCAP_H / 2 - r, r, 0, Math.PI / 2, false);
  encapShape.lineTo(-ENCAP_LEN / 2 + r, ENCAP_H / 2);
  encapShape.absarc(-ENCAP_LEN / 2 + r, ENCAP_H / 2 - r, r, Math.PI / 2, Math.PI, false);
  encapShape.lineTo(-ENCAP_LEN / 2, -ENCAP_H / 2 + r);
  encapShape.absarc(-ENCAP_LEN / 2 + r, -ENCAP_H / 2 + r, r, Math.PI, 1.5 * Math.PI, false);

  const encapGeo = new THREE.ExtrudeGeometry(encapShape, {
    depth: ENCAP_W, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04,
    bevelSegments: 3, curveSegments: 8,
  });
  encapGeo.translate(0, 0, -ENCAP_W / 2);
  const encapBody = new THREE.Mesh(encapGeo, encapMat);
  encapBody.position.set(STRAP_X0, 0.06, 0);
  encapGroup.add(encapBody);

  partMeshes.encap = encapGroup;
  assembly.add(encapGroup);

  // =========================================================
  // U-BRACKET — D0352 stainless steel, bent sheet
  // Base sits inside the encap, two legs rise and exit through top
  // with mounting holes near the tips.
  // =========================================================
  const bracketGroup = new THREE.Group();
  const bracketMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde0, metalness: 0.88, roughness: 0.22,
  });

  const BR_LEG_SEP = 0.85;     // distance between legs (X)
  const BR_LEG_H = 1.1;        // leg height above encap top
  const BR_LEG_W = 0.5;        // leg width (Z)
  const BR_SHEET_T = 0.05;     // sheet thickness
  const ENCAP_TOP = 0.06 + ENCAP_H / 2;

  // Base (horizontal) — embedded in encap
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(BR_LEG_SEP + BR_SHEET_T, BR_SHEET_T, BR_LEG_W),
    bracketMat
  );
  base.position.set(STRAP_X0, -0.16, 0);
  bracketGroup.add(base);

  // Legs — rise vertically from base ends, exit through encap top
  function makeLeg(xOffset) {
    const legGroup = new THREE.Group();

    // Lower portion (inside encap)
    const inside = new THREE.Mesh(
      new THREE.BoxGeometry(BR_SHEET_T, ENCAP_TOP + 0.16, BR_LEG_W),
      bracketMat
    );
    inside.position.y = (ENCAP_TOP - 0.16) / 2;
    legGroup.add(inside);

    // Upper portion (exposed) — slightly narrower toward the tip
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(BR_SHEET_T, BR_LEG_H, BR_LEG_W * 0.78),
      bracketMat
    );
    upper.position.y = ENCAP_TOP + BR_LEG_H / 2;
    legGroup.add(upper);

    // Rounded tab with mounting hole at the tip
    const tabRingGeo = new THREE.TorusGeometry(0.085, 0.025, 8, 24);
    tabRingGeo.rotateY(Math.PI / 2);  // ring axis along X
    const tabRing = new THREE.Mesh(tabRingGeo, bracketMat);
    tabRing.position.set(0, ENCAP_TOP + BR_LEG_H + 0.04, 0);
    legGroup.add(tabRing);

    // Tab fill plate behind the ring (so the leg looks rounded at the top)
    const tabPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.115, BR_SHEET_T, 16),
      bracketMat
    );
    tabPlate.geometry.rotateZ(Math.PI / 2);
    tabPlate.position.set(0, ENCAP_TOP + BR_LEG_H + 0.04, 0);
    legGroup.add(tabPlate);

    legGroup.position.set(STRAP_X0 + xOffset, 0, 0);
    return legGroup;
  }

  bracketGroup.add(makeLeg(-BR_LEG_SEP / 2));
  bracketGroup.add(makeLeg(+BR_LEG_SEP / 2));

  partMeshes.bracket = bracketGroup;
  assembly.add(bracketGroup);

  // ---- Subtle ground shadow plate ----
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 4),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.55;
  assembly.add(shadow);

  scene.add(assembly);

  // =========================================================
  // EXPLODE AXES & INTERACTION
  // =========================================================
  const explodeAxes = {
    bracket:    new THREE.Vector3(0, 2.4, 0),
    encap:      new THREE.Vector3(0, 1.4, 0),
    heatshrink: new THREE.Vector3(0, 0.65, 0),
    braid:      new THREE.Vector3(0, -0.4, 0),
  };
  const baseOffsets = {};
  PARTS.forEach(p => {
    baseOffsets[p.id] = partMeshes[p.id]?.position.clone() || new THREE.Vector3();
  });

  let explode = 0, explodeTarget = 0, autoExplode = false;
  let highlightId = null;
  let yaw = 0.5, pitch = 0.22;
  let dragging = false, lastX = 0, lastY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    yaw += (e.clientX - lastX) * 0.005;
    pitch += (e.clientY - lastY) * 0.004;
    pitch = Math.max(-0.5, Math.min(0.7, pitch));
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("pointercancel", () => { dragging = false; });

  canvas.addEventListener("wheel", (e) => {
    explodeTarget = Math.max(0, Math.min(1, explodeTarget + e.deltaY * 0.0008));
  }, { passive: true });

  function setSize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  setSize();
  window.addEventListener("resize", setSize);

  let paused = false;
  const observer = new IntersectionObserver(([e]) => { paused = !e.isIntersecting; }, { threshold: 0 });
  observer.observe(canvas);

  let t = 0;
  function tick() {
    requestAnimationFrame(tick);
    if (paused) return;
    t += 0.016;
    if (autoExplode) explodeTarget = (Math.sin(t * 0.6) * 0.5 + 0.5);
    explode += (explodeTarget - explode) * 0.07;

    for (const [id, axis] of Object.entries(explodeAxes)) {
      const m = partMeshes[id]; if (!m) continue;
      const base = baseOffsets[id];
      m.position.set(
        base.x + axis.x * explode,
        base.y + axis.y * explode,
        base.z + axis.z * explode,
      );
      const isHi = highlightId === id;
      m.traverse(child => {
        if (child.isMesh && child.material) {
          if (!child.material.userData.origEmissive) {
            child.material.userData.origEmissive = child.material.emissive
              ? child.material.emissive.clone()
              : new THREE.Color(0);
          }
          if (isHi && child.material.emissive) {
            child.material.emissive.setHex(0x10cf90);
            child.material.emissiveIntensity = 0.4;
          } else if (child.material.emissive) {
            child.material.emissive.copy(child.material.userData.origEmissive);
            child.material.emissiveIntensity = 0;
          }
        }
      });
    }

    if (!dragging) yaw += 0.0014;
    assembly.rotation.y = yaw;
    assembly.rotation.x = pitch;

    renderer.render(scene, camera);
  }
  tick();

  return {
    setExplode(v) { explodeTarget = Math.max(0, Math.min(1, v)); },
    setHighlight(id) { highlightId = id; },
    toggleAuto() { autoExplode = !autoExplode; return autoExplode; },
    reset() { explodeTarget = 0; yaw = 0.5; pitch = 0.22; autoExplode = false; },
  };
}
