// SLPS landing — orchestrator. Wires hero scene, how-it-works simulation,
// exploded-view scene, scroll reveals, AEP slider, mouse-arc, sound, and form.

import { initHeroScene } from "./hero-scene.js";
import { initHowScene } from "./how-scene.js";
import { initExplodedScene, PARTS } from "./exploded-scene.js?v=2";
import { makeBoltPath, drawBolt } from "./lightning.js";

// =============================================================
// 1. HERO SCENE — three.js
// =============================================================
const heroCanvas = document.getElementById("hero-canvas");
const flashEl = document.getElementById("lightning-flash");
const hero = initHeroScene(heroCanvas);
hero.onFlash(() => {
  flashEl.classList.remove("flash");
  void flashEl.offsetWidth;
  flashEl.classList.add("flash");
  thunder();
});

// =============================================================
// 2. HOW IT WORKS — 2D canvas + toggle + step list
// =============================================================
const howCanvas = document.getElementById("how-canvas");
const how = initHowScene(howCanvas);
const toggleShell = document.getElementById("slps-toggle");
const readout = document.getElementById("how-readout");
toggleShell.dataset.mode = "on";
toggleShell.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]"); if (!btn) return;
  const m = btn.dataset.mode;
  toggleShell.dataset.mode = m;
  toggleShell.querySelectorAll(".toggle-btn").forEach(b => b.classList.toggle("is-active", b.dataset.mode === m));
  toggleShell.querySelectorAll(".toggle-btn").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === m));
  how.setMode(m);
  readout.innerHTML = m === "on"
    ? `<span class="text-volt-400">CURRENT PATH · STABLE</span><span class="text-slate-500">0 spark events · grounding impedance: low</span>`
    : `<span class="text-rose-300">CURRENT PATH · UNCONTROLLED</span><span class="text-slate-500">spark gaps firing · 2106/2118 alarms imminent</span>`;
});

// step cards
const stepCards = document.querySelectorAll("#how-steps .step-card");
stepCards.forEach(card => {
  card.addEventListener("mouseenter", () => activateStep(+card.dataset.step));
  card.addEventListener("focus", () => activateStep(+card.dataset.step));
  card.addEventListener("click", () => activateStep(+card.dataset.step));
});
function activateStep(n) {
  stepCards.forEach(c => c.classList.toggle("is-active", +c.dataset.step === n));
  how.setStep(n);
}

// =============================================================
// 3. EXPLODED VIEW — three.js + part list
// =============================================================
const explodedCanvas = document.getElementById("exploded-canvas");
const exploded = initExplodedScene(explodedCanvas);
const partList = document.getElementById("part-list");
PARTS.forEach((p, i) => {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "part-row text-left";
  row.dataset.id = p.id;
  row.style.setProperty("--bg", p.color);
  row.innerHTML = `
    <span class="part-dot" style="background:${p.color}; box-shadow: 0 0 0 4px ${p.color}22;"></span>
    <div>
      <h4>${p.name}</h4>
      <div class="meta">${p.code}</div>
    </div>
    <span class="arrow">→</span>
  `;
  row.addEventListener("mouseenter", () => {
    document.querySelectorAll(".part-row").forEach(r => r.classList.remove("is-active"));
    row.classList.add("is-active");
    exploded.setHighlight(p.id);
  });
  row.addEventListener("mouseleave", () => exploded.setHighlight(null));
  partList.appendChild(row);
});
document.getElementById("explode-reset").addEventListener("click", () => exploded.reset());
document.getElementById("explode-toggle").addEventListener("click", (e) => {
  const on = exploded.toggleAuto();
  e.currentTarget.textContent = on ? "Auto: on" : "Auto-explode";
});

// scroll-driven explode amount
let scrollExplodeRaf = null;
function bindScrollExplode() {
  const section = document.getElementById("breakdown");
  function update() {
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const t = Math.max(0, Math.min(1, (vh - r.top) / (r.height + vh) * 1.6 - 0.1));
    exploded.setExplode(t);
    scrollExplodeRaf = null;
  }
  window.addEventListener("scroll", () => {
    if (scrollExplodeRaf) return;
    scrollExplodeRaf = requestAnimationFrame(update);
  }, { passive: true });
  update();
}
bindScrollExplode();

// =============================================================
// 4. SCROLL REVEALS via GSAP (loaded as defer global)
// =============================================================
function bootReveals() {
  if (!window.gsap || !window.ScrollTrigger) return setTimeout(bootReveals, 50);
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll("[data-reveal]").forEach((el, i) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.9, ease: "power2.out",
      delay: Math.min(0.2, i * 0.04),
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  // counters
  document.querySelectorAll("[data-counter]").forEach(el => {
    const target = parseFloat(el.dataset.counter);
    const dec = parseInt(el.dataset.decimals || 0, 10);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 2.2, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
      onUpdate: () => { el.textContent = obj.v.toFixed(dec); },
    });
  });
}
bootReveals();

// =============================================================
// 5. MOUSE-REACTIVE LIGHTNING ARCS
// =============================================================
(function initMouseArc() {
  const canvas = document.getElementById("mouse-arc");
  const ctx = canvas.getContext("2d");
  let dpr = Math.min(devicePixelRatio || 1, 2);
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  let mouse = { x: -9999, y: -9999, lastX: -9999, lastY: -9999, vel: 0 };
  const arcs = [];
  window.addEventListener("pointermove", (e) => {
    const dx = e.clientX - mouse.x, dy = e.clientY - mouse.y;
    mouse.vel = Math.hypot(dx, dy);
    mouse.lastX = mouse.x; mouse.lastY = mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (mouse.vel > 12 && Math.random() < 0.18) spawnArc();
  });

  function spawnArc() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 60;
    arcs.push({
      from: { x: mouse.x, y: mouse.y },
      to: { x: mouse.x + Math.cos(angle) * dist, y: mouse.y + Math.sin(angle) * dist },
      age: 0, life: 0.35,
    });
    if (arcs.length > 14) arcs.shift();
  }

  function tick() {
    requestAnimationFrame(tick);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      a.age += 1 / 60;
      if (a.age > a.life) { arcs.splice(i, 1); continue; }
      const segs = makeBoltPath(a.from, a.to, { detail: 4, displace: 28, branchProb: 0.05 });
      ctx.save();
      const k = 1 - a.age / a.life;
      ctx.globalAlpha = k * 0.85;
      drawBolt(ctx, segs, "#9ed8ff", 1.6 * k);
      ctx.restore();
    }
  }
  tick();
})();

// =============================================================
// 6. AEP COMPARE slider
// =============================================================
(function initAep() {
  const wrap = document.getElementById("aep-compare");
  if (!wrap) return;
  const track = wrap.querySelector(".aep-track");
  const without = wrap.querySelector(".aep-without");
  const handle = wrap.querySelector(".aep-handle");
  let dragging = false;
  function setPct(p) {
    p = Math.max(0, Math.min(100, p));
    handle.style.left = p + "%";
    without.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
    handle.setAttribute("aria-valuenow", Math.round(p));
  }
  function onPointer(e) {
    const r = track.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    setPct((cx / r.width) * 100);
  }
  track.addEventListener("pointerdown", (e) => { dragging = true; onPointer(e); });
  window.addEventListener("pointermove", (e) => { if (dragging) onPointer(e); });
  window.addEventListener("pointerup", () => { dragging = false; });
  handle.addEventListener("keydown", (e) => {
    const cur = +handle.getAttribute("aria-valuenow");
    if (e.key === "ArrowLeft") setPct(cur - 2);
    if (e.key === "ArrowRight") setPct(cur + 2);
  });
  setPct(50);
})();

// =============================================================
// 7. QUOTE FORM
// =============================================================
document.getElementById("quote-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const ok = document.getElementById("quote-success");
  ok.classList.remove("hidden");
  e.target.reset();
  setTimeout(() => ok.classList.add("hidden"), 6000);
});

// =============================================================
// 8. AMBIENT THUNDER (very subtle, opt-in)
// =============================================================
let audioCtx = null, audioOn = false;
const soundBtn = document.getElementById("sound-toggle");
const onIco = document.getElementById("sound-on-ico");
const offIco = document.getElementById("sound-off-ico");

soundBtn.addEventListener("click", () => {
  audioOn = !audioOn;
  onIco.classList.toggle("hidden", !audioOn);
  offIco.classList.toggle("hidden", audioOn);
  if (audioOn && !audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioOn) audioCtx.resume?.();
});

// crude thunder via filtered noise burst
function thunder() {
  if (!audioOn || !audioCtx) return;
  const dur = 1.4;
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const lp = audioCtx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220;
  const gain = audioCtx.createGain(); gain.gain.value = 0.0;
  gain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + dur);
  src.connect(lp).connect(gain).connect(audioCtx.destination);
  src.start();
}
