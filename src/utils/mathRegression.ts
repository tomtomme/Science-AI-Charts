import { MultiLevelCurveResult, RegressionPoint, RegressionResult, RegressionType, TimelineDataPoint } from '../types';

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

/**
 * Parametric models where multi-level (hierarchical mixed-effects / partial-pooling)
 * regression across LLM lab levels is mathematically well-defined.
 * Non-parametric smoothing (LOESS) and empirical Pareto envelopes (Pioneers) return false.
 */
export function isMultiLevelSupported(type: RegressionType): boolean {
  return type === 'linear' || type === 'exponential' || type === 'power' || type === 'polynomial';
}

function solveLinearSystem(matrix: number[][], rhs: number[]): number[] | null {
  const m = rhs.length;
  const A = matrix.map((row) => [...row]);
  const B = [...rhs];

  for (let i = 0; i < m; i++) {
    let pivot = i;
    for (let r = i + 1; r < m; r++) {
      if (Math.abs(A[r][i]) > Math.abs(A[pivot][i])) pivot = r;
    }
    if (Math.abs(A[pivot][i]) < 1e-12) return null;
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

  return B;
}

function invertSmallMatrix(matrix: number[][]): number[][] | null {
  const m = matrix.length;
  const aug = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: m }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let i = 0; i < m; i++) {
    let pivot = i;
    for (let r = i + 1; r < m; r++) {
      if (Math.abs(aug[r][i]) > Math.abs(aug[pivot][i])) pivot = r;
    }
    if (Math.abs(aug[pivot][i]) < 1e-12) return null;
    [aug[i], aug[pivot]] = [aug[pivot], aug[i]];

    const div = aug[i][i];
    for (let c = 0; c < 2 * m; c++) aug[i][c] /= div;

    for (let r = 0; r < m; r++) {
      if (r !== i) {
        const factor = aug[r][i];
        for (let c = 0; c < 2 * m; c++) aug[r][c] -= factor * aug[i][c];
      }
    }
  }

  return aug.map((row) => row.slice(m));
}

/**
 * Fits a hierarchical / multi-level regression across LLM lab levels using
 * Empirical Bayes partial pooling (random intercepts & slopes shrunk toward
 * the Level-2 global fixed-effect fit when group sample size or span is small).
 */
export function calculateMultiLevelRegression(
  allData: TimelineDataPoint[],
  groups: Array<{ id: string; label: string; color: string; data: TimelineDataPoint[] }>,
  type: RegressionType,
  steps = 80,
  param = 2
): { curves: MultiLevelCurveResult[]; overallR2: number } {
  if (!isMultiLevelSupported(type)) {
    return { curves: [], overallR2: 0 };
  }

  const validAll = allData
    .filter((d) => !isNaN(d.timestamp) && !isNaN(d.score) && d.score > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (validAll.length < 3) {
    return {
      curves: groups.map((g) => ({
        levelId: g.id,
        label: g.label,
        color: g.color,
        count: g.data.length,
        regression: { type, name: getRegressionName(type, param), r2: 0, formula: 'N/A', points: [] },
      })),
      overallR2: 0,
    };
  }

  const minX = validAll[0].timestamp;
  const maxX = validAll[validAll.length - 1].timestamp;
  const rangeX = maxX - minX || 1;
  const isLogY = type === 'exponential' || type === 'power';
  const degree = type === 'polynomial' ? Math.max(2, Math.min(4, Math.round(param || 2))) : 1;
  const pDim = degree + 1;

  const getBasis = (nx: number): number[] => {
    if (type === 'power') {
      return [1, Math.log(1 + Math.max(0, nx))];
    }
    const vec: number[] = [1];
    for (let k = 1; k <= degree; k++) {
      vec.push(Math.pow(nx, k));
    }
    return vec;
  };

  const toTarget = (y: number) => (isLogY ? Math.log(y) : y);
  const fromTarget = (eta: number) =>
    isLogY ? Math.exp(Math.max(-10, Math.min(10, eta))) : eta;

  // 1. Fit Level-2 global fixed effects betaGlobal
  const XTX: number[][] = Array.from({ length: pDim }, () => Array(pDim).fill(0));
  const XTZ: number[] = Array(pDim).fill(0);

  for (const d of validAll) {
    const nx = (d.timestamp - minX) / rangeX;
    const phi = getBasis(nx);
    const z = toTarget(d.score);
    for (let i = 0; i < pDim; i++) {
      XTZ[i] += phi[i] * z;
      for (let j = 0; j < pDim; j++) {
        XTX[i][j] += phi[i] * phi[j];
      }
    }
  }
  for (let i = 0; i < pDim; i++) {
    XTX[i][i] += 1e-8;
  }

  const betaGlobal = solveLinearSystem(XTX, XTZ);
  if (!betaGlobal) {
    return { curves: [], overallR2: 0 };
  }

  let globalSsRes = 0;
  for (const d of validAll) {
    const nx = (d.timestamp - minX) / rangeX;
    const phi = getBasis(nx);
    const eta = phi.reduce((acc, v, idx) => acc + v * betaGlobal[idx], 0);
    globalSsRes += Math.pow(d.score - fromTarget(eta), 2);
  }
  const globalVar = globalSsRes / Math.max(1, validAll.length - pDim);

  // Shrinkage penalties Lambda for random effects (intercept = light, slope = moderate, higher terms = stronger)
  const lambdas = Array.from({ length: pDim }, (_, k) => {
    if (k === 0) return 0.25;
    if (k === 1) return 0.6;
    return 1.5 * k;
  });

  const modelName = getRegressionName(type, param);
  let multiSsRes = 0;
  const allGroupedY: number[] = [];

  const curves: MultiLevelCurveResult[] = groups.map((g) => {
    const validGroup = g.data
      .filter((d) => !isNaN(d.timestamp) && !isNaN(d.score) && d.score > 0)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (validGroup.length < 2) {
      return {
        levelId: g.id,
        label: g.label,
        color: g.color,
        count: validGroup.length,
        regression: {
          type,
          name: modelName,
          r2: 0,
          formula: 'n < 2',
          points: [],
        },
      };
    }

    // Solve (X_j^T X_j + Lambda) * delta_j = X_j^T (z_j - X_j * betaGlobal)
    const GXX: number[][] = Array.from({ length: pDim }, () => Array(pDim).fill(0));
    const GXR: number[] = Array(pDim).fill(0);

    for (const d of validGroup) {
      const nx = (d.timestamp - minX) / rangeX;
      const phi = getBasis(nx);
      const z = toTarget(d.score);
      const etaGlobal = phi.reduce((acc, v, idx) => acc + v * betaGlobal[idx], 0);
      const resZ = z - etaGlobal;
      for (let i = 0; i < pDim; i++) {
        GXR[i] += phi[i] * resZ;
        for (let j = 0; j < pDim; j++) {
          GXX[i][j] += phi[i] * phi[j];
        }
      }
    }
    for (let i = 0; i < pDim; i++) {
      GXX[i][i] += lambdas[i];
    }

    const delta = solveLinearSystem(GXX, GXR) || Array(pDim).fill(0);
    const betaGroup = betaGlobal.map((b, idx) => b + delta[idx]);
    const covInv = invertSmallMatrix(GXX);

    const predictFn = (nx: number) => {
      const phi = getBasis(nx);
      const eta = phi.reduce((acc, v, idx) => acc + v * betaGroup[idx], 0);
      return fromTarget(eta);
    };

    const groupMeanY = validGroup.reduce((acc, d) => acc + d.score, 0) / validGroup.length;
    let ssTot = 0;
    let ssRes = 0;
    for (const d of validGroup) {
      const nx = (d.timestamp - minX) / rangeX;
      const predY = predictFn(nx);
      const err = d.score - predY;
      ssRes += err * err;
      ssTot += Math.pow(d.score - groupMeanY, 2);
      multiSsRes += err * err;
      allGroupedY.push(d.score);
    }

    const r2 = ssTot > 0 ? Math.max(0, Math.min(0.999, 1 - ssRes / ssTot)) : 0;
    // Stabilized SE blending group residuals with Level-2 variance
    const seGroup = Math.sqrt((ssRes + 2 * globalVar) / (validGroup.length + 2));

    // Span each lab level across its own observed release timeline
    const gMinT = validGroup[0].timestamp;
    const gMaxT = validGroup[validGroup.length - 1].timestamp;
    let startNx = (gMinT - minX) / rangeX;
    let endNx = (gMaxT - minX) / rangeX;

    if (endNx <= startNx) {
      endNx = Math.min(1, startNx + 0.02);
    }

    // Clip cleanly at y=0 if linear or polynomial crosses zero
    if (type === 'linear' && Math.abs(betaGroup[1]) > 1e-9) {
      const rootNx = -betaGroup[0] / betaGroup[1];
      if (betaGroup[1] > 0 && rootNx > startNx) {
        startNx = Math.min(endNx, rootNx);
      } else if (betaGroup[1] < 0 && rootNx < endNx) {
        endNx = Math.max(startNx, rootNx);
      }
    }

    const points: RegressionPoint[] = [];
    if (startNx < endNx) {
      for (let s = 0; s <= steps; s++) {
        const nx = startNx + (s / steps) * (endNx - startNx);
        const timeX = minX + nx * rangeX;
        const rawY = predictFn(nx);
        const valY = Math.max(0, parseFloat(rawY.toFixed(3)));

        let lev = 1 / validGroup.length;
        if (covInv) {
          const phi = getBasis(nx);
          let q = 0;
          for (let i = 0; i < pDim; i++) {
            for (let j = 0; j < pDim; j++) {
              q += phi[i] * covInv[i][j] * phi[j];
            }
          }
          lev = Math.max(0, q);
        }
        const marginOfError = 1.96 * seGroup * Math.sqrt(lev);
        const lower = Math.max(0, parseFloat((valY - marginOfError).toFixed(2)));
        const upper = Math.min(100, parseFloat((valY + marginOfError).toFixed(2)));
        points.push({ x: timeX, y: valY, lower, upper });
      }
    }

    let formula = '';
    if (type === 'linear') {
      formula = `y = ${betaGroup[1] >= 0 ? '+' : ''}${betaGroup[1].toFixed(2)}·t + ${betaGroup[0].toFixed(1)}`;
    } else if (type === 'exponential') {
      formula = `y = ${Math.exp(betaGroup[0]).toFixed(1)} · e^(${betaGroup[1].toFixed(2)}·t)`;
    } else if (type === 'power') {
      formula = `y = ${Math.exp(betaGroup[0]).toFixed(1)} · (1+t)^${betaGroup[1].toFixed(2)}`;
    } else {
      formula = `${modelName} (Lab-Level)`;
    }

    return {
      levelId: g.id,
      label: g.label,
      color: g.color,
      count: validGroup.length,
      regression: {
        type,
        name: modelName,
        r2,
        formula,
        points,
        residualStdDev: parseFloat(seGroup.toFixed(2)),
      },
    };
  });

  let overallR2 = 0;
  if (allGroupedY.length > 0) {
    const meanGroupedY = allGroupedY.reduce((a, b) => a + b, 0) / allGroupedY.length;
    const groupedSsTot = allGroupedY.reduce((acc, y) => acc + Math.pow(y - meanGroupedY, 2), 0);
    overallR2 = groupedSsTot > 0 ? Math.max(0, Math.min(0.999, 1 - multiSsRes / groupedSsTot)) : 0;
  }

  return { curves, overallR2 };
}

