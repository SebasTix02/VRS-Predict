/**
 * parse-standings.js
 * 
 * Parses all live/*/standings_global_*.md files into a single JSON structure
 * for the dashboard to consume. Run with: node scripts/parse-standings.js
 * 
 * Output: dashboard/src/data/standings.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function extractDateFromFilename(filename) {
  const match = filename.match(/standings_global_(\d{4})_(\d{2})_(\d{2})\.md/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseStandingsFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const teams = [];

  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.startsWith('|') || line.includes(':- |') || line.includes('Standing')) continue;

    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 4) continue;

    const rank = parseInt(cols[0], 10);
    const points = parseInt(cols[1], 10);
    const teamName = cols[2];
    const roster = cols[3];

    if (isNaN(rank) || isNaN(points)) continue;

    teams.push({ rank, points, teamName, roster });
  }

  return teams;
}

function findAllStandingsFiles() {
  const liveDir = path.join(ROOT, 'live');
  const results = [];

  if (!fs.existsSync(liveDir)) {
    console.error('live/ directory not found');
    return results;
  }

  const years = fs.readdirSync(liveDir).filter(d =>
    fs.statSync(path.join(liveDir, d)).isDirectory()
  );

  for (const year of years) {
    const yearDir = path.join(liveDir, year);
    const files = fs.readdirSync(yearDir).filter(f =>
      f.startsWith('standings_global_') && f.endsWith('.md')
    );

    for (const file of files) {
      const date = extractDateFromFilename(file);
      if (date) {
        results.push({ date, filePath: path.join(yearDir, file) });
      }
    }
  }

  results.sort((a, b) => a.date.localeCompare(b.date));
  return results;
}

function main() {
  console.log('Parsing VRS standings files...\n');

  const standingsFiles = findAllStandingsFiles();
  console.log(`Found ${standingsFiles.length} global standings snapshots\n`);

  const snapshots = [];
  const teamIndex = {};

  for (const { date, filePath } of standingsFiles) {
    const teams = parseStandingsFile(filePath);
    console.log(`  ${date}: ${teams.length} teams`);

    snapshots.push({ date, teams });

    for (const team of teams) {
      if (!teamIndex[team.teamName]) {
        teamIndex[team.teamName] = {
          teamName: team.teamName,
          latestRoster: team.roster,
          history: [],
        };
      }
      teamIndex[team.teamName].history.push({
        date,
        rank: team.rank,
        points: team.points,
      });
      teamIndex[team.teamName].latestRoster = team.roster;
    }
  }

  const lastSnapshot = snapshots[snapshots.length - 1];
  const latestDate = lastSnapshot ? lastSnapshot.date : null;
  const teamList = Object.values(teamIndex).sort((a, b) => {
    const aLatest = a.history.find(h => h.date === latestDate);
    const bLatest = b.history.find(h => h.date === latestDate);
    if (!aLatest && !bLatest) return 0;
    if (!aLatest) return 1;
    if (!bLatest) return -1;
    return aLatest.rank - bLatest.rank;
  });

  const output = {
    generatedAt: new Date().toISOString(),
    snapshotDates: snapshots.map(s => s.date),
    totalSnapshots: snapshots.length,
    totalTeams: teamList.length,
    teams: teamList,
  };

  const outDir = path.join(ROOT, 'dashboard', 'src', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'standings.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\nGenerated ${outPath}`);
  console.log(`  ${output.totalSnapshots} snapshots, ${output.totalTeams} teams`);
}

main();
