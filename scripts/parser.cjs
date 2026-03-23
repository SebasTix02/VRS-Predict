const fs = require('fs');
const path = require('path');
const ROOT = 'c:/Users/User/Desktop/Programacion/Valve/VRS';

function parseFile(fp, region) {
  var content = fs.readFileSync(fp, 'utf-8');
  var teams = [];
  var lines = content.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (!line.startsWith('|') || line.indexOf(':- |') !== -1 || line.indexOf('Standing') !== -1) continue;
    var cols = line.split('|').map(function(c) { return c.trim(); }).filter(Boolean);
    if (cols.length < 4) continue;
    var rank = parseInt(cols[0], 10);
    var points = parseInt(cols[1], 10);
    var teamName = cols[2];
    var roster = cols[3];
    if (isNaN(rank) || isNaN(points)) continue;
    teams.push({ rank: rank, points: points, teamName: teamName, roster: roster, region: region });
  }
  return teams;
}

var liveDir = path.join(ROOT, 'live');
var years = fs.readdirSync(liveDir).filter(function(d) {
  return fs.statSync(path.join(liveDir, d)).isDirectory();
});

var allFiles = [];
years.forEach(function(y) {
  var yDir = path.join(liveDir, y);
  fs.readdirSync(yDir).forEach(function(f) {
    if (!f.endsWith('.md')) return;
    var m = f.match(/standings_(global|europe|americas|asia)_(\d{4})_(\d{2})_(\d{2})\.md/);
    if (m) {
      allFiles.push({ 
        date: m[2] + '-' + m[3] + '-' + m[4], 
        region: m[1] === 'global' ? 'Global' : m[1].charAt(0).toUpperCase() + m[1].slice(1),
        filePath: path.join(yDir, f) 
      });
    }
  });
});
allFiles.sort(function(a, b) { return a.date.localeCompare(b.date); });

console.log('Found ' + allFiles.length + ' snapshots');

var snapshots = [];
var teamIndex = {};

allFiles.forEach(function(item) {
  var teams = parseFile(item.filePath, item.region);
  console.log('  ' + item.date + ' [' + item.region + ']: ' + teams.length + ' teams');
  
  if (item.region === 'Global') {
    snapshots.push({ date: item.date, teams: teams });
  }

  teams.forEach(function(team) {
    if (!teamIndex[team.teamName]) {
      teamIndex[team.teamName] = { 
        teamName: team.teamName, 
        latestRoster: team.roster, 
        region: team.region !== 'Global' ? team.region : null,
        history: [] 
      };
    }
    
    // Always prefer a specific region over 'Global' or null
    if (team.region !== 'Global') {
      teamIndex[team.teamName].region = team.region;
    }

    if (item.region === 'Global') {
      teamIndex[team.teamName].history.push({ date: item.date, rank: team.rank, points: team.points });
      teamIndex[team.teamName].latestRoster = team.roster;
    }
  });
});

// Final fallback for teams that only appear in Global
Object.keys(teamIndex).forEach(function(name) {
  if (!teamIndex[name].region) teamIndex[name].region = 'Europe'; // Default to Europe for global-only teams as they are often EU top teams
});

var lastSnap = snapshots[snapshots.length - 1];
var latestDate = lastSnap ? lastSnap.date : null;

var teamList = Object.keys(teamIndex).map(function(k) { return teamIndex[k]; });
teamList.sort(function(a, b) {
  var aL = a.history.filter(function(h) { return h.date === latestDate; })[0];
  var bL = b.history.filter(function(h) { return h.date === latestDate; })[0];
  if (!aL && !bL) return 0;
  if (!aL) return 1;
  if (!bL) return -1;
  return aL.rank - bL.rank;
});

var output = {
  generatedAt: new Date().toISOString(),
  snapshotDates: snapshots.map(function(s) { return s.date; }),
  totalSnapshots: snapshots.length,
  totalTeams: teamList.length,
  teams: teamList
};

var outDir = path.join(ROOT, 'dashboard', 'src', 'data');
fs.mkdirSync(outDir, { recursive: true });
var outPath = path.join(outDir, 'standings.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log('\nGenerated: ' + outPath);
console.log('  ' + output.totalSnapshots + ' snapshots, ' + output.totalTeams + ' teams');
