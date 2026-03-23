/**
 * Linear Regression Prediction Engine
 * 
 * Provides OLS (Ordinary Least Squares) linear regression
 * with optional weighting for recency bias.
 */

/**
 * Ordinary Least Squares linear regression
 * @param {Array<{x: number, y: number}>} points 
 * @returns {{ slope: number, intercept: number, r2: number }}
 */
export function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² (coefficient of determination)
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const { x, y } of points) {
    const predicted = slope * x + intercept;
    ssRes += (y - predicted) ** 2;
    ssTot += (y - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/**
 * Weighted linear regression (more weight on recent data)
 * @param {Array<{x: number, y: number}>} points 
 * @param {number} decayFactor - higher = more recency bias (0.5-2.0 recommended)
 * @returns {{ slope: number, intercept: number, r2: number }}
 */
export function weightedLinearRegression(points, decayFactor = 1.0) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0, r2: 0 };

  // Assign weights: most recent point gets weight 1, oldest gets reduced weight
  const maxX = Math.max(...points.map(p => p.x));
  const minX = Math.min(...points.map(p => p.x));
  const range = maxX - minX || 1;

  const weighted = points.map(p => {
    const normalized = (p.x - minX) / range; // 0 = oldest, 1 = newest
    const weight = Math.pow(normalized, decayFactor) + 0.1; // minimum weight 0.1
    return { ...p, w: weight };
  });

  let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWX2 = 0;
  for (const { x, y, w } of weighted) {
    sumW += w;
    sumWX += w * x;
    sumWY += w * y;
    sumWXY += w * x * y;
    sumWX2 += w * x * x;
  }

  const denom = sumW * sumWX2 - sumWX * sumWX;
  if (denom === 0) return { slope: 0, intercept: sumWY / sumW, r2: 0 };

  const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
  const intercept = (sumWY - slope * sumWX) / sumW;

  // Weighted R²
  const meanY = sumWY / sumW;
  let ssRes = 0, ssTot = 0;
  for (const { x, y, w } of weighted) {
    const predicted = slope * x + intercept;
    ssRes += w * (y - predicted) ** 2;
    ssTot += w * (y - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/**
 * Calculate prediction confidence interval
 * @param {Array<{x: number, y: number}>} points 
 * @param {{ slope: number, intercept: number }} model
 * @param {number} targetX 
 * @param {number} confidence - 0.95 for 95% 
 * @returns {{ lower: number, upper: number }}
 */
export function predictionInterval(points, model, targetX, confidence = 0.95) {
  const n = points.length;
  if (n < 3) return { lower: model.slope * targetX + model.intercept - 50, upper: model.slope * targetX + model.intercept + 50 };

  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const ssX = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  const residuals = points.map(p => p.y - (model.slope * p.x + model.intercept));
  const mse = residuals.reduce((s, r) => s + r * r, 0) / (n - 2);
  const se = Math.sqrt(mse * (1 + 1 / n + (targetX - meanX) ** 2 / ssX));

  // t-value approximation for 95% confidence
  const tValues = { 0.90: 1.645, 0.95: 1.96, 0.99: 2.576 };
  const t = tValues[confidence] || 1.96;

  const predicted = model.slope * targetX + model.intercept;
  return {
    lower: Math.round(predicted - t * se),
    upper: Math.round(predicted + t * se),
  };
}
