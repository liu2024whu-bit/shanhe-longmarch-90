function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

export const JOURNEY_TRAIL_WINDOW = Object.freeze({
  behind: 0.018,
  ahead: 0.012,
});

export function journeyTrailStrokeState(progress, window = JOURNEY_TRAIL_WINDOW) {
  const safeProgress = clamp01(progress);
  if (safeProgress >= 1) {
    return Object.freeze({
      progress: 1,
      travelled: Object.freeze({ start: 0, length: 1 }),
      band: Object.freeze({ start: 1, length: 0 }),
      finished: true,
    });
  }

  const behind = Math.max(0, Number(window?.behind) || 0);
  const ahead = Math.max(0, Number(window?.ahead) || 0);
  const bandStart = clamp01(safeProgress - behind);
  const bandEnd = clamp01(safeProgress + ahead);
  return Object.freeze({
    progress: safeProgress,
    travelled: Object.freeze({ start: 0, length: safeProgress }),
    band: Object.freeze({ start: bandStart, length: Math.max(0, bandEnd - bandStart) }),
    finished: false,
  });
}
