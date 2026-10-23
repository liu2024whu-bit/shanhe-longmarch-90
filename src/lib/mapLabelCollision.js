export function iconRectAt(point, iconSize, iconAnchor) {
  const x = Number(point?.x ?? point?.[0] ?? 0);
  const y = Number(point?.y ?? point?.[1] ?? 0);
  const width = Math.max(0, Number(iconSize?.[0] ?? 0));
  const height = Math.max(0, Number(iconSize?.[1] ?? 0));
  const anchorX = Number(iconAnchor?.[0] ?? width / 2);
  const anchorY = Number(iconAnchor?.[1] ?? height / 2);
  return {
    left: x - anchorX,
    top: y - anchorY,
    right: x - anchorX + width,
    bottom: y - anchorY + height,
  };
}

export function rectsOverlap(first, second, padding = 0) {
  const gap = Math.max(0, Number(padding) || 0);
  return !(
    first.right + gap <= second.left
    || first.left >= second.right + gap
    || first.bottom + gap <= second.top
    || first.top >= second.bottom + gap
  );
}

export function selectNonOverlapping(candidates, { reserved = [], padding = 4 } = {}) {
  const ranked = candidates
    .map((candidate, index) => ({ ...candidate, order: index }))
    .sort((first, second) => second.priority - first.priority || first.order - second.order);
  const occupied = [...reserved];
  const acceptedIds = new Set();
  for (const candidate of ranked) {
    if (occupied.some((rect) => rectsOverlap(candidate.rect, rect, padding))) continue;
    acceptedIds.add(candidate.id);
    occupied.push(candidate.rect);
  }
  return { acceptedIds, occupied };
}

