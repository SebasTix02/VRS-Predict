/**
 * Chart.js wrappers for VRS Dashboard
 */

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// Global chart defaults for dark theme
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

const CHART_COLORS = [
  '#f59e0b', // orange
  '#3b82f6', // blue  
  '#22c55e', // green
  '#a855f7', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
];

/**
 * Create a team FRV trend line chart with prediction
 */
export function createTrendChart(canvasId, teamName, historical, predicted) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  // Destroy existing chart
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const histLabels = historical.map(h => h.date);
  const histValues = historical.map(h => h.points);

  const predLabels = predicted.map(p => p.date);
  const predValues = predicted.map(p => p.points);
  const predUpper = predicted.map(p => p.upper);
  const predLower = predicted.map(p => p.lower);

  const allLabels = [...histLabels, ...predLabels.slice(1)];

  // Pad historical values to full length
  const histFull = [...histValues, ...new Array(predLabels.length - 1).fill(null)];
  const predFull = [...new Array(histLabels.length - 1).fill(null), histValues[histValues.length - 1], ...predValues.slice(1)];
  const upperFull = [...new Array(histLabels.length - 1).fill(null), histValues[histValues.length - 1], ...predUpper.slice(1)];
  const lowerFull = [...new Array(histLabels.length - 1).fill(null), histValues[histValues.length - 1], ...predLower.slice(1)];

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: `${teamName} (Historical)`,
          data: histFull,
          borderColor: CHART_COLORS[0],
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: CHART_COLORS[0],
          fill: false,
          tension: 0.3,
        },
        {
          label: 'Prediction',
          data: predFull,
          borderColor: CHART_COLORS[0],
          borderWidth: 2,
          borderDash: [8, 4],
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: CHART_COLORS[0],
          pointBorderColor: CHART_COLORS[0],
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Confidence Upper',
          data: upperFull,
          borderColor: 'transparent',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderWidth: 0,
          pointRadius: 0,
          fill: '+1',
        },
        {
          label: 'Confidence Lower',
          data: lowerFull,
          borderColor: 'transparent',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderWidth: 0,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: {
            filter: (item) => !item.text.includes('Confidence'),
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 10,
            maxRotation: 45,
            font: { size: 11 },
          },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { font: { size: 11 } },
          title: {
            display: true,
            text: 'FRV Points',
            color: '#64748b',
            font: { size: 12, weight: '500' },
          },
        },
      },
    },
  });
}

/**
 * Create a comparison chart for multiple teams
 */
export function createCompareChart(canvasId, teamsData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  // Build unified time axis from all teams
  const allDates = new Set();
  teamsData.forEach(team => {
    team.history.forEach(h => allDates.add(h.date));
  });
  const labels = [...allDates].sort();

  const datasets = teamsData.map((team, i) => {
    const histMap = {};
    team.history.forEach(h => { histMap[h.date] = h.points; });

    return {
      label: team.teamName,
      data: labels.map(d => histMap[d] || null),
      borderColor: CHART_COLORS[i % CHART_COLORS.length],
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '15',
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: CHART_COLORS[i % CHART_COLORS.length],
      fill: false,
      tension: 0.3,
      spanGaps: true,
    };
  });

  return new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 12, maxRotation: 45, font: { size: 11 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { font: { size: 11 } },
          title: {
            display: true,
            text: 'FRV Points',
            color: '#64748b',
            font: { size: 12, weight: '500' },
          },
        },
      },
    },
  });
}
