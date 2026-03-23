/**
 * VRS Prediction Dashboard - Main Entry Point
 */

import standingsData from './data/standings.json';
import { predict, predictRankings, generateTrendLine } from './prediction/engine.js';
import { createTrendChart, createCompareChart } from './components/charts.js';
import './styles/main.css';

// ============================================
// State
// ============================================

const state = {
  teams: standingsData.teams,
  snapshotDates: standingsData.snapshotDates,
  selectedTeam: null,
  compareTeams: [],
  currentSection: 'rankings',
  rankPage: 1,
  predictPage: 1,
  itemsPerPage: 15,
};

// ============================================
// Init
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initHero();
  initNavigation();
  initRankingsTable();
  initTeamExplorer();
  initPredictions();
  initCompare();

  // Update meta info
  const info = document.getElementById('snapshot-info');
  if (info) {
    info.textContent = `${standingsData.totalSnapshots} snapshots · ${standingsData.snapshotDates[standingsData.snapshotDates.length - 1]}`;
  }

  document.getElementById('hero-snapshots').textContent = standingsData.totalSnapshots;
  document.getElementById('hero-teams').textContent = standingsData.totalTeams;
});

// ============================================
// Hero
// ============================================

function initHero() {
  const container = document.getElementById('hero-top5');
  const top5 = state.teams.slice(0, 5);

  container.innerHTML = top5.map((team, i) => {
    const latest = team.history[team.history.length - 1];
    return `
      <div class="hero-card" style="animation-delay: ${i * 0.1}s" data-team="${team.teamName}">
        <div class="hero-card-rank">#${latest.rank}</div>
        <div class="hero-card-info">
          <div class="hero-card-name">${team.teamName}</div>
          <div class="hero-card-points">${latest.points} FRV</div>
        </div>
      </div>
    `;
  }).join('');

  // Click handler
  container.querySelectorAll('.hero-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.team;
      showTeamDetail(name);
      scrollToSection('explorer');
    });
  });
}

// ============================================
// Navigation
// ============================================

function initNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      scrollToSection(section);
    });
  });

  // Update active link on scroll
  const sections = ['rankings', 'explorer', 'predictions', 'compare'];
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.nav-link[data-section="${entry.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { threshold: 0.3, rootMargin: '-64px 0px 0px 0px' });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// Rankings Table
// ============================================

function initRankingsTable() {
  renderRankingsTable(state.teams);

  // Search
  document.getElementById('rank-search').addEventListener('input', (e) => {
    filterRankings();
  });

  document.getElementById('rank-region').addEventListener('change', () => {
    filterRankings();
  });
}

function filterRankings() {
  const search = document.getElementById('rank-search').value.toLowerCase();
  const region = document.getElementById('rank-region').value;

  let filtered = state.teams.filter(t => {
    const latest = t.history[t.history.length - 1];
    if (!latest) return false;

    const matchesSearch = !search || t.teamName.toLowerCase().includes(search) ||
      t.latestRoster.toLowerCase().includes(search);
    
    const matchesRegion = region === 'all' || t.region === region;

    return matchesSearch && matchesRegion;
  });

  state.rankPage = 1; // reset page on filter
  renderRankingsTable(filtered);
}

function renderRankingsTable(teams) {
  const container = document.getElementById('rankings-table');
  const pagination = document.getElementById('rankings-pagination');
  const latestDate = state.snapshotDates[state.snapshotDates.length - 1];
  const prevDate = state.snapshotDates.length > 1 ? state.snapshotDates[state.snapshotDates.length - 2] : null;

  const totalPages = Math.ceil(teams.length / state.itemsPerPage);
  const startIndex = (state.rankPage - 1) * state.itemsPerPage;
  const pageTeams = teams.slice(startIndex, startIndex + state.itemsPerPage);

  const rows = pageTeams.map(team => {
    const latest = team.history[team.history.length - 1];
    if (!latest) return '';

    let changeHtml = '';
    if (prevDate) {
      const prev = team.history.find(h => h.date === prevDate);
      if (prev) {
        const change = prev.rank - latest.rank;
        if (change > 0) {
          changeHtml = `<span class="change-badge positive">▲ ${change}</span>`;
        } else if (change < 0) {
          changeHtml = `<span class="change-badge negative">▼ ${Math.abs(change)}</span>`;
        } else {
          changeHtml = `<span class="change-badge neutral">—</span>`;
        }
      }
    }

    const prediction = predict(team.history, getFutureDate(90), 'weighted');
    let trendHtml = '';
    if (prediction.trend === 'rising') {
      trendHtml = `<span class="trend-up">↑ +${Math.round(prediction.slopePerMonth)}/mo</span>`;
    } else if (prediction.trend === 'falling') {
      trendHtml = `<span class="trend-down">↓ ${Math.round(prediction.slopePerMonth)}/mo</span>`;
    } else {
      trendHtml = `<span class="trend-stable">→ stable</span>`;
    }

    return `
      <tr data-team="${team.teamName}">
        <td class="rank-cell ${latest.rank <= 3 ? 'top3' : ''}">${latest.rank}</td>
        <td class="team-cell">${team.teamName}</td>
        <td class="points-cell">${latest.points}</td>
        <td>${changeHtml}</td>
        <td class="trend-cell">${trendHtml}</td>
        <td class="roster-cell">${team.latestRoster}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="rank-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>FRV</th>
          <th>Change</th>
          <th>Trend</th>
          <th>Roster</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Render Pagination
  if (pagination) {
    pagination.innerHTML = `
      <button class="page-btn" id="rank-prev" ${state.rankPage === 1 ? 'disabled' : ''}>Previous</button>
      <span class="page-info">Page ${state.rankPage} of ${totalPages || 1}</span>
      <button class="page-btn" id="rank-next" ${state.rankPage >= totalPages ? 'disabled' : ''}>Next</button>
    `;
    
    const prevBtn = document.getElementById('rank-prev');
    const nextBtn = document.getElementById('rank-next');
    
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (state.rankPage > 1) {
        state.rankPage--;
        renderRankingsTable(teams);
      }
    });
    
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (state.rankPage < totalPages) {
        state.rankPage++;
        renderRankingsTable(teams);
      }
    });
  }

  // Row click → explorer
  container.querySelectorAll('tr[data-team]').forEach(row => {
    row.addEventListener('click', () => {
      showTeamDetail(row.dataset.team);
      scrollToSection('explorer');
    });
  });
}

// ============================================
// Team Explorer
// ============================================

function initTeamExplorer() {
  const searchInput = document.getElementById('team-search');
  const suggestions = document.getElementById('team-suggestions');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    if (query.length < 2) {
      suggestions.classList.remove('visible');
      return;
    }

    const matches = state.teams
      .filter(t => t.teamName.toLowerCase().includes(query))
      .slice(0, 10);

    if (matches.length === 0) {
      suggestions.classList.remove('visible');
      return;
    }

    suggestions.innerHTML = matches.map(t => {
      const latest = t.history[t.history.length - 1];
      return `
        <div class="suggestion-item" data-team="${t.teamName}">
          <span>${t.teamName}</span>
          <span class="suggestion-rank">#${latest ? latest.rank : '?'} · ${latest ? latest.points : '?'} FRV</span>
        </div>
      `;
    }).join('');
    suggestions.classList.add('visible');

    suggestions.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        showTeamDetail(item.dataset.team);
        searchInput.value = item.dataset.team;
        suggestions.classList.remove('visible');
      });
    });
  });

  // Close suggestions on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#team-search') && !e.target.closest('#team-suggestions')) {
      suggestions.classList.remove('visible');
    }
  });
}

function showTeamDetail(teamName) {
  const team = state.teams.find(t => t.teamName === teamName);
  if (!team) return;

  state.selectedTeam = team;
  const container = document.getElementById('team-detail');
  const latest = team.history[team.history.length - 1];
  const prediction = predict(team.history, getFutureDate(90), 'weighted');
  const trendData = generateTrendLine(team.history, 90, 'weighted');

  // Determine trend color/icon
  let trendColor = 'var(--text-muted)';
  let trendIcon = '→';
  if (prediction.trend === 'rising') { trendColor = 'var(--accent-green)'; trendIcon = '↑'; }
  if (prediction.trend === 'falling') { trendColor = 'var(--accent-red)'; trendIcon = '↓'; }

  container.innerHTML = `
    <div class="team-header" style="animation: fadeInUp 0.4s ease both;">
      <div class="team-rank-badge">#${latest.rank}</div>
      <div class="team-info">
        <h3>${team.teamName}</h3>
        <p class="team-roster-text">${team.latestRoster}</p>
        <div class="team-stats">
          <div class="stat-item">
            <div class="stat-value">${latest.points}</div>
            <div class="stat-label">Current FRV</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: ${trendColor}">${trendIcon} ${prediction.predicted}</div>
            <div class="stat-label">Predicted (3mo)</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${Math.round(prediction.slopePerMonth >= 0 ? prediction.slopePerMonth : prediction.slopePerMonth)}</div>
            <div class="stat-label">Points/Month</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${(prediction.confidence * 100).toFixed(0)}%</div>
            <div class="stat-label">R² Confidence</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${team.history.length}</div>
            <div class="stat-label">Data Points</div>
          </div>
        </div>
      </div>
    </div>
    <div class="team-charts" style="animation: fadeInUp 0.5s ease 0.1s both;">
      <div class="chart-panel">
        <h4>FRV Over Time with 3-Month Prediction</h4>
        <div style="height: 360px; position: relative;">
          <canvas id="team-trend-chart"></canvas>
        </div>
      </div>
    </div>
  `;

  // Render chart
  setTimeout(() => {
    createTrendChart('team-trend-chart', team.teamName, trendData.historical, trendData.predicted);
  }, 100);

  // Update search input
  document.getElementById('team-search').value = teamName;
}

// ============================================
// Predictions Table
// ============================================

function initPredictions() {
  renderPredictions();

  const handleFilterChange = () => {
    state.predictPage = 1;
    renderPredictions();
  };

  document.getElementById('predict-date').addEventListener('change', handleFilterChange);
  document.getElementById('predict-method').addEventListener('change', handleFilterChange);
}

function renderPredictions() {
  const days = parseInt(document.getElementById('predict-date').value);
  const method = document.getElementById('predict-method').value;
  const targetDate = getFutureDate(days);

  const predictions = predictRankings(state.teams, targetDate, method);
  const container = document.getElementById('predictions-table');
  const pagination = document.getElementById('predictions-pagination');

  const totalPages = Math.ceil(predictions.length / state.itemsPerPage);
  const startIndex = (state.predictPage - 1) * state.itemsPerPage;
  const pagePredictions = predictions.slice(startIndex, startIndex + state.itemsPerPage);

  const rows = pagePredictions.map(p => {
    let changeHtml = '';
    if (p.rankChange > 0) {
      changeHtml = `<span class="change-badge positive">▲ ${p.rankChange}</span>`;
    } else if (p.rankChange < 0) {
      changeHtml = `<span class="change-badge negative">▼ ${Math.abs(p.rankChange)}</span>`;
    } else {
      changeHtml = `<span class="change-badge neutral">—</span>`;
    }

    let trendHtml = '';
    if (p.trend === 'rising') {
      trendHtml = `<span class="trend-up">↑</span>`;
    } else if (p.trend === 'falling') {
      trendHtml = `<span class="trend-down">↓</span>`;
    } else {
      trendHtml = `<span class="trend-stable">→</span>`;
    }

    const delta = p.predicted - p.currentPoints;
    const deltaClass = delta > 0 ? 'trend-up' : delta < 0 ? 'trend-down' : 'trend-stable';
    const deltaSign = delta > 0 ? '+' : '';

    return `
      <tr data-team="${p.teamName}">
        <td class="rank-cell ${p.predictedRank <= 3 ? 'top3' : ''}">${p.predictedRank}</td>
        <td class="team-cell">${p.teamName}</td>
        <td class="points-cell">${p.predicted}</td>
        <td class="points-cell" style="color: var(--text-muted)">${p.currentPoints}</td>
        <td class="${deltaClass}" style="font-weight:600">${deltaSign}${delta}</td>
        <td>${changeHtml}</td>
        <td>${trendHtml}</td>
        <td style="color: var(--text-muted); font-size: 0.8rem">${(p.confidence * 100).toFixed(0)}%</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="rank-table">
      <thead>
        <tr>
          <th>Predicted #</th>
          <th>Team</th>
          <th>Predicted FRV</th>
          <th>Current FRV</th>
          <th>Δ Points</th>
          <th>Rank Change</th>
          <th>Trend</th>
          <th>R²</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Render Pagination
  if (pagination) {
    pagination.innerHTML = `
      <button class="page-btn" id="predict-prev" ${state.predictPage === 1 ? 'disabled' : ''}>Previous</button>
      <span class="page-info">Page ${state.predictPage} of ${totalPages || 1}</span>
      <button class="page-btn" id="predict-next" ${state.predictPage >= totalPages ? 'disabled' : ''}>Next</button>
    `;
    
    const prevBtn = document.getElementById('predict-prev');
    const nextBtn = document.getElementById('predict-next');
    
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (state.predictPage > 1) {
        state.predictPage--;
        renderPredictions(); // re-render with new page
      }
    });
    
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (state.predictPage < totalPages) {
        state.predictPage++;
        renderPredictions();
      }
    });
  }

  container.querySelectorAll('tr[data-team]').forEach(row => {
    row.addEventListener('click', () => {
      showTeamDetail(row.dataset.team);
      scrollToSection('explorer');
    });
  });
}

// ============================================
// Compare
// ============================================

function initCompare() {
  [1, 2, 3].forEach(i => {
    const input = document.getElementById(`compare-search-${i}`);
    const suggestions = document.getElementById(`compare-suggestions-${i}`);

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase();
      if (query.length < 2) {
        suggestions.classList.remove('visible');
        return;
      }

      const matches = state.teams
        .filter(t => t.teamName.toLowerCase().includes(query))
        .slice(0, 8);

      if (matches.length === 0) {
        suggestions.classList.remove('visible');
        return;
      }

      suggestions.innerHTML = matches.map(t => {
        const latest = t.history[t.history.length - 1];
        return `
          <div class="suggestion-item" data-team="${t.teamName}">
            <span>${t.teamName}</span>
            <span class="suggestion-rank">#${latest ? latest.rank : '?'}</span>
          </div>
        `;
      }).join('');
      suggestions.classList.add('visible');

      suggestions.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          input.value = item.dataset.team;
          suggestions.classList.remove('visible');
          updateCompareChart();
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest(`#compare-search-${i}`) && !e.target.closest(`#compare-suggestions-${i}`)) {
        suggestions.classList.remove('visible');
      }
    });
  });
}

function updateCompareChart() {
  const teamNames = [1, 2, 3]
    .map(i => document.getElementById(`compare-search-${i}`).value)
    .filter(Boolean);

  const teamsData = teamNames
    .map(name => state.teams.find(t => t.teamName.toLowerCase() === name.toLowerCase()))
    .filter(Boolean);

  if (teamsData.length < 2) return;

  createCompareChart('compare-chart', teamsData);
}

// ============================================
// Helpers
// ============================================

function getFutureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}
