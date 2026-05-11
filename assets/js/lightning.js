// Procedural lightning bolt path generator + 2D canvas drawing helpers.
// Used by the mouse-arc canvas + lightning flash effects.

export function makeBoltPath(from, to, opts = {}) {
  const { detail = 5, displace = 90, branchProb = 0.18 } = opts;
  let segments = [{ from, to }];
  let d = displace;
  for (let i = 0; i < detail; i++) {
    const next = [];
    for (const s of segments) {
      const mx = (s.from.x + s.to.x) / 2;
      const my = (s.from.y + s.to.y) / 2;
      const dx = s.to.x - s.from.x;
      const dy = s.to.y - s.from.y;
      // perpendicular jitter
      const len = Math.hypot(dx, dy) || 1;
      const px = -dy / len, py = dx / len;
      const jitter = (Math.random() - 0.5) * d;
      const mid = { x: mx + px * jitter, y: my + py * jitter };
      next.push({ from: s.from, to: mid });
      next.push({ from: mid, to: s.to });
      // forks
      if (i > 1 && Math.random() < branchProb) {
        const branchEnd = {
          x: mid.x + (s.to.x - mid.x) * 0.55 + (Math.random() - 0.5) * 60,
          y: mid.y + (s.to.y - mid.y) * 0.55 + (Math.random() - 0.5) * 60,
        };
        next.push({ from: mid, to: branchEnd, branch: true });
      }
    }
    segments = next;
    d *= 0.55;
  }
  return segments;
}

export function drawBolt(ctx, segments, color = "#9ed8ff", widthBase = 2.5) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  // outer glow pass
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = widthBase * 4;
  ctx.beginPath();
  for (const s of segments) {
    if (s.branch) continue;
    ctx.moveTo(s.from.x, s.from.y);
    ctx.lineTo(s.to.x, s.to.y);
  }
  ctx.stroke();
  // inner core
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = widthBase;
  ctx.strokeStyle = "#f4fbff";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (const s of segments) {
    ctx.moveTo(s.from.x, s.from.y);
    ctx.lineTo(s.to.x, s.to.y);
  }
  ctx.stroke();
  ctx.restore();
}

// 3D version returning array of Vector3 points
export function makeBoltPath3D(THREE, from, to, opts = {}) {
  const { detail = 6, displace = 1.4 } = opts;
  let pts = [from.clone(), to.clone()];
  let d = displace;
  for (let i = 0; i < detail; i++) {
    const next = [];
    for (let j = 0; j < pts.length - 1; j++) {
      const a = pts[j], b = pts[j + 1];
      const mid = a.clone().lerp(b, 0.5);
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * d,
        (Math.random() - 0.5) * d * 0.4,
        (Math.random() - 0.5) * d
      );
      mid.add(offset);
      next.push(a, mid);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    d *= 0.55;
  }
  return pts;
}
