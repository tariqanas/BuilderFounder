export const MATCH_SCORE_THRESHOLD = 70;

export function resolveMatchScoreThreshold(value: number | undefined) {
  if (Number.isFinite(value) && (value as number) >= 0) {
    return Math.min(100, value as number);
  }

  return MATCH_SCORE_THRESHOLD;
}
