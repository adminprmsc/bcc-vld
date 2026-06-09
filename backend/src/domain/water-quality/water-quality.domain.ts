export function computePotabilityIndex(metrics: Record<string, unknown> = {}) {
  if (!metrics || typeof metrics !== 'object') {
    return { value: null, rating: 'pending' };
  }

  const thresholds = {
    ph: { ideal: 7, tolerance: 1.5 },
    turbidity: { ideal: 1, tolerance: 4 },
    tds: { ideal: 300, tolerance: 700 },
  };

  const keys = Object.keys(thresholds) as Array<keyof typeof thresholds>;
  let scoreSum = 0;
  let contributing = 0;

  keys.forEach((key) => {
    const value = Number(metrics[key]);
    if (!Number.isFinite(value)) {
      return;
    }

    const { ideal, tolerance } = thresholds[key];
    let score = 1;

    if (key === 'ph') {
      const delta = Math.abs(value - ideal);
      score = delta >= tolerance ? 0 : 1 - delta / tolerance;
    } else if (value <= ideal) {
      score = 1;
    } else if (value >= ideal + tolerance) {
      score = 0;
    } else {
      score = 1 - (value - ideal) / tolerance;
    }

    score = Math.max(0, Math.min(1, score));
    scoreSum += score;
    contributing += 1;
  });

  if (!contributing) {
    return { value: null, rating: 'pending' };
  }

  const averageScore = scoreSum / contributing;
  const value = Math.round(averageScore * 100);

  let rating = 'pending';
  if (value >= 85) {
    rating = 'excellent';
  } else if (value >= 70) {
    rating = 'good';
  } else if (value >= 50) {
    rating = 'fair';
  } else if (value !== null) {
    rating = 'poor';
  }

  return { value, rating };
}
