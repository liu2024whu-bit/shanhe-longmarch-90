const BOUNDS = {
  minLon: 90,
  maxLon: 106,
  minLat: 21,
  maxLat: 37,
};

export function projectPoint(lon, lat, width = 1600, height = 900) {
  const paddingX = width * 0.07;
  const paddingY = height * 0.08;
  const usableW = width - paddingX * 2;
  const usableH = height - paddingY * 2;
  const x = paddingX + ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * usableW;
  const y = paddingY + ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * usableH;
  return { x, y };
}

export function routePath(nodes, width = 1600, height = 900) {
  const points = nodes
    .filter(Boolean)
    .map((node) => projectPoint(node.lon, node.lat, width, height))
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");
  }

  const commands = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const c1 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };
    const c2 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };
    commands.push(
      `C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
    );
  }
  return commands.join(" ");
}

export function haversineKm(a, b) {
  const earthKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

export function routeLengthKm(nodes) {
  let total = 0;
  for (let index = 1; index < nodes.length; index += 1) {
    total += haversineKm(nodes[index - 1], nodes[index]);
  }
  return Math.round(total);
}

function coordinateDistanceSquared(a, b) {
  const averageLat = (((a.lat ?? 0) + (b.lat ?? 0)) / 2) * (Math.PI / 180);
  const lonScale = Math.max(0.25, Math.cos(averageLat));
  const dx = ((a.lon ?? 0) - (b.lon ?? 0)) * lonScale;
  const dy = (a.lat ?? 0) - (b.lat ?? 0);
  return dx * dx + dy * dy;
}

function pointToSegmentDistance(point, start, end) {
  const averageLat = (((point.lat ?? 0) + (start.lat ?? 0) + (end.lat ?? 0)) / 3) * (Math.PI / 180);
  const lonScale = Math.max(0.25, Math.cos(averageLat));
  const px = point.lon * lonScale;
  const py = point.lat;
  const sx = start.lon * lonScale;
  const sy = start.lat;
  const ex = end.lon * lonScale;
  const ey = end.lat;
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
  const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSquared));
  return Math.sqrt((px - (sx + t * dx)) ** 2 + (py - (sy + t * dy)) ** 2);
}

function simplifySegment(points, tolerance) {
  if (points.length <= 2 || tolerance <= 0) return [...points];

  let maxDistance = 0;
  let maxIndex = -1;
  const first = points[0];
  const last = points.at(-1);

  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointToSegmentDistance(points[index], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }

  if (maxDistance <= tolerance || maxIndex === -1) return [first, last];

  const before = simplifySegment(points.slice(0, maxIndex + 1), tolerance);
  const after = simplifySegment(points.slice(maxIndex), tolerance);
  return [...before.slice(0, -1), ...after];
}

function findAnchorIndex(points, anchor) {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const distance = coordinateDistanceSquared(points[index], anchor);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestDistance <= 0.0025 ? bestIndex : -1;
}

export function routeSimplificationTolerance(zoom) {
  if (zoom < 5.8) return 0.34;
  if (zoom < 6.35) return 0.25;
  if (zoom < 7.1) return 0.16;
  if (zoom < 7.85) return 0.11;
  if (zoom < 8.75) return 0.07;
  if (zoom < 10) return 0.03;
  return 0.01;
}

export function simplifyRouteForZoom(points, zoom, anchors = []) {
  if (!Array.isArray(points) || points.length <= 2) return points ? [...points] : [];

  const tolerance = routeSimplificationTolerance(zoom);
  const anchorIndexes = new Set([0, points.length - 1]);
  for (const anchor of anchors) {
    const index = findAnchorIndex(points, anchor);
    if (index >= 0) anchorIndexes.add(index);
  }

  const sortedAnchors = [...anchorIndexes].sort((a, b) => a - b);
  const simplified = [];

  for (let index = 1; index < sortedAnchors.length; index += 1) {
    const start = sortedAnchors[index - 1];
    const end = sortedAnchors[index];
    const segment = simplifySegment(points.slice(start, end + 1), tolerance);
    simplified.push(...(simplified.length ? segment.slice(1) : segment));
  }

  return simplified;
}

function reflectedEndpoint(point, neighbour) {
  return {
    lon: point.lon * 2 - neighbour.lon,
    lat: point.lat * 2 - neighbour.lat,
  };
}

function curveTime(from, to, previousTime) {
  const distance = Math.hypot(to.lon - from.lon, to.lat - from.lat);
  return previousTime + Math.sqrt(Math.max(distance, 1e-8));
}

function interpolateCoordinate(from, to, time, fromTime, toTime, key) {
  const span = Math.max(toTime - fromTime, 1e-8);
  return ((toTime - time) / span) * from[key] + ((time - fromTime) / span) * to[key];
}

function centripetalCatmullRomPoint(p0, p1, p2, p3, progress, corridorBounded=false) {
  const t0 = 0;
  const t1 = curveTime(p0, p1, t0);
  const t2 = curveTime(p1, p2, t1);
  const t3 = curveTime(p2, p3, t2);
  const time = t1 + (t2 - t1) * progress;
  const result = {};

  for (const key of ["lon", "lat"]) {
    const a1 = interpolateCoordinate(p0, p1, time, t0, t1, key);
    const a2 = interpolateCoordinate(p1, p2, time, t1, t2, key);
    const a3 = interpolateCoordinate(p2, p3, time, t2, t3, key);
    const b1 = ((t2 - time) / (t2 - t0)) * a1 + ((time - t0) / (t2 - t0)) * a2;
    const b2 = ((t3 - time) / (t3 - t1)) * a2 + ((time - t1) / (t3 - t1)) * a3;
    const coordinate = ((t2 - time) / (t2 - t1)) * b1 + ((time - t1) / (t2 - t1)) * b2;
    // Geographic control points may be very unevenly spaced. Centripetal
    // timing removes loops; this interval clamp also prevents a decorative
    // overshoot from inventing a detour beyond the two retained anchors.
    result[key] = corridorBounded ? coordinate : Math.min(Math.max(coordinate, Math.min(p1[key], p2[key])), Math.max(p1[key], p2[key]));
  }
  return result;
}

export function smoothRouteForDisplay(points, zoom, corridorBounded=false) {
  if (!Array.isArray(points) || points.length <= 2 || zoom >= 11.5) {
    return points ? [...points] : [];
  }

  // Leaflet ultimately draws straight segments, so the curve must be densely
  // sampled before it reaches the renderer.  The map used to keep only three
  // to six samples and Leaflet then simplified them again; at recording zooms
  // the line visibly snapped back into a chain of hard bends.
  const samplesPerSegment = zoom < 6.1 ? 14 : zoom < 7.4 ? 11 : zoom < 9.2 ? 8 : 5;
  const smoothed = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p1 = points[index];
    const p2 = points[index + 1];
    const p0 = index > 0 ? points[index - 1] : reflectedEndpoint(p1, p2);
    const p3 = index + 2 < points.length ? points[index + 2] : reflectedEndpoint(p2, p1);
    for (let sample = 0; sample < samplesPerSegment; sample += 1) {
      const t = sample / samplesPerSegment;
      smoothed.push(centripetalCatmullRomPoint(p0, p1, p2, p3, t, corridorBounded));
    }
  }
  smoothed.push({ ...points.at(-1) });
  return smoothed;
}

export function pointAlongRoute(nodes, progress) {
  if (nodes.length < 2) return nodes[0];
  const segments = [];
  let total = 0;
  for (let index = 1; index < nodes.length; index += 1) {
    const length = haversineKm(nodes[index - 1], nodes[index]);
    if (length === 0) continue;
    segments.push({ from: nodes[index - 1], to: nodes[index], length });
    total += length;
  }
  // Consecutive historical records can describe a meeting at the same place.
  // Keep an arrived army on that anchor instead of interpolating a 0 / 0 leg.
  if (total === 0) return nodes[0];
  const target = Math.max(0, Math.min(1, progress)) * total;
  let walked = 0;
  for (const segment of segments) {
    if (walked + segment.length >= target) {
      const local = (target - walked) / segment.length;
      return {
        lon: segment.from.lon + (segment.to.lon - segment.from.lon) * local,
        lat: segment.from.lat + (segment.to.lat - segment.from.lat) * local,
      };
    }
    walked += segment.length;
  }
  return nodes.at(-1);
}

export function progressAlongRouteForPoint(nodes, point) {
  if (!Array.isArray(nodes) || nodes.length < 2 || !point) return 0;
  const segmentLengths = [];
  let total = 0;
  for (let index = 1; index < nodes.length; index += 1) {
    const length = haversineKm(nodes[index - 1], nodes[index]);
    segmentLengths.push(length);
    total += length;
  }
  if (total <= 0) return 0;

  let walked = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestProgress = 0;
  for (let index = 1; index < nodes.length; index += 1) {
    const start = nodes[index - 1];
    const end = nodes[index];
    const averageLat = ((point.lat + start.lat + end.lat) / 3) * (Math.PI / 180);
    const lonScale = Math.max(0.25, Math.cos(averageLat));
    const px = point.lon * lonScale;
    const py = point.lat;
    const sx = start.lon * lonScale;
    const sy = start.lat;
    const ex = end.lon * lonScale;
    const ey = end.lat;
    const dx = ex - sx;
    const dy = ey - sy;
    const lengthSquared = dx * dx + dy * dy;
    const local = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSquared));
    const projectedX = sx + local * dx;
    const projectedY = sy + local * dy;
    const distance = (px - projectedX) ** 2 + (py - projectedY) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestProgress = (walked + segmentLengths[index - 1] * local) / total;
    }
    walked += segmentLengths[index - 1];
  }
  return Math.max(0, Math.min(1, bestProgress));
}

export function routeSegmentBetweenAnchors(points, startAnchor, endAnchor) {
  if (!points.length || !startAnchor || !endAnchor) return [];

  const nearestIndex = (anchor) => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < points.length; index += 1) {
      const distance = coordinateDistanceSquared(points[index], anchor);
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    }
    return bestIndex;
  };

  const startIndex = nearestIndex(startAnchor);
  const endIndex = nearestIndex(endAnchor);
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return points.slice(from, to + 1);
}

