import { RegressionPoint, RegressionResult, RegressionType, TimelineDataPoint } from '../types';

/**
 * Extracts Pareto-frontier data points (breakthrough models that set a new benchmark record).
 */
export function extractFrontierPoints(data: TimelineDataPoint[]): TimelineDataPoint[] {
  const sorted = [...data]
    .filter((d) => !isNaN(d.timestamp) && !isNaN(d.score) && d.score > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  const frontier: TimelineDataPoint[] = [];
  let currentMax = -Infinity;

  for (const pt of sorted) {
    if (pt.score > currentMax) {
      currentMax = pt.score;
      frontier.push(pt);
    }
  }

  return frontier;
}

/**
 * Calculates mathematical regressions and trend models for timeline data:
 * - Linear: y = m·x + b
 * - Exponential: y = a · e^(b·x)
 * - Power: y = a · (1+x)^b
 * - Polynomial: degree 2, 3, or 4 (controlled by param)
 * - Moving Average: time-weighted Gaussian moving window (param = windowDays, e.g. 60)
 * - Logistic: Sigmoid growth curve y = L / (1 + e^(-k(x - x0)))
 * - LOESS: Locally Estimated Scatterplot Smoothing
 * - Frontier Envelope: Cumulative maximum frontier tracking record breakthroughs
 */
export function calculateRegression(
  data: TimelineDataPoint[],
  type: RegressionType,
  steps = 100,
  param = 60 // windowDays for movingAverage (default 60), degree for polynomial (default 2)
): RegressionResult {
  // Sort data points by timestamp
  const sorted = [...data]
    .filter((d) => !isNaN(d.timestamp) && !isNaN(d.score) && d.score > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sorted.length < 3) {
    return {
      type,
      name: getRegressionName(type, param),
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
  const modelName = getRegressionName(type, param);

  let linearM: number | null = null;
  let linearB: number | null = null;

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

    linearM = m;
    linearB = b;

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
    // Polynomial of degree d (2, 3, or 4)
    const degree = Math.max(2, Math.min(4, Math.round(param || 2)));
    const m = degree + 1;
    const A: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
    const B: number[] = Array(m).fill(0);

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        let sum = 0;
        for (const d of normData) sum += Math.pow(d.x, i + j);
        A[i][j] = sum;
      }
      let sumY = 0;
      for (const d of normData) sumY += d.y * Math.pow(d.x, i);
      B[i] = sumY;
    }

    // Solve system via Gauss-Jordan elimination
    let solvable = true;
    for (let i = 0; i < m; i++) {
      let pivot = i;
      for (let r = i + 1; r < m; r++) {
        if (Math.abs(A[r][i]) > Math.abs(A[pivot][i])) pivot = r;
      }
      if (Math.abs(A[pivot][i]) < 1e-12) {
        solvable = false;
        break;
      }
      [A[i], A[pivot]] = [A[pivot], A[i]];
      [B[i], B[pivot]] = [B[pivot], B[i]];

      const div = A[i][i];
      for (let c = i; c < m; c++) A[i][c] /= div;
      B[i] /= div;

      for (let r = 0; r < m; r++) {
        if (r !== i) {
          const factor = A[r][i];
          for (let c = i; c < m; c++) A[r][c] -= factor * A[i][c];
          B[r] -= factor * B[i];
        }
      }
    }

    if (solvable) {
      // B contains coeffs [c0, c1, c2, ...]
      predictFn = (nx) => {
        let val = 0;
        for (let i = 0; i < m; i++) val += B[i] * Math.pow(nx, i);
        return val;
      };

      if (degree === 2) {
        formula = `y = ${B[2].toFixed(1)}·t² + ${B[1].toFixed(1)}·t + ${B[0].toFixed(1)}`;
      } else if (degree === 3) {
        formula = `y = ${B[3].toFixed(1)}·t³ + ${B[2].toFixed(1)}·t² + ${B[1].toFixed(1)}·t + ${B[0].toFixed(1)}`;
      } else {
        formula = `y = ${B[4].toFixed(1)}·t⁴ + ${B[3].toFixed(1)}·t³ + ${B[2].toFixed(1)}·t² + ...`;
      }
    } else {
      predictFn = () => meanY;
      formula = `y = ${meanY.toFixed(1)}`;
    }
  } else if (type === 'movingAverage') {
    // Rolling Window Moving Average
    const windowDays = Math.max(7, Math.min(365, param || 60));
    const windowMs = windowDays * 86400000;
    const sigma = Math.max(0.02, (windowMs / rangeX) / 2); // Normalized Gaussian sigma

    predictFn = (nx) => {
      let sumW = 0;
      let sumWY = 0;
      for (let i = 0; i < n; i++) {
        const dx = Math.abs(normData[i].x - nx);
        // Gaussian kernel
        const w = Math.exp(-Math.pow(dx / sigma, 2) / 2);
        sumW += w;
        sumWY += w * normData[i].y;
      }
      return sumW > 1e-6 ? sumWY / sumW : meanY;
    };
    formula = `Gleitender Durchschnitt (${windowDays} Tage Fenster)`;
  } else if (type === 'logistic') {
    // Logistic S-Curve Model: y = L / (1 + e^(-k*(x - x0)))
    let bestFit: { L: number; k: number; b: number; rss: number } | null = null;
    let minResidual = Infinity;

    // Search upper asymptote L or use user-specified ceiling param
    const maxY = Math.max(...normData.map((d) => d.y));
    const userCeiling = param && param >= 50 && param <= 200 ? param : null;
    const candidates = userCeiling
      ? [Math.max(userCeiling, Math.ceil(maxY + 0.5))]
      : [
          Math.min(100, Math.ceil(maxY + 2)),
          Math.min(100, Math.ceil(maxY + 6)),
          Math.min(100, Math.ceil(maxY + 10)),
          85,
          90,
          95,
          100,
        ];
    const uniqueL = Array.from(new Set(candidates.filter((l) => l > maxY)));

    for (const L of uniqueL) {
      const valid = normData.filter((d) => d.y > 0 && d.y < L);
      if (valid.length < 3) continue;
      let sX = 0, sY = 0, sXY = 0, sX2 = 0;
      for (const d of valid) {
        const logit = Math.log(d.y / (L - d.y));
        sX += d.x;
        sY += logit;
        sXY += d.x * logit;
        sX2 += d.x * d.x;
      }
      const denom = valid.length * sX2 - sX * sX;
      if (denom === 0) continue;
      const k = (valid.length * sXY - sX * sY) / denom;
      const b = (sY - k * sX) / valid.length;

      let rss = 0;
      for (const d of valid) {
        const pred = L / (1 + Math.exp(-(k * d.x + b)));
        rss += Math.pow(d.y - pred, 2);
      }
      if (rss < minResidual) {
        minResidual = rss;
        bestFit = { L, k, b, rss };
      }
    }

    if (bestFit) {
      const { L, k, b } = bestFit;
      predictFn = (nx) => L / (1 + Math.exp(-(k * nx + b)));
      formula = `y = ${L.toFixed(0)} / (1 + e^(-${k.toFixed(2)}·t ${b >= 0 ? '+' : '-'} ${Math.abs(b).toFixed(1)}))`;
    } else {
      predictFn = () => meanY;
      formula = `y = ${meanY.toFixed(1)}`;
    }
  } else if (type === 'frontier') {
    // SOTA Frontier Envelope: Cumulative maximum progress
    // Evaluates the highest benchmark score achieved up to normalized time nx
    const frontierPoints = extractFrontierPoints(sorted);
    
    predictFn = (nx) => {
      const targetTime = minX + nx * rangeX;
      let maxScore = frontierPoints[0]?.score || 0;
      for (const pt of frontierPoints) {
        if (pt.timestamp <= targetTime) {
          maxScore = pt.score;
        } else {
          break;
        }
      }
      return maxScore;
    };
    formula = `Pioniere Envelope (${frontierPoints.length} Rekord-Modelle)`;
  } else {
    // LOESS (Locally Estimated Scatterplot Smoothing)
    // Bandwidth span h (controlled by param e.g. 40 = 40%)
    const span =
      param && param >= 10 && param <= 90
        ? param / 100
        : Math.max(0.20, Math.min(0.65, 8 / n));
    predictFn = (nx) => {
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

  // Calculate R² (coefficient of determination) and residuals
  let ssRes = 0;
  const residuals: number[] = [];
  for (const d of normData) {
    const yHat = predictFn(d.x);
    const res = d.y - yHat;
    residuals.push(res);
    ssRes += Math.pow(res, 2);
  }

  let r2 = ssTotal > 0 ? 1 - ssRes / ssTotal : 0;
  // Clamp R² between 0 and 0.999
  r2 = Math.max(0, Math.min(0.999, r2));

  // Degrees of freedom & residual standard deviation
  const p = type === 'polynomial' ? Math.min(param || 2, n - 1) + 1 : 2;
  const df = Math.max(1, n - p);
  const seResidual = Math.sqrt(ssRes / df);

  // Mean & variance of normalized X for leverage calculations
  const meanNormX = normData.reduce((acc, d) => acc + d.x, 0) / n;
  const ssNormX = normData.reduce((acc, d) => acc + Math.pow(d.x - meanNormX, 2), 0) || 1e-5;

  // Determine domain range in normalized space [startNx, endNx]
  // In accordance with standard statistical modeling, the linear regression line (and its confidence band)
  // must never form an artificial kink/bend at y = 0. Instead, it is cut off cleanly at its exact intersection
  // with the x-axis (y = 0).
  let startNx = 0;
  let endNx = 1;

  if (type === 'linear' && linearM !== null && linearB !== null) {
    if (Math.abs(linearM) > 1e-9) {
      const rootNx = -linearB / linearM;
      if (linearM > 0) {
        // Line slopes upwards: hits 0 at rootNx. Below rootNx, y < 0.
        if (rootNx >= 1) {
          // Entirely below 0 within domain
          startNx = 1;
          endNx = 0;
        } else if (rootNx > 0) {
          // Cut off cleanly at the intersection with the x-axis (y = 0)
          startNx = rootNx;
        }
      } else {
        // Line slopes downwards: hits 0 at rootNx. Above rootNx, y < 0.
        if (rootNx <= 0) {
          // Entirely below 0 within domain
          startNx = 1;
          endNx = 0;
        } else if (rootNx < 1) {
          // Cut off cleanly at the intersection with the x-axis (y = 0)
          endNx = rootNx;
        }
      }
    } else if (linearB < 0) {
      // Horizontal line entirely below 0
      startNx = 1;
      endNx = 0;
    }
  } else if (type === 'polynomial' || type === 'loess') {
    // Continuous curves: if monotonic crossing at boundary, adjust startNx/endNx to root
    const y0 = predictFn(0);
    const y1 = predictFn(1);
    if (y0 < 0 && y1 > 0) {
      let lo = 0;
      let hi = 1;
      for (let iter = 0; iter < 24; iter++) {
        const mid = (lo + hi) / 2;
        if (predictFn(mid) < 0) lo = mid;
        else hi = mid;
      }
      startNx = hi;
    } else if (y0 > 0 && y1 < 0) {
      let lo = 0;
      let hi = 1;
      for (let iter = 0; iter < 24; iter++) {
        const mid = (lo + hi) / 2;
        if (predictFn(mid) > 0) lo = mid;
        else hi = mid;
      }
      endNx = lo;
    }
  }

  // Generate curve sample points with 95% confidence intervals
  const points: RegressionPoint[] = [];
  if (startNx <= endNx) {
    for (let step = 0; step <= steps; step++) {
      const nx = startNx + (step / steps) * (endNx - startNx);
      const timeX = minX + nx * rangeX;
      const rawY = predictFn(nx);
      const valY = Math.max(0, parseFloat(rawY.toFixed(3)));

      let marginOfError = 0;
      if (type === 'frontier') {
        marginOfError = 0;
      } else if (type === 'loess') {
        // Local empirical standard error smoothed across neighboring data points
        const span = param && param >= 10 && param <= 90 ? param / 100 : Math.max(0.2, Math.min(0.65, 8 / n));
        const dists = normData.map((d) => Math.abs(d.x - nx));
        const sortedDists = [...dists].sort((a, b) => a - b);
        const k = Math.min(dists.length - 1, Math.max(3, Math.floor(dists.length * span)));
        const maxDist = sortedDists[k] || 0.1;

        let sumW = 0;
        let sumW2 = 0;
        let sumWRes2 = 0;
        for (let i = 0; i < n; i++) {
          const u = dists[i] / maxDist;
          if (u < 1) {
            const w = Math.pow(1 - Math.pow(u, 3), 3);
            sumW += w;
            sumW2 += w * w;
            sumWRes2 += w * Math.pow(residuals[i], 2);
          }
        }
        const localSe = sumW > 0 ? Math.sqrt(sumWRes2 / sumW) : seResidual;
        const effN = sumW2 > 0 ? Math.pow(sumW, 2) / sumW2 : 1;
        marginOfError = 1.96 * (localSe / Math.sqrt(Math.max(1, effN)));
        marginOfError = Math.max(marginOfError, 0.4);
      } else {
        // Parametric models: standard leverage formula
        const leverage = 1 / n + Math.pow(nx - meanNormX, 2) / ssNormX;
        marginOfError = 1.96 * seResidual * Math.sqrt(Math.max(0, leverage));
      }

      const lower = Math.max(0, parseFloat((valY - marginOfError).toFixed(2)));
      const upper = Math.min(100, parseFloat((valY + marginOfError).toFixed(2)));

      points.push({ x: timeX, y: valY, lower, upper });
    }
  }

  return {
    type,
    name: modelName,
    r2,
    formula,
    points,
    residualStdDev: parseFloat(seResidual.toFixed(2)),
  };
}

export function getRegressionName(type: RegressionType, param?: number): string {
  switch (type) {
    case 'linear':
      return 'Linear';
    case 'exponential':
      return 'Exponential';
    case 'power':
      return 'Power';
    case 'polynomial':
      return param && param > 2 ? `Polynom (Grad ${param})` : 'Polynome (Grad 2)';
    case 'movingAverage':
      return param ? `Gleitender Durchschnitt (${param}d)` : 'Gleitender Durchschnitt (MA)';
    case 'logistic':
      return param ? `Logistische S-Kurve (${param}%)` : 'Logistische S-Kurve';
    case 'loess':
      return param ? `LOESS Smoothing (${param}%)` : 'LOESS Smoothing';
    case 'frontier':
      return 'Pioniere / Pioneers Envelope';
    default:
      return 'Linear';
  }
}
