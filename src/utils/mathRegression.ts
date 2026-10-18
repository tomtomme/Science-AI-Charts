import { RegressionResult, RegressionType, TimelineDataPoint } from '../types';

/**
 * Calculates mathematical regressions for scatterplot data:
 * - Linear: y = m*x + b
 * - Exponential: y = a * e^(b*x)
 * - Power: y = a * x^b
 * - Polynomial: degree 2 (quadratic) y = a*x^2 + b*x + c
 * - LOESS: Locally Estimated Scatterplot Smoothing with tri-cube kernel
 *
 * All functions return the regression model curve points across the time range
 * and the coefficient of determination R² (0.00 to 1.00).
 */

export function calculateRegression(
  data: TimelineDataPoint[],
  type: RegressionType,
  steps = 100
): RegressionResult {
  // Sort data points by timestamp
  const sorted = [...data]
    .filter((d) => !isNaN(d.timestamp) && !isNaN(d.score) && d.score > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sorted.length < 3) {
    return {
      type,
      name: getRegressionName(type),
      r2: 0,
      formula: 'N/A',
      points: [],
    };
  }

  const minX = sorted[0].timestamp;
  const maxX = sorted[sorted.length - 1].timestamp;
  const rangeX = maxX - minX || 1;

  // Normalized x in [0, 1] for numerical stability
  const normData = sorted.map((d) => ({
    origX: d.timestamp,
    x: (d.timestamp - minX) / rangeX,
    y: d.score,
  }));

  const n = normData.length;
  const meanY = normData.reduce((acc, d) => acc + d.y, 0) / n;
  const ssTotal = normData.reduce((acc, d) => acc + Math.pow(d.y - meanY, 2), 0);

  let predictFn: (normX: number) => number;
  let formula = '';
  let modelName = getRegressionName(type);

  if (type === 'linear') {
    // y = m*x + b
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    for (const d of normData) {
      sumX += d.x;
      sumY += d.y;
      sumXY += d.x * d.y;
      sumX2 += d.x * d.x;
    }
    const denom = n * sumX2 - sumX * sumX;
    const m = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const b = (sumY - m * sumX) / n;

    predictFn = (nx) => m * nx + b;
    formula = `y = ${m >= 0 ? '+' : ''}${m.toFixed(2)}·t + ${b.toFixed(1)}`;
  } else if (type === 'exponential') {
    // y = a * e^(b*x) => ln(y) = ln(a) + b*x
    const validExp = normData.filter((d) => d.y > 0);
    if (validExp.length >= 3) {
      let sumX = 0;
      let sumLnY = 0;
      let sumXLnY = 0;
      let sumX2 = 0;
      for (const d of validExp) {
        const lnY = Math.log(d.y);
        sumX += d.x;
        sumLnY += lnY;
        sumXLnY += d.x * lnY;
        sumX2 += d.x * d.x;
      }
      const len = validExp.length;
      const denom = len * sumX2 - sumX * sumX;
      const b = denom !== 0 ? (len * sumXLnY - sumX * sumLnY) / denom : 0;
      const lnA = (sumLnY - b * sumX) / len;
      const a = Math.exp(lnA);

      predictFn = (nx) => a * Math.exp(b * nx);
      formula = `y = ${a.toFixed(1)} · e^(${b.toFixed(2)}·t)`;
    } else {
      predictFn = () => meanY;
      formula = `y = ${meanY.toFixed(1)}`;
    }
  } else if (type === 'power') {
    // y = a * x^b => map x from [1, 2] to avoid ln(0)
    const validPower = normData.filter((d) => d.y > 0);
    if (validPower.length >= 3) {
      let sumLnX = 0;
      let sumLnY = 0;
      let sumLnXLnY = 0;
      let sumLnX2 = 0;
      const len = validPower.length;
      for (const d of validPower) {
        const u = 1 + d.x; // shift to [1, 2]
        const lnX = Math.log(u);
        const lnY = Math.log(d.y);
        sumLnX += lnX;
        sumLnY += lnY;
        sumLnXLnY += lnX * lnY;
        sumLnX2 += lnX * lnX;
      }
      const denom = len * sumLnX2 - sumLnX * sumLnX;
      const b = denom !== 0 ? (len * sumLnXLnY - sumLnX * sumLnY) / denom : 0;
      const lnA = (sumLnY - b * sumLnX) / len;
      const a = Math.exp(lnA);

      predictFn = (nx) => a * Math.pow(1 + nx, b);
      formula = `y = ${a.toFixed(1)} · (1+t)^${b.toFixed(2)}`;
    } else {
      predictFn = () => meanY;
      formula = `y = ${meanY.toFixed(1)}`;
    }
  } else if (type === 'polynomial') {
    // Quadratic: y = a*x^2 + b*x + c
    // Solve standard 3x3 normal equations
    let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
    let t0 = 0, t1 = 0, t2 = 0;
    for (const d of normData) {
      const x = d.x;
      const x2 = x * x;
      s1 += x;
      s2 += x2;
      s3 += x2 * x;
      s4 += x2 * x2;
      t0 += d.y;
      t1 += x * d.y;
      t2 += x2 * d.y;
    }

    // Solve 3x3 linear system via Cramer's rule
    const det =
      s4 * (s2 * s0 - s1 * s1) -
      s3 * (s3 * s0 - s1 * s2) +
      s2 * (s3 * s1 - s2 * s2);

    if (Math.abs(det) > 1e-12) {
      const a =
        (t2 * (s2 * s0 - s1 * s1) -
          s3 * (t1 * s0 - s1 * t0) +
          s2 * (t1 * s1 - s2 * t0)) /
        det;
      const b =
        (s4 * (t1 * s0 - s1 * t0) -
          t2 * (s3 * s0 - s1 * s2) +
          s2 * (s3 * t0 - t1 * s2)) /
        det;
      const c =
        (s4 * (s2 * t0 - t1 * s1) -
          s3 * (s3 * t0 - t1 * s2) +
          t2 * (s3 * s1 - s2 * s2)) /
        det;

      predictFn = (nx) => a * nx * nx + b * nx + c;
      formula = `y = ${a.toFixed(1)}·t² + ${b.toFixed(1)}·t + ${c.toFixed(1)}`;
    } else {
      predictFn = () => meanY;
      formula = `y = ${meanY.toFixed(1)}`;
    }
  } else {
    // LOESS (Locally Estimated Scatterplot Smoothing)
    // Bandwidth span h (approx 50% of range or k nearest points)
    const span = Math.max(0.35, Math.min(0.65, 8 / n));
    predictFn = (nx) => {
      // Find distances to all points
      const dists = normData.map((d) => Math.abs(d.x - nx));
      const sortedDists = [...dists].sort((a, b) => a - b);
      const k = Math.min(dists.length - 1, Math.max(3, Math.floor(dists.length * span)));
      const maxDist = sortedDists[k] || 0.1;

      let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
      for (let i = 0; i < n; i++) {
        const u = dists[i] / maxDist;
        if (u < 1) {
          // Tri-cube weight kernel: (1 - u^3)^3
          const w = Math.pow(1 - Math.pow(u, 3), 3);
          const x = normData[i].x;
          const y = normData[i].y;
          sumW += w;
          sumWX += w * x;
          sumWY += w * y;
          sumWXX += w * x * x;
          sumWXY += w * x * y;
        }
      }

      if (sumW === 0) return meanY;
      const denom = sumW * sumWXX - sumWX * sumWX;
      if (Math.abs(denom) > 1e-10) {
        const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
        const intercept = (sumWY - slope * sumWX) / sumW;
        return slope * nx + intercept;
      }
      return sumWY / sumW;
    };
    formula = `LOESS (Span = ${(span * 100).toFixed(0)}%)`;
  }

  // Calculate R² (coefficient of determination)
  let ssRes = 0;
  for (const d of normData) {
    const yHat = predictFn(d.x);
    ssRes += Math.pow(d.y - yHat, 2);
  }

  let r2 = ssTotal > 0 ? 1 - ssRes / ssTotal : 0;
  // Clamp R² between 0 and 1
  r2 = Math.max(0, Math.min(0.999, r2));

  // Generate curve sample points
  const points: Array<{ x: number; y: number }> = [];
  for (let step = 0; step <= steps; step++) {
    const nx = step / steps;
    const timeX = minX + nx * rangeX;
    const valY = Math.max(0, predictFn(nx));
    points.push({ x: timeX, y: valY });
  }

  return {
    type,
    name: modelName,
    r2,
    formula,
    points,
  };
}

export function getRegressionName(type: RegressionType): string {
  switch (type) {
    case 'linear':
      return 'Linear';
    case 'exponential':
      return 'Exponential';
    case 'power':
      return 'Power';
    case 'polynomial':
      return 'Polynome (Grad 2)';
    case 'loess':
      return 'LOESS Smoothing';
    default:
      return 'Linear';
  }
}
