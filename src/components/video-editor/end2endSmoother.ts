import type { End2EndParams } from "./types";

type InputEvent = {
  tMs: number;
  x: number; // display pixels
  y: number; // display pixels
  kind: 'move' | 'down' | 'up';
  dragging: boolean;
};

export function extractPausePointsFromDisplayEvents(
  events: InputEvent[],
  params: End2EndParams,
): { tMs: number; x: number; y: number }[] {
  const { dwellTimeMs, stillEpsilonPx } = params;

  const pausePoints: { tMs: number; x: number; y: number }[] = [];

  enum State { MOVING = 0, DWELLING = 1 }
  let state = State.MOVING;

  let windowEvents: InputEvent[] = [];
  let lastMoveIndexBeforeDwell: number | null = null;

  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i];
    if (ev.kind !== 'move') {
      // ignore non-move for pause point extraction
      continue;
    }

    // append to sliding window and evict old entries
    windowEvents.push(ev);
    const windowStart = ev.tMs - dwellTimeMs;
    while (windowEvents.length > 0 && windowEvents[0].tMs < windowStart) {
      windowEvents.shift();
    }

    // compute max displacement in window
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const w of windowEvents) {
      if (w.x < minX) minX = w.x;
      if (w.x > maxX) maxX = w.x;
      if (w.y < minY) minY = w.y;
      if (w.y > maxY) maxY = w.y;
    }
    if (minX === Infinity) continue;
    const dx = maxX - minX;
    const dy = maxY - minY;
    const maxDisp = Math.hypot(dx, dy);
    const isStill = maxDisp <= stillEpsilonPx;

    if (state === State.MOVING) {
      if (isStill) {
        // Enter dwelling - remember last move index before dwell
        state = State.DWELLING;
        lastMoveIndexBeforeDwell = i; // candidate; final pause point will be emitted when motion resumes
      }
    } else {
      // state === DWELLING
      if (!isStill) {
        // Movement resumed: emit pause point using the last move index recorded before dwell.
        if (lastMoveIndexBeforeDwell != null) {
          const p = events[lastMoveIndexBeforeDwell];
          pausePoints.push({ tMs: p.tMs, x: p.x, y: p.y });
        }
        // Reset state to MOVING
        state = State.MOVING;
        windowEvents = [ev];
        lastMoveIndexBeforeDwell = null;
      } else {
        // still dwelling; we keep waiting
      }
    }
  }

  // If no pause points were detected but events exist, fall back to last event
  if (pausePoints.length === 0 && events.length > 0) {
    const last = events[events.length - 1];
    pausePoints.push({ tMs: last.tMs, x: last.x, y: last.y });
  }

  // Ensure ascending order by time
  pausePoints.sort((a, b) => a.tMs - b.tMs);
  return pausePoints;
}


// Centripetal Catmull-Rom evaluation utilities (alpha = 0.5)
function powDist(a: { x: number; y: number }, b: { x: number; y: number }, alpha: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.pow(Math.hypot(dx, dy), alpha);
}

function interpolate(p0: { x: number; y: number }, p1: { x: number; y: number }, t0: number, t1: number, t: number) {
  const denom = t1 - t0;
  if (Math.abs(denom) < 1e-9) return { x: p0.x, y: p0.y };
  const s = (t - t0) / denom;
  return { x: p0.x + (p1.x - p0.x) * s, y: p0.y + (p1.y - p0.y) * s };
}

// Evaluate Catmull-Rom point on segment between P1..P2 with centripetal parameterization.
// u is normalized in [0,1] mapping to t in [t1,t2] where t_j are chord-length params.
export function evalCentripetalCRSegment(
  P0: { x: number; y: number },
  P1: { x: number; y: number },
  P2: { x: number; y: number },
  P3: { x: number; y: number },
  u: number,
  alpha = 0.5,
) {
  // chord parameters
  const t0 = 0;
  const t1 = t0 + powDist(P0, P1, alpha);
  const t2 = t1 + powDist(P1, P2, alpha);
  const t3 = t2 + powDist(P2, P3, alpha);

  // map u in [0,1] to t in [t1,t2]
  const t = t1 + (t2 - t1) * u;

  // handle degenerate cases: if t2==t1, fallback linear interpolation
  if (Math.abs(t2 - t1) < 1e-9) {
    return { x: P1.x, y: P1.y };
  }

  // standard De Casteljau-like evaluation for CR using parameter t
  const A1 = interpolate(P0, P1, t0, t1, t);
  const A2 = interpolate(P1, P2, t1, t2, t);
  const A3 = interpolate(P2, P3, t2, t3, t);

  const B1 = interpolate(A1, A2, t0, t2, t);
  const B2 = interpolate(A2, A3, t1, t3, t);

  const C = interpolate(B1, B2, t1, t2, t);
  return C;
}

// Given pausePoints (at least 1), evaluate position at playheadMs.
export function evaluatePositionOnCRByTime(
  pausePoints: { tMs: number; x: number; y: number }[],
  playheadMs: number,
  arrivalFraction = 1.0,
) {
  if (!pausePoints || pausePoints.length === 0) return null;
  if (pausePoints.length === 1) return { x: pausePoints[0].x, y: pausePoints[0].y };

  // clamp playhead to bounds
  if (playheadMs <= pausePoints[0].tMs) {
    return { x: pausePoints[0].x, y: pausePoints[0].y };
  }
  if (playheadMs >= pausePoints[pausePoints.length - 1].tMs) {
    const last = pausePoints[pausePoints.length - 1];
    return { x: last.x, y: last.y };
  }

  // find segment i where ti <= playheadMs <= ti+1
  let i = 0;
  for (let k = 0; k < pausePoints.length - 1; k += 1) {
    if (playheadMs >= pausePoints[k].tMs && playheadMs <= pausePoints[k + 1].tMs) {
      i = k;
      break;
    }
  }

  const P1 = pausePoints[i];
  const P2 = pausePoints[i + 1];
  const ti = P1.tMs;
  const ti1 = P2.tMs;
  const raw = (playheadMs - ti) / (ti1 - ti);
  // arrivalFraction defines portion of the segment time used to move between points.
  // If raw <= arrivalFraction: map into movement phase [0,1] and evaluate spline.
  // If raw > arrivalFraction: we are in waiting phase at Pi+1 (hold at destination).
  const u = raw <= arrivalFraction ? (arrivalFraction > 0 ? raw / arrivalFraction : 1) : 1;

  if (raw > arrivalFraction) {
    // hold at Pi+1 exactly
    return { x: P2.x, y: P2.y };
  }

  // select neighbors P0 and P3 for CR evaluation (duplicate endpoints when missing)
  const P0 = i - 1 >= 0 ? pausePoints[i - 1] : P1;
  const P3 = i + 2 < pausePoints.length ? pausePoints[i + 2] : P2;

  // evaluate CR at normalized u
  const pos = evalCentripetalCRSegment(
    { x: P0.x, y: P0.y },
    { x: P1.x, y: P1.y },
    { x: P2.x, y: P2.y },
    { x: P3.x, y: P3.y },
    u,
    0.5,
  );
  return pos;
}

// Sample CR path into a polyline for drawing. samplesPerSegment controls density.
export function sampleCRPath(
  pausePoints: { tMs: number; x: number; y: number }[],
  samplesPerSegment = 8,
) {
  const pts: { x: number; y: number }[] = [];
  if (!pausePoints || pausePoints.length === 0) return pts;
  if (pausePoints.length === 1) {
    pts.push({ x: pausePoints[0].x, y: pausePoints[0].y });
    return pts;
  }

  for (let i = 0; i < pausePoints.length - 1; i += 1) {
    const P1 = pausePoints[i];
    const P2 = pausePoints[i + 1];
    const P0 = i - 1 >= 0 ? pausePoints[i - 1] : P1;
    const P3 = i + 2 < pausePoints.length ? pausePoints[i + 2] : P2;

    // sample from u=0..1 inclusive; avoid duplicating endpoints except first
    for (let s = 0; s <= samplesPerSegment; s += 1) {
      const u = s / samplesPerSegment;
      const p = evalCentripetalCRSegment(
        { x: P0.x, y: P0.y },
        { x: P1.x, y: P1.y },
        { x: P2.x, y: P2.y },
        { x: P3.x, y: P3.y },
        u,
        0.5,
      );
      // skip duplicate of previous end except for first segment
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        if (Math.hypot(last.x - p.x, last.y - p.y) < 1e-6) continue;
      }
      pts.push(p);
    }
  }
  return pts;
}



