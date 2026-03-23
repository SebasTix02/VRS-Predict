/**
 * Prediction Engine
 * 
 * Unified API for making predictions. Uses strategy pattern so
 * linear regression can be swapped for ML models later.
 */

import { linearRegression, weightedLinearRegression, predictionInterval } from './linear.js';

/**
 * Convert date string to days since epoch for regression
 */
function dateToDays(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / (1000 * 60 * 60 * 24));
}

/**
 * Convert days since epoch back to date string
 */
function daysToDate(days) {
  const d = new Date(days * 1000 * 60 * 60 * 24);
  return d.toISOString().split('T')[0];
}

/**
 * Prediction strategies registry
 */
const strategies = {
  linear: predictLinear,
  weighted: predictWeighted,
};

/**
 * Linear regression prediction
 */
function predictLinear(history, targetDate) {
  const points = history.map(h => ({
    x: dateToDays(h.date),
    y: h.points,
  }));

  const model = linearRegression(points);
  const targetX = dateToDays(targetDate);
  const predicted = Math.round(model.slope * targetX + model.intercept);
  const interval = predictionInterval(points, model, targetX);

  return {
    method: 'linear',
    predicted: Math.max(400, Math.min(2200, predicted)), // FRV range 400-2200
    confidence: model.r2,
    interval: {
      lower: Math.max(400, interval.lower),
      upper: Math.min(2200, interval.upper),
    },
    trend: model.slope > 0.1 ? 'rising' : model.slope < -0.1 ? 'falling' : 'stable',
    slopePerDay: model.slope,
    slopePerMonth: model.slope * 30,
  };
}

/**
 * Weighted linear regression (favors recent data)
 */
function predictWeighted(history, targetDate) {
  const points = history.map(h => ({
    x: dateToDays(h.date),
    y: h.points,
  }));

  const model = weightedLinearRegression(points, 1.5);
  const targetX = dateToDays(targetDate);
  const predicted = Math.round(model.slope * targetX + model.intercept);
  const interval = predictionInterval(points, model, targetX);

  return {
    method: 'weighted',
    predicted: Math.max(400, Math.min(2200, predicted)),
    confidence: model.r2,
    interval: {
      lower: Math.max(400, interval.lower),
      upper: Math.min(2200, interval.upper),
    },
    trend: model.slope > 0.1 ? 'rising' : model.slope < -0.1 ? 'falling' : 'stable',
    slopePerDay: model.slope,
    slopePerMonth: model.slope * 30,
  };
}

/**
 * Predict a team's FRV at a future date
 * @param {Array<{date: string, rank: number, points: number}>} history 
 * @param {string} targetDate - YYYY-MM-DD format
 * @param {string} method - 'linear' or 'weighted'
 * @returns {Object} prediction result
 */
export function predict(history, targetDate, method = 'weighted') {
  if (!history || history.length < 2) {
    const fallback = (history && history.length > 0) ? history[0].points : 0;
    return {
      method,
      predicted: fallback,
      confidence: 0,
      interval: { lower: 0, upper: 0 },
      trend: 'insufficient_data',
      slopePerDay: 0,
      slopePerMonth: 0,
    };
  }

  const strategy = strategies[method] || strategies.linear;
  return strategy(history, targetDate);
}

/**
 * Predict full rankings at a future date
 * @param {Array} teams - Array of team objects from standings.json 
 * @param {string} targetDate - YYYY-MM-DD format
 * @param {string} method - prediction method
 * @returns {Array} sorted predicted rankings
 */
export function predictRankings(teams, targetDate, method = 'weighted') {
  const predictions = teams
    .filter(t => t.history.length >= 5) // need at least 5 data points for reliable prediction
    .map(team => {
      const prediction = predict(team.history, targetDate, method);
      return {
        teamName: team.teamName,
        latestRoster: team.latestRoster,
        currentPoints: team.history[team.history.length - 1].points,
        currentRank: team.history[team.history.length - 1].rank,
        ...prediction,
      };
    })
    .sort((a, b) => b.predicted - a.predicted);

  // Assign predicted ranks
  predictions.forEach((p, i) => {
    p.predictedRank = i + 1;
    p.rankChange = p.currentRank - p.predictedRank; // positive = climbing
  });

  return predictions;
}

/**
 * Generate trend line data for charting
 * @param {Array} history - team history
 * @param {number} futureDays - how many days to project forward
 * @param {string} method - prediction method
 * @returns {{ historical: Array, predicted: Array }}
 */
export function generateTrendLine(history, futureDays = 90, method = 'weighted') {
  if (!history || history.length < 2) return { historical: history || [], predicted: [] };

  const points = history.map(h => ({
    x: dateToDays(h.date),
    y: h.points,
  }));

  const model = method === 'weighted'
    ? weightedLinearRegression(points, 1.5)
    : linearRegression(points);

  const lastDay = Math.max(...points.map(p => p.x));
  const predicted = [];

  // Generate points every 7 days into the future
  for (let d = 0; d <= futureDays; d += 7) {
    const targetDay = lastDay + d;
    const value = Math.max(400, Math.min(2200, Math.round(model.slope * targetDay + model.intercept)));
    const interval = predictionInterval(points, model, targetDay);
    predicted.push({
      date: daysToDate(targetDay),
      points: value,
      lower: Math.max(400, interval.lower),
      upper: Math.min(2200, interval.upper),
    });
  }

  return { historical: history, predicted };
}

export { dateToDays, daysToDate };
