// "How It Works" interactive 2D canvas: blade tip -> blade root -> hub -> tower -> SLPS -> ground.
// Toggle: With SLPS (controlled green flow) vs Without (chaotic red sparks + dropouts).

import { makeBoltPath, drawBolt } from "./lightning.js";

export function initHowScene(canvas, opts = {}) {
  const ctx = canvas.getContext("2d");
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let mode = "on"; // "on" = with SLPS, "off" = without
  let activeStep = 1;
  let mouseY = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  // path nodes (relative coordinates)
  const nodes = [
    { id: "tip",   key: "Blade tip",   step: 1 },
    { id: "root",  key: "Blade root",  step: 2 },
    { id: "hub",   key: "Hub",         step: 2 },
    { id: "joint", key: "Rotating joint (SLPS)", step: 3 },
    { id: "tower", key: "Tower",       step: 4 },
    { id: "earth", key: "Foundation grid", step: 4 },
  ];

  function nodePositions() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    return {
      tip:   { x: w * 0.18, y: h * 0.10 },
      root:  { x: w * 0.40, y: h * 0.42 },
      hub:   { x: w * 0.50, y: h * 0.46 },
      joint: { x: w * 0.50, y: h * 0.55 },
      tower: { x: w * 0.50, y: h * 0.78 },
      earth: { x: w * 0.50, y: h * 0.94 },
      sky:   { x: w * 0.06, y: h * -0.05 },
    };
  }

  // particle "energy" along the path
  const flowParticles = [];
  function spawnFlow() {
    flowParticles.push({ t: 0, speed: 0.6 + Math.random() * 0.6 });
  }

  // sparks (Without SLPS)
  const sparks = [];
  function emitSparks(p, n = 14) {
    for (let i = 0; i < n; i++) {
      sparks.push({
        x: p.x, y: p.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 1,
        life: 0.8 + Math.random() * 0.4,
        age: 0,
      });
    }
  }

  let nextStrike = 0.6;
  let strike = null;
  const strikePathBase = ["tip", "root", "hub", "joint", "tower", "earth"];

  // background grid pattern
  function drawBackground() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(11,17,24,0.95)");
    g.addColorStop(0.6, "rgba(7,11,16,0.95)");
    g.addColorStop(1, "rgba(4,7,10,1)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // ground line
    ctx.fillStyle = "rgba(16,207,144,0.06)";
    ctx.fillRect(0, h * 0.92, w, h * 0.08);
    ctx.strokeStyle = "rgba(16,207,144,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h * 0.92); ctx.lineTo(w, h * 0.92); ctx.stroke();

    // engineering grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }

  // turbine silhouette
  function drawTurbine(P) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    // tower
    ctx.fillStyle = "rgba(214,221,230,0.10)";
    ctx.strokeStyle = "rgba(214,221,230,0.45)";
    ctx.lineWidth = 1.5;
    const tx = P.tower.x;
    ctx.beginPath();
    ctx.moveTo(tx - 14, h * 0.92);
    ctx.lineTo(tx - 5, P.hub.y + 8);
    ctx.lineTo(tx + 5, P.hub.y + 8);
    ctx.lineTo(tx + 14, h * 0.92);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // nacelle
    ctx.fillStyle = "rgba(214,221,230,0.12)";
    ctx.fillRect(P.hub.x - 26, P.hub.y - 10, 52, 18);
    ctx.strokeRect(P.hub.x - 26, P.hub.y - 10, 52, 18);

    // hub circle
    ctx.beginPath();
    ctx.arc(P.hub.x, P.hub.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fill(); ctx.stroke();

    // blade
    ctx.beginPath();
    ctx.moveTo(P.hub.x, P.hub.y);
    ctx.bezierCurveTo(P.hub.x - 30, P.hub.y - 30, P.tip.x + 30, P.tip.y + 30, P.tip.x, P.tip.y);
    ctx.lineTo(P.tip.x - 4, P.tip.y + 6);
    ctx.bezierCurveTo(P.tip.x + 26, P.tip.y + 36, P.hub.x - 26, P.hub.y - 24, P.hub.x, P.hub.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(234,240,246,0.10)";
    ctx.strokeStyle = "rgba(234,240,246,0.45)";
    ctx.fill(); ctx.stroke();

    // SLPS module
    const j = P.joint;
    ctx.save();
    if (mode === "on") {
      ctx.shadowColor = "rgba(46,227,168,0.85)"; ctx.shadowBlur = 18;
      ctx.fillStyle = "rgba(16,207,144,0.95)";
    } else {
      ctx.shadowColor = "rgba(255,91,110,0.5)"; ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(60,72,84,0.7)";
    }
    ctx.fillRect(j.x - 18, j.y - 8, 36, 16);
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText("SLPS", j.x - 14, j.y + 4);

    // foundation
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(P.tower.x - 28, h * 0.92 - 4, 56, 8);

    // labels
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = "rgba(148,163,184,0.85)";
    ctx.fillText("BLADE TIP RECEPTOR", P.tip.x - 10, P.tip.y - 10);
    ctx.fillText("HUB", P.hub.x + 14, P.hub.y - 12);
    ctx.fillText("FOUNDATION GRID", P.tower.x + 22, h * 0.93 + 4);
  }

  // path between nodes — bezier-ish via straight segments
  function getPathPoints(P) {
    return strikePathBase.map(k => P[k]);
  }
  function lerpAlongPath(points, t) {
    // t in [0,1]
    const segs = points.length - 1;
    const u = t * segs;
    const i = Math.min(Math.floor(u), segs - 1);
    const f = u - i;
    return {
      x: points[i].x + (points[i+1].x - points[i].x) * f,
      y: points[i].y + (points[i+1].y - points[i].y) * f,
    };
  }

  function drawPath(points, color, alpha = 0.35, width = 2) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function frame(time) {
    const dt = Math.min((time - (frame.last || time)) / 1000, 0.05);
    frame.last = time;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const P = nodePositions();
    drawBackground();

    // schedule strikes
    nextStrike -= dt;
    if (nextStrike <= 0 && !strike) {
      strike = { age: 0, dur: 0.55 };
      // sky bolt path
      const segs = makeBoltPath(P.sky, P.tip, { detail: 6, displace: 110, branchProb: 0.22 });
      strike.bolt = segs;
      // trigger flash
      if (opts.onStrike) opts.onStrike();
      nextStrike = 2.8 + Math.random() * 2;
    }
    if (strike) {
      strike.age += dt;
      const a = Math.max(0, 1 - strike.age / strike.dur);
      drawBolt(ctx, strike.bolt, "#cfeaff", 2);
      // momentary additive glow
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(180,220,255,${0.18 * a})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      if (strike.age > 0.18 && !strike.energized) {
        strike.energized = true;
        if (mode === "on") {
          for (let k = 0; k < 12; k++) spawnFlow();
        } else {
          // chaotic: emit sparks at hub, joint and tower randomly + skip flow
          emitSparks(P.hub, 18);
          emitSparks(P.joint, 22);
          if (Math.random() < 0.6) emitSparks(P.tower, 14);
        }
      }
      if (strike.age >= strike.dur) strike = null;
    }

    // turbine
    drawTurbine(P);

    // path overlay
    const pts = getPathPoints(P);
    if (mode === "on") {
      drawPath(pts, "rgba(46,227,168,0.5)", 1.0, 3);
      drawPath(pts, "rgba(192,255,233,0.9)", 0.5, 1);
    } else {
      // dashed broken path
      ctx.save();
      ctx.setLineDash([6, 6]);
      drawPath(pts, "rgba(255,91,110,0.45)", 1, 2);
      ctx.restore();
      // gap at joint to show air-gap failure
      ctx.fillStyle = "rgba(255,91,110,0.45)";
      ctx.beginPath(); ctx.arc(P.joint.x, P.joint.y, 14, 0, Math.PI * 2); ctx.fill();
    }

    // active step highlight
    const stepNode = activeStep === 1 ? P.tip
                  : activeStep === 2 ? P.hub
                  : activeStep === 3 ? P.joint
                  : P.earth;
    ctx.save();
    ctx.beginPath();
    ctx.arc(stepNode.x, stepNode.y, 26, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(46,227,168,0.6)"; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(stepNode.x, stepNode.y, 18 + Math.sin(time * 0.005) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(46,227,168,0.3)";
    ctx.stroke();
    ctx.restore();

    // flow particles (with-SLPS) — flow from tip to ground
    if (mode === "on") {
      // ambient idle stream
      if (Math.random() < 0.18) spawnFlow();
      for (let i = flowParticles.length - 1; i >= 0; i--) {
        const p = flowParticles[i];
        p.t += p.speed * dt * 0.9;
        if (p.t >= 1) { flowParticles.splice(i, 1); continue; }
        const pos = lerpAlongPath(pts, p.t);
        const trail = 0.05;
        const tail = lerpAlongPath(pts, Math.max(0, p.t - trail));
        ctx.save();
        ctx.strokeStyle = "rgba(46,227,168,0.85)";
        ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(46,227,168,0.9)";
        ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
        ctx.fillStyle = "rgba(192,255,233,1)";
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    // sparks (without-SLPS)
    if (mode === "off") {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.age += dt;
        s.x += s.vx; s.y += s.vy;
        s.vy += 0.15; // gravity
        s.vx *= 0.96;
        if (s.age > s.life) { sparks.splice(i, 1); continue; }
        const a = 1 - s.age / s.life;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = `rgba(255,140,90,${a})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = "rgba(255,90,60,1)"; ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(255,90,60,${a*0.6})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setMode(m) { mode = m; flowParticles.length = 0; sparks.length = 0; },
    setStep(s) { activeStep = s; },
  };
}
